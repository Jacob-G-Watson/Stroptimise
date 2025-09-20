import sys
from pathlib import Path

# Ensure the server package directory is on sys.path when running tests.
# This file is only for tests and prevents ImportError: No module named 'services'
# when pytest is invoked from the repository root or other working directories.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
