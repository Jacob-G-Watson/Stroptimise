from fastapi import APIRouter

# Expose submodule routers for easy import
from . import cabinets, jobs, pieces, users, layout  # noqa: F401

router = APIRouter()
