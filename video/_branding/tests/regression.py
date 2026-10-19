#!/usr/bin/env python3
"""Regression check for existing videos (F8960 T9/T14): pipeline changes must not alter finished mobile videos.

Usage (from video/):
  .venv/bin/python _branding/tests/regression.py snapshot <slug> <lang>   # BEFORE a pipeline change
  .venv/bin/python _branding/tests/regression.py compare  <slug> <lang>   # AFTER  a pipeline change

Both run `build.sh <slug> <lang> --no-record` (TTS from cache, no recording, no network, no upload) and measure the
result: ffprobe of the mp4, layers.json geom, hash + 64x36 greyscale downsample of every base/bezel layer PNG,
SHA-256 of the SRT. The published out/ folder is backed up first and restored afterwards (it is never changed).
Baselines: _branding/tests/baseline/<slug>.<lang>.json (small, committed). Manual run, not part of the pre-push gate.
"""
import base64, hashlib, json, shutil, subprocess, sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]          # video/
BASELINE_DIR = Path(__file__).resolve().parent / "baseline"
MAX_LAYER_DIFF = 0.5        # mean absolute difference on a 0..255 scale (64x36 downsample)
MAX_DURATION_DIFF = 0.1     # seconds


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def probe(mp4):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height,r_frame_rate:format=duration", "-of", "json", str(mp4)])
    j = json.loads(out)
    num, den = j["streams"][0]["r_frame_rate"].split("/")
    return {"width": j["streams"][0]["width"], "height": j["streams"][0]["height"],
            "fps": round(int(num) / int(den), 3), "duration": round(float(j["format"]["duration"]), 3)}


def downsample(png):
    im = Image.open(png).convert("L").resize((64, 36), Image.BOX)
    return np.asarray(im, dtype=np.uint8)


def collect(slug, lang):
    cache = ROOT / slug / ".cache" / lang
    out = ROOT / slug / "out"
    layers = cache / "layers"
    res = {"slug": slug, "lang": lang,
           "video": probe(out / f"{slug}.{lang}.mp4"),
           "geom": json.loads((layers / "layers.json").read_text())["geom"],
           "srt_sha256": sha256(out / f"{slug}.{lang}.srt"),
           "layers": {}}
    for p in sorted(list(layers.glob("base-*.png")) + [layers / "bezel.png"]):
        res["layers"][p.name] = {"sha256": sha256(p), "thumb": base64.b64encode(downsample(p).tobytes()).decode()}
    return res


def rebuild_and_collect(slug, lang):
    """Rebuild without recording; keep the published out/ untouched (backup -> restore)."""
    out = ROOT / slug / "out"
    backup = ROOT / slug / ".cache" / lang / "regression" / "out-backup"
    shutil.rmtree(backup, ignore_errors=True); backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(out, backup)
    published = {"video": probe(out / f"{slug}.{lang}.mp4"), "srt_sha256": sha256(out / f"{slug}.{lang}.srt")}
    try:
        r = subprocess.run([str(ROOT / "build.sh"), slug, lang, "--no-record"], cwd=ROOT)
        if r.returncode:
            sys.exit(f"build.sh failed with exit {r.returncode}")
        res = collect(slug, lang)
    finally:
        shutil.rmtree(out, ignore_errors=True)
        shutil.copytree(backup, out)
        shutil.rmtree(backup, ignore_errors=True)
    res["published"] = published
    return res


def compare_results(base, now):
    """Pure comparison -> list of (check, ok, detail)."""
    rows = []
    rows.append(("resolution", (base["video"]["width"], base["video"]["height"]) == (now["video"]["width"], now["video"]["height"]),
                 f"{now['video']['width']}x{now['video']['height']} (baseline {base['video']['width']}x{base['video']['height']})"))
    d = abs(base["video"]["duration"] - now["video"]["duration"])
    rows.append(("duration", d <= MAX_DURATION_DIFF, f"{now['video']['duration']}s (baseline {base['video']['duration']}s, diff {d:.3f}s)"))
    rows.append(("fps", base["video"]["fps"] == now["video"]["fps"], f"{now['video']['fps']} (baseline {base['video']['fps']})"))
    rows.append(("geom", base["geom"] == now["geom"], f"{now['geom']} (baseline {base['geom']})"))
    rows.append(("srt", base["srt_sha256"] == now["srt_sha256"], "byte-identical" if base["srt_sha256"] == now["srt_sha256"] else "SRT differs"))
    rows.append(("layer set", sorted(base["layers"]) == sorted(now["layers"]), f"{len(now['layers'])} layers (baseline {len(base['layers'])})"))
    diffs = []
    identical = 0
    for name, b in base["layers"].items():
        n = now["layers"].get(name)
        if not n:
            continue
        if b["sha256"] == n["sha256"]:
            identical += 1
        a1 = np.frombuffer(base64.b64decode(b["thumb"]), dtype=np.uint8).astype(float)
        a2 = np.frombuffer(base64.b64decode(n["thumb"]), dtype=np.uint8).astype(float)
        diffs.append(float(np.abs(a1 - a2).mean()))
    worst = max(diffs) if diffs else 0.0
    rows.append(("layer pixels", bool(diffs) and worst < MAX_LAYER_DIFF,
                 f"{identical}/{len(diffs)} byte-identical, worst mean diff {worst:.3f}/255 (limit {MAX_LAYER_DIFF})"))
    return rows


def main(argv):
    if len(argv) != 4 or argv[1] not in ("snapshot", "compare"):
        sys.exit(__doc__)
    mode, slug, lang = argv[1:]
    BASELINE_DIR.mkdir(exist_ok=True)
    bf = BASELINE_DIR / f"{slug}.{lang}.json"
    if mode == "snapshot":
        res = rebuild_and_collect(slug, lang)
        bf.write_text(json.dumps(res, indent=1))
        print(f"baseline written: {bf} ({len(res['layers'])} layers, {res['video']['width']}x{res['video']['height']}, {res['video']['duration']}s)")
        return 0
    if not bf.exists():
        sys.exit(f"no baseline {bf}; run `snapshot` BEFORE changing the pipeline")
    rows = compare_results(json.loads(bf.read_text()), rebuild_and_collect(slug, lang))
    for check, ok, detail in rows:
        print(f"{'PASS' if ok else 'FAIL'}  {check:<13} {detail}")
    bad = [r for r in rows if not r[1]]
    print("RESULT:", "PASS" if not bad else f"FAIL ({len(bad)} checks)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
