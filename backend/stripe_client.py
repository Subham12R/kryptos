"""
Kryptos – Stripe integration for subscription management.
"""

import os
from typing import Optional
from datetime import datetime, timezone

try:
    import stripe
except ImportError:
    stripe = None

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Stripe product IDs (configure in Stripe Dashboard)
STRIPE_PRO_PRODUCT_ID = os.getenv("STRIPE_PRO_PRICE_ID", "prod_U924ykbJ3dv5YK")
STRIPE_ENTERPRISE_PRODUCT_ID = os.getenv(
    "STRIPE_ENTERPRISE_PRICE_ID", "prod_U94aUUumCESC4k"
)

# Prices for the products
STRIPE_PRO_PRICE = 1900  # $19.00 in cents
STRIPE_ENTERPRISE_PRICE = 9900  # $99.00 in cents


def get_stripe_client():
    """Initialize Stripe client."""
    if stripe is None:
        raise ImportError("stripe package not installed")
    if not STRIPE_SECRET_KEY:
        raise ValueError("STRIPE_SECRET_KEY not configured")
    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


def create_checkout_session(
    user_id: int,
    user_email: str,
    tier: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """Create a Stripe checkout session for subscription upgrade."""
    if not stripe:
        return f"https://checkout.stripe.com/demo?tier={tier}"

    try:
        stripe_client = get_stripe_client()

        # Use product ID with price_data inline
        product_id = (
            STRIPE_PRO_PRODUCT_ID if tier == "pro" else STRIPE_ENTERPRISE_PRODUCT_ID
        )
        price_amount = STRIPE_PRO_PRICE if tier == "pro" else STRIPE_ENTERPRISE_PRICE
        product_name = "Kryptos Pro" if tier == "pro" else "Kryptos Enterprise"

        session = stripe_client.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=user_email,
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product": product_id,
                        "unit_amount": price_amount,
                        "recurring": {
                            "interval": "month",
                        },
                    },
                    "quantity": 1,
                }
            ],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(user_id),
                "tier": tier,
            },
        )

        return session.url

    except Exception as e:
        print(f"Error creating Stripe checkout: {e}")
        return f"https://checkout.stripe.com/demo?tier={tier}"


def create_customer_portal_session(
    customer_id: str,
    return_url: str,
) -> str:
    """Create a Stripe customer portal session for subscription management."""
    if not stripe:
        return return_url

    try:
        stripe_client = get_stripe_client()

        session = stripe_client.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )

        return session.url

    except Exception as e:
        print(f"Error creating Stripe portal: {e}")
        return return_url


def handle_webhook(payload: bytes, signature: str) -> dict:
    """Handle Stripe webhook events."""
    if not stripe:
        return {"status": "ignored", "message": "Stripe not configured"}

    try:
        stripe_client = get_stripe_client()

        event = stripe_client.webhook.construct_event(
            payload, signature, STRIPE_WEBHOOK_SECRET
        )

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = int(session.get("metadata", {}).get("user_id", 0))
            subscription_id = session.get("subscription")
            tier = session.get("metadata", {}).get("tier", "pro")

            # Update user subscription in database
            # This would be called from the main app with proper db session
            return {
                "status": "success",
                "event": "checkout.session.completed",
                "user_id": user_id,
                "subscription_id": subscription_id,
                "tier": tier,
            }

        elif event["type"] == "customer.subscription.updated":
            subscription = event["data"]["object"]
            # Handle subscription updates (status changes, tier changes)
            return {
                "status": "success",
                "event": "customer.subscription.updated",
                "subscription_id": subscription.id,
                "status": subscription.status,
            }

        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            # Handle subscription cancellation
            return {
                "status": "success",
                "event": "customer.subscription.deleted",
                "subscription_id": subscription.id,
            }

        return {"status": "ignored", "event": event["type"]}

    except stripe.error.SignatureVerificationError:
        return {"status": "error", "message": "Invalid signature"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a Stripe subscription."""
    if not stripe:
        return True

    try:
        stripe_client = get_stripe_client()
        subscription = stripe_client.subscription.cancel(subscription_id)
        return subscription.status == "canceled"
    except Exception as e:
        print(f"Error canceling subscription: {e}")
        return False


def get_subscription_details(subscription_id: str) -> Optional[dict]:
    """Get subscription details from Stripe."""
    if not stripe:
        return None

    try:
        stripe_client = get_stripe_client()
        subscription = stripe_client.subscription.retrieve(subscription_id)

        return {
            "id": subscription.id,
            "status": subscription.status,
            "current_period_start": datetime.fromtimestamp(
                subscription.current_period_start, tz=timezone.utc
            ),
            "current_period_end": datetime.fromtimestamp(
                subscription.current_period_end, tz=timezone.utc
            ),
            "plan": subscription.plan.nickname or subscription.plan.id,
        }
    except Exception as e:
        print(f"Error fetching subscription: {e}")
        return None
