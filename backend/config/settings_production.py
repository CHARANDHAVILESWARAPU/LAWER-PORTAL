from .settings import *
from datetime import timedelta
import os
import dj_database_url
from pathlib import Path

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-super-secret-change-now')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['*']

# Database
DATABASES['default'] = dj_database_url.config(
    default=os.environ.get('DATABASE_URL'),
    conn_max_age=600,
    conn_health_checks=True,
)

# CORS for production (Exact URL, no wildcards)
CORS_ALLOWED_ORIGINS = [
    'https://lawyer-portal-system.netlify.app',
    'http://localhost:5173', # Useful if you want to test local frontend against prod backend
]

CORS_ALLOW_CREDENTIALS = True

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# OpenAI
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'sk-temp-placeholder')

# Simplified JWT for prod
SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] = timedelta(minutes=30)
SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'] = timedelta(days=1)