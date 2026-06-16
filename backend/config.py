"""
config.py — Load and expose environment variables for the Flask backend.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SUPABASE_URL: str = os.environ["SUPABASE_URL"]
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    WHATSAPP_CHANNEL_LINK: str = os.environ["WHATSAPP_CHANNEL_LINK"]
    BASE_URL: str = os.environ["BASE_URL"]
    ALLOWED_ORIGIN: str = os.environ["ALLOWED_ORIGIN"]
