"""
Kryptos – Database models (SQLAlchemy).
Uses PostgreSQL (Neon) database.
"""

import os
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    create_engine,
    UniqueConstraint,
    Enum,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

connect_args = {"connect_timeout": 10}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class PremiumTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    TRIAL = "trial"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


# ── Models ───────────────────────────────────────────────────────────────────


class User(Base):
    """Primary user table - supports email/password and wallet auth."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    is_email_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Profile fields
    display_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # Subscription fields
    premium_tier = Column(Enum(PremiumTier), default=PremiumTier.FREE)
    subscription_status = Column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.EXPIRED
    )
    stripe_customer_id = Column(String(64), nullable=True)
    stripe_subscription_id = Column(String(64), nullable=True)
    subscription_start = Column(DateTime, nullable=True)
    subscription_end = Column(DateTime, nullable=True)

    # OTP fields
    otp_code = Column(String(6), nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    otp_attempts = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    linked_wallets = relationship(
        "LinkedWallet", back_populates="user", cascade="all, delete-orphan"
    )
    watchlist = relationship(
        "WatchlistItem", back_populates="owner", cascade="all, delete-orphan"
    )


class LinkedWallet(Base):
    """Multiple wallets linked to a single user account."""

    __tablename__ = "linked_wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wallet_address = Column(String(42), unique=True, nullable=False, index=True)
    nonce = Column(String(64), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_used = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="linked_wallets")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    address = Column(String(42), nullable=False)
    label = Column(String(128), default="")
    chain_id = Column(Integer, default=1)
    chain_name = Column(String(64), default="Ethereum")
    alert_threshold = Column(Integer, default=70)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Cached score data
    risk_score = Column(Float, nullable=True)
    risk_label = Column(String(32), nullable=True)
    prev_score = Column(Float, nullable=True)
    flags = Column(Text, default="[]")
    balance = Column(String(64), nullable=True)
    ens_name = Column(String(128), nullable=True)
    tx_count = Column(Integer, nullable=True)
    last_checked = Column(DateTime, nullable=True)
    is_sanctioned = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("user_id", "address", "chain_id", name="uq_user_addr_chain"),
    )

    owner = relationship("User", back_populates="watchlist")


class SharedReport(Base):
    """Cached analysis results for shareable report links."""

    __tablename__ = "shared_reports"

    id = Column(String(12), primary_key=True, index=True)
    address = Column(String(42), nullable=False, index=True)
    chain_id = Column(Integer, default=1)
    chain_name = Column(String(64), default="Ethereum")
    risk_score = Column(Float, nullable=False)
    risk_label = Column(String(32), nullable=False)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    views = Column(Integer, default=0)


# ── Helpers ──────────────────────────────────────────────────────────────────


def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency – yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
