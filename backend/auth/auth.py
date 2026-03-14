"""
Kryptos – Authentication helpers.
JWT creation/verification for email auth + wallet auth (SIWE).
Password hashing with bcrypt + OTP generation.
"""

import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
import bcrypt
from eth_account.messages import encode_defunct
from eth_account import Account
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# ── Config ───────────────────────────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
REFRESH_TOKEN_EXPIRY_DAYS = 7
OTP_EXPIRY_MINUTES = 5
MAX_OTP_ATTEMPTS = 3
OTP_COOLDOWN_MINUTES = 5

security = HTTPBearer(auto_error=False)


# ── Password Helpers (bcrypt) ──────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT helpers for email auth ───────────────────────────────────────────


def create_email_jwt(user_id: int, email: str) -> str:
    """Create a JWT for email-based authentication."""
    payload = {
        "sub": str(user_id),
        "email": email.lower(),
        "type": "email",
        "iat": int(time.time()),
        "exp": int(
            (datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)).timestamp()
        ),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_email_jwt(token: str) -> Optional[dict]:
    """Verify a JWT and return payload, or None if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "email":
            return None
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def create_refresh_token(user_id: int) -> str:
    """Create a long-lived refresh token."""
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": int(time.time()),
        "exp": int(
            (
                datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)
            ).timestamp()
        ),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_refresh_token(token: str) -> Optional[int]:
    """Verify refresh token and return user_id."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return int(payload.get("sub"))
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ── JWT helpers for wallet auth (existing) ───────────────────────────────


def create_wallet_jwt(wallet_address: str) -> str:
    """Create a JWT for wallet-based authentication."""
    payload = {
        "sub": wallet_address.lower(),
        "type": "wallet",
        "iat": int(time.time()),
        "exp": int(
            (datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)).timestamp()
        ),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_wallet_jwt(token: str) -> Optional[str]:
    """Verify a wallet JWT and return the wallet address."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "wallet":
            return None
        return payload.get("sub")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ── OTP helpers ───────────────────────────────────────────────────────────


def generate_otp() -> str:
    """Generate a 6-digit numeric OTP."""
    return "".join([str(secrets.randbelow(10)) for _ in range(6)])


def get_otp_expiry() -> datetime:
    """Get expiry time for OTP."""
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)


def is_otp_valid(otp: str, stored_otp: str, expiry: datetime) -> bool:
    """Check if OTP is valid and not expired."""
    if not stored_otp or not expiry:
        return False
    if datetime.now(timezone.utc) > expiry:
        return False
    return secrets.compare_digest(otp, stored_otp)


# ── SIWE signature verification (existing) ─────────────────────────────────


def verify_signature(message: str, signature: str) -> Optional[str]:
    """Verify an Ethereum personal_sign signature and return the recovered address."""
    try:
        encoded = encode_defunct(text=message)
        recovered = Account.recover_message(encoded, signature=signature)
        return recovered.lower()
    except Exception:
        return None


def build_siwe_message(address: str, nonce: str, domain: str = "localhost") -> str:
    """Build a human-readable Sign-In With Ethereum message."""
    issued_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return (
        f"{domain} wants you to sign in with your Ethereum account:\n"
        f"{address}\n\n"
        f"Sign in to Kryptos – Web3 Wallet Risk Analysis\n\n"
        f"URI: http://{domain}\n"
        f"Version: 1\n"
        f"Chain ID: 1\n"
        f"Nonce: {nonce}\n"
        f"Issued At: {issued_at}"
    )


# ── FastAPI dependencies ─────────────────────────────────────────────────


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """Require a valid JWT. Returns wallet address. Raises 401 if missing or invalid."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    wallet = verify_wallet_jwt(credentials.credentials)
    if wallet is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return wallet


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[str]:
    """Allow unauthenticated access. Returns wallet address or None."""
    if credentials is None:
        return None
    return verify_wallet_jwt(credentials.credentials)


async def get_email_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Require a valid email JWT. Returns payload dict. Raises 401 if invalid."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    payload = verify_email_jwt(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return payload


async def get_optional_email_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Allow unauthenticated access. Returns email JWT payload or None."""
    if credentials is None:
        return None
    return verify_email_jwt(credentials.credentials)
