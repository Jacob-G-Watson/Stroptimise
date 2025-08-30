# Server

## Polygon pieces

You can add complex pieces by sending a "polygon" field when creating a piece:

POST /api/cabinets/{cabinet_id}/pieces
{
	"name": "L-shape A",
	"polygon": [[0,0],[300,0],[300,50],[50,50],[50,200],[0,200]]
}

Width/height are optional for polygons; they will be derived from the polygon's bounding box for compatibility. The layout endpoint will nest polygons when Shapely and Pyclipper are installed; otherwise, it falls back to rectangle bounding boxes.

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