from typing import List, Dict, Any
import io
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color
from math import atan2, degrees, sqrt


def _mm_to_pt(mm: float) -> float:
    # 1 inch = 25.4 mm; 1 pt = 1/72 inch
    return float(mm) * 72.0 / 25.4


def _hex_to_color(hex_color: str) -> Color:
    h = hex_color.lstrip("#")
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return Color(r, g, b)


def sheets_to_pdf_bytes(sheets: List[Dict[str, Any]], title: str = "Layout") -> bytes:
    """Render sheets to a multi-page PDF using reportlab (pip-only, no OS deps)."""
    buf = io.BytesIO()
    # Initialize with an arbitrary page size; we'll set per page
    first_w = _mm_to_pt(sheets[0]["width"]) if sheets else _mm_to_pt(210)
    first_h = _mm_to_pt(sheets[0]["height"]) if sheets else _mm_to_pt(297)
    c = canvas.Canvas(buf, pagesize=(first_w, first_h))
    c.setTitle(title)

    def draw_page(sheet: Dict[str, Any]):
        pw = _mm_to_pt(sheet["width"])
        ph = _mm_to_pt(sheet["height"])
        c.setPageSize((pw, ph))

        # White background
        c.saveState()
        c.setFillColor(_hex_to_color("#FFFFFF"))
        c.rect(0, 0, pw, ph, fill=1, stroke=0)
        c.restoreState()

        # Establish mm coordinate system (Y up). We'll convert Y from top-origin inputs.
        c.saveState()
        scale = 72.0 / 25.4
        c.scale(scale, scale)

        # Border (in mm units; origin bottom-left)
        c.setLineWidth(0.3)
        c.setStrokeColor(_hex_to_color("#111111"))
        c.rect(0.5, 0.5, sheet["width"] - 1.0, sheet["height"] - 1.0, fill=0, stroke=1)

        # Polygons
        for pg in sheet.get("polygons", []) or []:
            pts = pg.get("points") or []
            if len(pts) < 3:
                continue
            # fill
            c.setFillColor(_hex_to_color("#FFE8CC"))
            c.setStrokeColor(_hex_to_color("#9A3412"))
            c.setLineWidth(0.25)
            path = c.beginPath()
            # Convert y from top-origin to bottom-origin: y' = H - y
            H = float(sheet["height"])
            x0, y0 = pts[0]
            path.moveTo(x0, H - y0)
            for x, y in pts[1:]:
                path.lineTo(x, H - y)
            path.close()
            c.drawPath(path, stroke=1, fill=1)

            # label via bbox center
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            minx, maxx = min(xs), max(xs)
            miny, maxy = min(ys), max(ys)
            cx = (minx + maxx) / 2.0
            cy_top = (miny + maxy) / 2.0
            cy = H - cy_top
            bw = max(1.0, maxx - minx)
            bh = max(1.0, maxy - miny)
            font_size = max(
                2.8, min(min(bw, bh) * 0.25, 17)
            )  # in mm due to current scale
            c.setFillColor(_hex_to_color("#0F172A"))
            c.setFont("Helvetica", font_size)
            label = str(pg.get("name") or "")
            # Rough centering; textWidth is in current coords (mm) because of transform
            tw = c.stringWidth(label, "Helvetica", font_size)
            c.drawString(cx - tw / 2.0, cy - font_size / 3.0, label)

            # Edge measurements for polygon (offset toward centroid)
            dim_font = font_size
            for i in range(len(pts)):
                x0, y0 = pts[i]
                x1, y1 = pts[(i + 1) % len(pts)]
                # Convert to bottom-origin
                bx0, by0 = x0, H - y0
                bx1, by1 = x1, H - y1
                # Midpoint
                mx = (bx0 + bx1) / 2.0
                my = (by0 + by1) / 2.0
                # length in mm (use original points since length is invariant)
                L = sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
                # orientation angle
                ang = degrees(atan2(by1 - by0, bx1 - bx0))
                # offset toward polygon centroid
                vx = cx - mx
                vy = cy - my
                vl = sqrt(vx * vx + vy * vy) or 1.0
                off = max(3.0, min(8.0, dim_font * 0.8))
                nx = (vx / vl) * off
                ny = (vy / vl) * off
                c.saveState()
                c.translate(mx + nx, my + ny)
                c.rotate(ang)
                c.setFillColor(_hex_to_color("#0F172A"))
                c.setFont("Helvetica", dim_font)
                c.drawCentredString(0, -dim_font * 0.35, f"{int(round(L))} mm")
                c.restoreState()

        # Rects (exclude ones that correspond to polygons)
        poly_ids = {p.get("piece_id") for p in (sheet.get("polygons") or [])}
        for r in sheet.get("rects", []) or []:
            if r.get("piece_id") in poly_ids:
                continue
            x, y, w, h = r["x"], r["y"], r["w"], r["h"]
            # Convert rect top-left y to bottom-left y
            H = float(sheet["height"])
            y_bl = H - y - h
            c.setFillColor(_hex_to_color("#CFE8FF"))
            c.setStrokeColor(_hex_to_color("#1E40AF"))
            c.setLineWidth(0.25)
            c.rect(x, y_bl, w, h, fill=1, stroke=1)

            # labels
            label = str(r.get("name") or "")
            r_small = max(1.0, min(w, h))
            label_size = max(2.5, min(round(r_small * 0.12, 2), 7.0))
            info_size = max(2.0, round(label_size * 0.85, 2))
            c.setFillColor(_hex_to_color("#0F172A"))
            c.setFont("Helvetica", label_size)
            c.drawString(x + 1.5, y_bl + 1.5 + label_size, label)
            # dims
            c.setFillColor(_hex_to_color("#334155"))
            c.setFont("Helvetica", info_size)
            c.drawString(x + 1.5, y_bl + 1.5, f"{int(w)}×{int(h)}")

            # Edge measurements for rectangle: top, bottom (w), left, right (h)
            dim_font = label_size
            # Inside margins
            m = max(2.0, label_size * 0.5)
            # Top edge (centered inside near top)
            tx = x + w / 2.0
            ty = y_bl + h - m
            c.saveState()
            c.setFillColor(_hex_to_color("#0F172A"))
            c.setFont("Helvetica", dim_font)
            c.drawCentredString(tx, ty, f"{int(round(w))} mm")
            c.restoreState()
            # Bottom edge (centered inside near bottom)
            bx = x + w / 2.0
            by = y_bl + m
            c.saveState()
            c.setFillColor(_hex_to_color("#0F172A"))
            c.setFont("Helvetica", dim_font)
            c.drawCentredString(bx, by, f"{int(round(w))} mm")
            c.restoreState()
            # Left edge (rotated -90, inside)
            lx = x + m
            ly = y_bl + h / 2.0
            c.saveState()
            c.translate(lx, ly)
            c.rotate(-90)
            c.setFillColor(_hex_to_color("#0F172A"))
            c.setFont("Helvetica", dim_font)
            c.drawCentredString(0, -dim_font * 0.35, f"{int(round(h))} mm")
            c.restoreState()
            # Right edge (rotated -90, inside)
            rx = x + w - m
            ry = y_bl + h / 2.0
            c.saveState()
            c.translate(rx, ry)
            c.rotate(-90)
            c.setFillColor(_hex_to_color("#0F172A"))
            c.setFont("Helvetica", dim_font)
            c.drawCentredString(0, -dim_font * 0.35, f"{int(round(h))} mm")
            c.restoreState()

        c.restoreState()
        c.showPage()

    for sh in sheets or []:
        draw_page(sh)

    c.save()
    return buf.getvalue()
