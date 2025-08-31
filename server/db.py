from sqlmodel import create_engine

# Single engine used across the app (matches original app.py)
engine = create_engine(
    "sqlite:///db.sqlite3", connect_args={"check_same_thread": False}
)
