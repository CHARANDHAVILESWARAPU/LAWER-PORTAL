from .settings import *
from datetime import timedelta
import os
import dj_database_url
from pathlib import Path
import django_heroku

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-super-secret-change-now')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS += [
    'whitenoise.runserver_nostatic',
]

MIDDLEWARE.insert(-1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Database
DATABASES['default'] = dj_database_url.config(
    default=os.environ.get('DATABASE_URL'),
    conn_max_age=600,
    conn_health_checks=True,
)

# CORS for production
CORS_ALLOWED_ORIGINS = [
    'https://lawyerportal.netlify.app',
    'https://*.netlify.app',
    'http://localhost:3000',
]

CORS_ALLOW_CREDENTIALS = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

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

# django_heroku.settings(locals())  # Not needed for Render
