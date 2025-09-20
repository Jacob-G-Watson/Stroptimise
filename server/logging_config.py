"""Centralised logging configuration for the backend.

This module provides a single `configure_logging()` function that the
application should call early during startup (before other modules that may
log during import are imported). Behaviour is driven by environment
variables so no extra configuration is required for development.

Environment variables supported (all optional):
- LOG_LEVEL (default: INFO)
- LOG_FORMAT (default: "%(asctime)s %(levelname)s %(name)s: %(message)s")
- LOG_DATEFMT (default: "%Y-%m-%d %H:%M:%S")
- LOG_FILE (optional path to write logs; when set, a rotating file handler is used)
- LOG_MAX_BYTES (default: 10MB)
- LOG_BACKUP_COUNT (default: 5)
"""

from __future__ import annotations

import logging
import logging.handlers
import os
from typing import Optional


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def configure_logging() -> None:
    """Configure the root logger and a console (and optional file) handler.

    This function is idempotent and can be called multiple times (useful in
    tests or reload scenarios). It intentionally keeps behaviour conservative
    and driven by environment variables so it's safe in production and dev.
    """
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    fmt = os.getenv("LOG_FORMAT", "%(asctime)s %(levelname)s %(name)s: %(message)s")
    datefmt = os.getenv("LOG_DATEFMT", "%Y-%m-%d %H:%M:%S")

    # Build handlers
    console = logging.StreamHandler()
    console.setLevel(level)
    console.setFormatter(logging.Formatter(fmt, datefmt))

    handlers = [console]

    log_file = os.getenv("LOG_FILE")
    if log_file:
        max_bytes = _int_env("LOG_MAX_BYTES", 10 * 1024 * 1024)
        backup_count = _int_env("LOG_BACKUP_COUNT", 5)
        file_handler = logging.handlers.RotatingFileHandler(
            log_file, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(logging.Formatter(fmt, datefmt))
        handlers.append(file_handler)

    root = logging.getLogger()

    # Remove existing handlers to avoid duplicate logs in reload/test scenarios
    for h in list(root.handlers):
        try:
            root.removeHandler(h)
        except Exception:
            pass

    root.setLevel(level)
    for h in handlers:
        root.addHandler(h)

    # Encourage uvicorn to propagate to root logger so formatting is consistent
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.propagate = True

    # Provide a dedicated logger name used elsewhere in the codebase
    auth_logger = logging.getLogger("auth")
    auth_logger.setLevel(level)


__all__ = ["configure_logging"]
