from rectpack import newPacker, GuillotineBafSas, PackingMode

KERF_DEFAULT = 0


def pack(project, sheets, pieces):
    kerf = project.kerf_mm or KERF_DEFAULT
    packer = newPacker(
        mode=PackingMode.Offline,
        pack_algo=GuillotineBafSas,  # <-- use pack_algo instead of bin_algo
        rotation=project.allow_rotation,
    )
    for s in sheets:
        packer.add_bin(s.width - kerf, s.height - kerf, count=1)
    for p in pieces:
        for _ in range(p.quantity):
            w = max(1, p.width + kerf)
            h = max(1, p.height + kerf)
            packer.add_rect(w, h, rid=p.id)
    packer.pack()
    placements = []
    for bi, abin in enumerate(packer):
        for rect in abin:
            x, y, w, h, rid = rect.x, rect.y, rect.width, rect.height, rect.rid
            rotated = False
            fw, fh = max(1, w - kerf), max(1, h - kerf)
            placements.append(
                {
                    "bin_index": bi,
                    "piece_id": rid,
                    "x": x,
                    "y": y,
                    "w": fw,
                    "h": fh,
                    "rotated": rotated,
                }
            )
    return placements
