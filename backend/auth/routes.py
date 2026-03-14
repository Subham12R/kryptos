"""
Kryptos – Auth API routes.
Handles email/password auth with OTP verification + wallet linking + subscriptions.
"""

import secrets
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from email_validator import validate_email, EmailNotValidError

try:
    from backend.db.models import (
        get_db,
        User,
        LinkedWallet,
        PremiumTier,
        SubscriptionStatus,
    )
    from backend.auth.auth import (
        hash_password,
        verify_password,
        create_email_jwt,
        verify_email_jwt,
        create_refresh_token,
        verify_refresh_token,
        create_wallet_jwt,
        verify_signature,
        build_siwe_message,
        generate_otp,
        get_otp_expiry,
        is_otp_valid,
        get_email_user,
        get_current_user,
        OTP_EXPIRY_MINUTES,
        MAX_OTP_ATTEMPTS,
        OTP_COOLDOWN_MINUTES,
    )
    from backend.email_service import send_otp_email, send_welcome_email
    from backend.stripe_client import create_checkout_session
except ModuleNotFoundError:
    try:
        from db.models import (
            get_db,
            User,
            LinkedWallet,
            PremiumTier,
            SubscriptionStatus,
        )
        from auth.auth import (
            hash_password,
            verify_password,
            create_email_jwt,
            verify_email_jwt,
            create_refresh_token,
            verify_refresh_token,
            create_wallet_jwt,
            verify_signature,
            build_siwe_message,
            generate_otp,
            get_otp_expiry,
            is_otp_valid,
            get_email_user,
            get_current_user,
            OTP_EXPIRY_MINUTES,
            MAX_OTP_ATTEMPTS,
            OTP_COOLDOWN_MINUTES,
        )
        from email_service import send_otp_email, send_welcome_email
        from stripe_client import create_checkout_session
    except ModuleNotFoundError:
        from db.models import (
            get_db,
            User,
            LinkedWallet,
            PremiumTier,
            SubscriptionStatus,
        )
        from auth.auth import (
            hash_password,
            verify_password,
            create_email_jwt,
            verify_email_jwt,
            create_refresh_token,
            verify_refresh_token,
            create_wallet_jwt,
            verify_signature,
            build_siwe_message,
            generate_otp,
            get_otp_expiry,
            is_otp_valid,
            get_email_user,
            get_current_user,
            OTP_EXPIRY_MINUTES,
            MAX_OTP_ATTEMPTS,
            OTP_COOLDOWN_MINUTES,
        )
        from email_service import send_otp_email, send_welcome_email

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Pydantic Schemas ───────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    message: str
    user_id: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    refresh_token: str
    user_id: int
    email: str
    is_email_verified: bool
    avatar_url: Optional[str] = None
    display_name: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    otp: str


class VerifyEmailResponse(BaseModel):
    token: str
    refresh_token: str
    user_id: int
    email: str


class ResendOtpResponse(BaseModel):
    message: str


class LinkWalletRequest(BaseModel):
    wallet_address: str
    signature: str
    message: str


class LinkWalletResponse(BaseModel):
    message: str
    wallet_address: str
    has_full_access: bool


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    token: str
    refresh_token: str


class SubscriptionResponse(BaseModel):
    tier: str
    status: str
    subscription_start: Optional[str]
    subscription_end: Optional[str]
    features: dict


class UpgradeRequest(BaseModel):
    tier: str  # "pro" or "enterprise"


class UpgradeResponse(BaseModel):
    checkout_url: str


class CancelResponse(BaseModel):
    message: str


class UserProfileResponse(BaseModel):
    id: int
    email: str
    is_email_verified: bool
    premium_tier: str
    subscription_status: str
    linked_wallets: list
    created_at: str
    avatar_url: Optional[str] = None
    display_name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Helper Functions ───────────────────────────────────────────────────────


def get_user_features(tier: PremiumTier) -> dict:
    """Return feature flags based on tier."""
    features = {
        "free": {
            "scans_per_day": 5,
            "chains": 1,
            "pdf_reports": False,
            "api_access": False,
            "watchlist_limit": 5,
            "bulk_scan": False,
        },
        "pro": {
            "scans_per_day": "unlimited",
            "chains": 14,
            "pdf_reports": True,
            "api_access": False,
            "watchlist_limit": 20,
            "bulk_scan": 10,
        },
        "enterprise": {
            "scans_per_day": "unlimited",
            "chains": 14,
            "pdf_reports": True,
            "api_access": True,
            "watchlist_limit": "unlimited",
            "bulk_scan": 50,
        },
    }
    return features.get(tier.value, features["free"])


# ── Routes ─────────────────────────────────────────────────────────────────


