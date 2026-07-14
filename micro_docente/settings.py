import os
from pathlib import Path


import sys

BASE_DIR = Path(__file__).resolve().parent.parent

app_env = os.environ.get("APP_ENV", "local")

if app_env == "local":
    env_local = BASE_DIR / ".env.local"
    if env_local.exists():
        with open(env_local, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    if key not in os.environ:
                        os.environ[key] = val

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "micro-docente-dev-secret-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "docentes",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "micro_docente.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "micro_docente.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "postgres"),
        "USER": os.environ.get("DB_USER", "postgres.bxqixhhgkcyojulbmhpp"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "402/42745aA"),
        "HOST": os.environ.get("DB_HOST", "aws-1-us-east-1.pooler.supabase.com"),
        "PORT": os.environ.get("DB_PORT", "5432"),
        "OPTIONS": {
            "options": f"-c search_path={os.environ.get('DB_SCHEMA', 'sga_docente')},public",
        },
    }
}

# Protecciones
db_host = DATABASES["default"]["HOST"]
if app_env == "local" and "supabase" in db_host.lower():
    print("ERROR: APP_ENV=local pero DB_HOST apunta a Supabase. Abortando.")
    sys.exit(1)
if app_env == "production" and "localhost" in db_host.lower():
    print("ERROR: APP_ENV=production pero DB_HOST apunta a localhost. Abortando.")
    sys.exit(1)

# Imprimir logs
print("\nDjango database:")
print(f"env={app_env}")
print(f"host={db_host}")
print(f"port={DATABASES['default']['PORT']}")
print(f"database={DATABASES['default']['NAME']}")
print(f"schema={os.environ.get('DB_SCHEMA', 'sga_docente')}\n")

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-ec"
TIME_ZONE = "America/Guayaquil"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
}
