# Server

On Windows, install deps and run server:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```
Local Dev
.\.venv\Scripts\activatepython 
-m uvicorn app:app --reload --host 0.0.0.0 --port 8000