@router.post("/register", response_model=RegisterResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register new user with email/password. Sends OTP to verify email."""
    email = body.email.lower().strip()

    # Validate password strength
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    # Check if user exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if existing.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        # User exists but not verified - resend OTP
        existing.otp_code = generate_otp()
        existing.otp_expiry = get_otp_expiry()
        existing.otp_attempts = 0
        db.commit()
        return RegisterResponse(message="OTP resent to email", user_id=existing.id)

    # Create new user
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        is_email_verified=True,  # Auto-verify for testing (skip OTP)
        premium_tier=PremiumTier.FREE,
        subscription_status=SubscriptionStatus.EXPIRED,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Skip OTP email for now - auto-verified
    # send_otp_email(user.email, user.otp_code)

    return RegisterResponse(
        message="OTP sent to email for verification", user_id=user.id
    )


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Login with email/password."""
    email = body.email.lower().strip()

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Skip email verification check for now - users are auto-verified
    # if not user.is_email_verified:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Email not verified. OTP sent to your email.",
    #     )

    # Create tokens
    token = create_email_jwt(user.id, user.email)
    refresh_token = create_refresh_token(user.id)

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    return LoginResponse(
        token=token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        is_email_verified=user.is_email_verified,
        avatar_url=user.avatar_url,
        display_name=user.display_name,
    )


@router.post("/verify-email", response_model=VerifyEmailResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email with OTP. Activates account."""
    # Get user from token in Authorization header
    # For this endpoint, we need to find user by OTP
    # Since we don't have token yet, we'll search by OTP

    user = (
        db.query(User)
        .filter(User.otp_code == body.otp, User.otp_expiry > datetime.now(timezone.utc))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    # Verify OTP
    if not is_otp_valid(body.otp, user.otp_code, user.otp_expiry):
        user.otp_attempts += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    # Activate account
    user.is_email_verified = True
    user.otp_code = None
    user.otp_expiry = None
    user.otp_attempts = 0
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    send_welcome_email(user.email, user.display_name)

    # Create tokens
    token = create_email_jwt(user.id, user.email)
    refresh_token = create_refresh_token(user.id)

    return VerifyEmailResponse(
        token=token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
    )


@router.post("/resend-otp", response_model=ResendOtpResponse)
def resend_otp(body: RegisterRequest, db: Session = Depends(get_db)):
    """Resend OTP to email."""
    email = body.email.lower().strip()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered",
        )

    if user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified",
        )

    # Check rate limiting
    if user.otp_attempts >= MAX_OTP_ATTEMPTS:
        # Check if still in cooldown
        if user.otp_expiry and user.otp_expiry > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many attempts. Try again in {OTP_COOLDOWN_MINUTES} minutes.",
            )
        # Reset attempts after cooldown
        user.otp_attempts = 0

    # Generate new OTP
    user.otp_code = generate_otp()
    user.otp_expiry = get_otp_expiry()
    user.otp_attempts += 1
    db.commit()

    send_otp_email(user.email, user.otp_code)

    return ResendOtpResponse(message="OTP sent to email")


@router.post("/refresh", response_model=RefreshResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    user_id = verify_refresh_token(body.refresh_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    token = create_email_jwt(user.id, user.email)
    new_refresh_token = create_refresh_token(user.id)

    return RefreshResponse(
        token=token,
        refresh_token=new_refresh_token,
    )


@router.post("/link-wallet", response_model=LinkWalletResponse)
def link_wallet(
    body: LinkWalletRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Link a wallet address to the email account."""
    user_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    wallet_address = body.wallet_address.lower().strip()

    # Verify signature
    recovered = verify_signature(body.message, body.signature)
    if recovered != wallet_address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature verification failed",
        )

    # Check if wallet already linked to another user
    existing_link = (
        db.query(LinkedWallet)
        .filter(LinkedWallet.wallet_address == wallet_address)
        .first()
    )

    if existing_link and existing_link.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wallet already linked to another account",
        )

    # Check if already linked to this user
    existing_user_link = (
        db.query(LinkedWallet)
        .filter(
            LinkedWallet.wallet_address == wallet_address,
            LinkedWallet.user_id == user_id,
        )
        .first()
    )

    if existing_user_link:
        return LinkWalletResponse(
            message="Wallet already linked",
            wallet_address=wallet_address,
            has_full_access=user.is_email_verified and user.linked_wallets,
        )

    # Create linked wallet
    is_primary = len(user.linked_wallets) == 0
    linked_wallet = LinkedWallet(
        user_id=user_id,
        wallet_address=wallet_address,
        nonce=secrets.token_hex(16),
        is_primary=is_primary,
    )
    db.add(linked_wallet)
    db.commit()

    has_full_access = user.is_email_verified and len(user.linked_wallets) > 0

    return LinkWalletResponse(
        message="Wallet linked successfully",
        wallet_address=wallet_address,
        has_full_access=has_full_access,
    )


