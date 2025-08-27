from cairosvg import svg2png, svg2pdf


def to_png(svg_str: str, out_path: str):
    svg2png(bytestring=svg_str.encode("utf-8"), write_to=out_path)


def to_pdf(svg_str: str, out_path: str):
    svg2pdf(bytestring=svg_str.encode("utf-8"), write_to=out_path)
