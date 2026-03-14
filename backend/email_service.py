"""
Kryptos – Email service using Resend.

NOTE: To send emails to real addresses, you need to:
1. Verify your domain at https://resend.com/domains
2. Update the "from" address below to use your verified domain
3. Example: "Kryptos <noreply@your-verified-domain.com>"

For testing, Resend allows sending to: delivered@resend.dev, bounced@resend.dev, complained@resend.dev
"""

import os
from typing import Optional

try:
    import resend
except ImportError:
    resend = None

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

# IMPORTANT: Replace with your verified domain email after verifying at resend.com/domains
# For now, using test address format - needs domain verification for real emails
SENDER_EMAIL = os.getenv("EMAIL_FROM", "noreply@kryptos.xyz")


def init_resend():
    """Initialize Resend client."""
    if resend and RESEND_API_KEY:
        resend.api_key = RESEND_API_KEY


def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP verification email via Resend."""
    if not resend or not RESEND_API_KEY:
        print(f"[MOCK EMAIL] Sending OTP {otp} to {to_email}")
        return True

    try:
        init_resend()

        response = resend.Emails.send(
            {
                "from": f"Kryptos <{SENDER_EMAIL}>",
                "to": [to_email],
                "subject": "Verify your Kryptos account",
                "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; padding: 40px 20px;">
                <div style="max-width: 400px; margin: 0 auto; background-color: #0A0A0A; border: 1px solid #1A1A1A; border-radius: 12px; padding: 32px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-block; width: 48px; height: 48px; background-color: #ffffff; border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: bold; color: #000000;">K</div>
                        <h1 style="font-size: 20px; font-weight: 600; margin-top: 16px; color: #ffffff;">KRYPTOS</h1>
                    </div>
                    
                    <h2 style="font-size: 18px; font-weight: 600; color: #ffffff; margin: 0 0 8px 0;">Verify your email</h2>
                    <p style="font-size: 14px; color: #888888; margin: 0 0 24px 0;">Enter this code to verify your account:</p>
                    
                    <div style="background-color: #111111; border-radius: 8px; padding: 20px; text-align: center; letter-spacing: 8px; font-size: 32px; font-weight: 700; color: #00FF94; font-family: monospace;">
                        {otp}
                    </div>
                    
                    <p style="font-size: 12px; color: #666666; margin-top: 24px; text-align: center;">
                        This code expires in 5 minutes.<br>
                        If you didn't request this, please ignore this email.
                    </p>
                </div>
            </body>
            </html>
            """,
            }
        )
        print(f"OTP email sent to {to_email}: {response}")
        return True
    except Exception as e:
        print(f"Failed to send OTP email: {e}")
        return False


def send_welcome_email(to_email: str, name: Optional[str] = None) -> bool:
    """Send welcome email after account verification."""
    if not resend or not RESEND_API_KEY:
        print(f"[MOCK EMAIL] Welcome email to {to_email}")
        return True

    try:
        init_resend()

        response = resend.Emails.send(
            {
                "from": f"Kryptos <{SENDER_EMAIL}>",
                "to": [to_email],
                "subject": "Welcome to Kryptos - Blockchain Intelligence",
                "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; color: #ffffff; padding: 40px 20px;">
                <div style="max-width: 400px; margin: 0 auto; background-color: #0A0A0A; border: 1px solid #1A1A1A; border-radius: 12px; padding: 32px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="display: inline-block; width: 48px; height: 48px; background-color: #ffffff; border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: bold; color: #000000;">K</div>
                        <h1 style="font-size: 20px; font-weight: 600; margin-top: 16px; color: #ffffff;">KRYPTOS</h1>
                    </div>
                    
                    <h2 style="font-size: 18px; font-weight: 600; color: #00FF94; margin: 0 0 16px 0;">Welcome to Kryptos!</h2>
                    
                    <p style="font-size: 14px; color: #888888; margin: 0 0 16px 0;">
                        Your account has been verified. You can now access the full Kryptos platform.
                    </p>
                    
                    <p style="font-size: 14px; color: #888888; margin: 0 0 24px 0;">
                        Connect your wallet to unlock:
                    </p>
                    
                    <ul style="font-size: 14px; color: #ffffff; margin: 0 0 24px 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">Wallet risk analysis</li>
                        <li style="margin-bottom: 8px;">Transaction flow tracking</li>
                        <li style="margin-bottom: 8px;">Network visualization</li>
                        <li style="margin-bottom: 8px;">Watchlist with alerts</li>
                    </ul>
                    
                    <a href="https://kryptos.xyz/dashboard" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
                </div>
            </body>
            </html>
            """,
            }
        )
        print(f"Welcome email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
        return False