@router.get("/subscription", response_model=SubscriptionResponse)
def get_subscription(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Get user's subscription details."""
    user_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return SubscriptionResponse(
        tier=user.premium_tier.value,
        status=user.subscription_status.value,
        subscription_start=user.subscription_start.isoformat()
        if user.subscription_start
        else None,
        subscription_end=user.subscription_end.isoformat()
        if user.subscription_end
        else None,
        features=get_user_features(user.premium_tier),
    )


@router.post("/upgrade", response_model=UpgradeResponse)
def upgrade_subscription(
    body: UpgradeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Create Stripe checkout session for upgrading subscription."""
    import os

    user_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Validate tier
    try:
        tier = PremiumTier(body.tier)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tier. Must be 'pro' or 'enterprise'",
        )

    # Get frontend URL from environment or use default
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    success_url = f"{frontend_url}/profile?success=true&tier={body.tier}"
    cancel_url = f"{frontend_url}/pricing?cancelled=true"

    try:
        checkout_url = create_checkout_session(
            user_id=user.id,
            user_email=user.email,
            tier=body.tier,
            success_url=success_url,
            cancel_url=cancel_url,
        )
        if not checkout_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create checkout session - no URL returned",
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating Stripe checkout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}",
        )

    return UpgradeResponse(checkout_url=checkout_url)


# ── Debug/Admin Endpoints ───────────────────────────────────────────────────────


class DebugUpgradeRequest(BaseModel):
    email: EmailStr
    tier: str = "pro"


@router.post("/debug/upgrade")
def debug_upgrade_user(
    db: Session = Depends(get_db),
    body: DebugUpgradeRequest = None,
):
    """Debug endpoint to manually upgrade a user's tier."""
    if not body:
        raise HTTPException(status_code=400, detail="Missing request body")

    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        tier = PremiumTier(body.tier.lower())
    except ValueError:
        tier = PremiumTier.PRO

    user.premium_tier = tier
    user.subscription_status = SubscriptionStatus.ACTIVE
    db.commit()

    return {
        "status": "success",
        "message": f"User {user.email} upgraded to {tier.value}",
    }


@router.post("/cancel", response_model=CancelResponse)
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Cancel current subscription."""
    user_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if user.subscription_status != SubscriptionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel",
        )

    # TODO: Cancel Stripe subscription

    user.subscription_status = SubscriptionStatus.CANCELLED
    user.premium_tier = PremiumTier.FREE
    db.commit()

    return CancelResponse(message="Subscription cancelled successfully")


class WebhookSubscriptionRequest(BaseModel):
    user_id: int
    tier: str
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None


@router.post("/webhook/subscription")
def handle_subscription_webhook(
    db: Session = Depends(get_db),
    body: WebhookSubscriptionRequest = None,
):
    """Handle subscription updates from Stripe webhook."""
    print(f"Webhook received: {body}")

    if not body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Missing request body"
        )

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    print(f"Updating user {user.id} ({user.email}) to tier: {body.tier}")

    try:
        tier = PremiumTier(body.tier.lower())
    except ValueError:
        print(f"Invalid tier: {body.tier}, defaulting to pro")
        tier = PremiumTier.PRO

    user.premium_tier = tier
    user.subscription_status = SubscriptionStatus.ACTIVE

    if body.stripe_customer_id:
        user.stripe_customer_id = body.stripe_customer_id
    if body.stripe_subscription_id:
        user.stripe_subscription_id = body.stripe_subscription_id

    db.commit()

    print(f"✅ User {user.id} upgraded to {tier.value}")

    return {"status": "success", "message": f"Subscription updated to {body.tier}"}


@router.get("/me", response_model=UserProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Get current user's profile."""
    user_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    linked_wallets = [
        {
            "address": w.wallet_address,
            "is_primary": w.is_primary,
            "created_at": w.created_at.isoformat(),
            "last_used": w.last_used.isoformat() if w.last_used else None,
        }
        for w in user.linked_wallets
    ]

    return UserProfileResponse(
        id=user.id,
        email=user.email,
        is_email_verified=user.is_email_verified,
        premium_tier=user.premium_tier.value,
        subscription_status=user.subscription_status.value,
        linked_wallets=linked_wallets,
        created_at=user.created_at.isoformat() if user.created_at else "",
        avatar_url=user.avatar_url,
        display_name=user.display_name,
    )


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Change user password."""
    user_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password set. Use wallet auth.",
        )

    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters",
        )

    user.password_hash = hash_password(body.new_password)
    db.commit()

    return {"message": "Password changed successfully"}


# ── Wallet-only routes (existing, adapted) ──────────────────────────────────


class WalletNonceResponse(BaseModel):
    nonce: str
    message: str


@router.post("/wallet/nonce")
def wallet_nonce(body: dict, db: Session = Depends(get_db)):
    """Get nonce for wallet signing."""
    wallet_address = body.get("address", "").lower().strip()

    if not wallet_address.startswith("0x") or len(wallet_address) != 42:
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")

    # Find or create linked wallet
    linked_wallet = (
        db.query(LinkedWallet)
        .filter(LinkedWallet.wallet_address == wallet_address)
        .first()
    )

    if not linked_wallet:
        # Check if there's a user with this wallet
        nonce = secrets.token_hex(16)
        message = build_siwe_message(wallet_address, nonce)
        return WalletNonceResponse(nonce=nonce, message=message)

    linked_wallet.nonce = secrets.token_hex(16)
    db.commit()

    message = build_siwe_message(wallet_address, linked_wallet.nonce)
    return WalletNonceResponse(nonce=linked_wallet.nonce, message=message)


class WalletVerifyResponse(BaseModel):
    token: str
    wallet_address: str
    has_full_access: bool


@router.post("/wallet/verify", response_model=WalletVerifyResponse)
def wallet_verify(body: dict, db: Session = Depends(get_db)):
    """Verify wallet signature and return JWT."""
    wallet_address = body.get("address", "").lower().strip()
    signature = body.get("signature", "")
    message = body.get("message", "")

    # Verify signature
    recovered = verify_signature(message, signature)
    if recovered != wallet_address:
        raise HTTPException(status_code=401, detail="Signature verification failed")

    # Find linked wallet
    linked_wallet = (
        db.query(LinkedWallet)
        .filter(LinkedWallet.wallet_address == wallet_address)
        .first()
    )

    if not linked_wallet:
        raise HTTPException(status_code=401, detail="Wallet not linked to any account")

    # Verify nonce
    if not linked_wallet.nonce or linked_wallet.nonce not in message:
        raise HTTPException(status_code=401, detail="Invalid nonce")

    # Update last used
    linked_wallet.last_used = datetime.now(timezone.utc)
    linked_wallet.nonce = secrets.token_hex(16)
    db.commit()

    token = create_wallet_jwt(wallet_address)
    user = linked_wallet.user
    has_full_access = user.is_email_verified if user else False

    return WalletVerifyResponse(
        token=token,
        wallet_address=wallet_address,
        has_full_access=has_full_access,
    )


class UpdateProfileRequest(BaseModel):
    avatar_url: Optional[str] = None
    display_name: Optional[str] = None


class UpdateProfileResponse(BaseModel):
    message: str
    avatar_url: Optional[str]
    display_name: Optional[str]


@router.post("/update-profile", response_model=UpdateProfileResponse)
def update_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Update user profile (avatar, display name)."""
    user_id = int(current_user["sub"])
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url

    if body.display_name is not None:
        user.display_name = body.display_name

    db.commit()
    db.refresh(user)

    return UpdateProfileResponse(
        message="Profile updated successfully",
        avatar_url=user.avatar_url,
        display_name=user.display_name,
    )


# ── Wallet Management Endpoints ─────────────────────────────────────────────────


class CheckWalletLinkResponse(BaseModel):
    address: str
    is_linked: bool


@router.get("/wallet/check/{address}", response_model=CheckWalletLinkResponse)
def check_wallet_linked(
    address: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Check if a wallet address is linked to the current user's account."""
    user_id = int(current_user["sub"])
    wallet_address = address.lower()

    # Check if wallet is linked to this user
    linked_wallet = (
        db.query(LinkedWallet)
        .filter(
            LinkedWallet.wallet_address == wallet_address,
            LinkedWallet.user_id == user_id,
        )
        .first()
    )

    return CheckWalletLinkResponse(
        address=wallet_address,
        is_linked=linked_wallet is not None,
    )


class LinkedWalletResponse(BaseModel):
    address: str
    is_primary: bool
    created_at: str
    last_used: Optional[str]


@router.get("/wallets", response_model=list[LinkedWalletResponse])
def get_linked_wallets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Get all wallets linked to the current user's account."""
    user_id = int(current_user["sub"])

    wallets = db.query(LinkedWallet).filter(LinkedWallet.user_id == user_id).all()

    return [
        LinkedWalletResponse(
            address=w.wallet_address,
            is_primary=w.is_primary,
            created_at=w.created_at.isoformat() if w.created_at else "",
            last_used=w.last_used.isoformat() if w.last_used else None,
        )
        for w in wallets
    ]


@router.delete("/wallets/{address}")
def unlink_wallet(
    address: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_email_user),
):
    """Unlink a wallet from the current user's account."""
    user_id = int(current_user["sub"])
    wallet_address = address.lower()

    wallet = (
        db.query(LinkedWallet)
        .filter(
            LinkedWallet.wallet_address == wallet_address,
            LinkedWallet.user_id == user_id,
        )
        .first()
    )

    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    db.delete(wallet)
    db.commit()

    return {"message": "Wallet unlinked successfully"}
