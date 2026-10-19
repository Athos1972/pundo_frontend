#!/usr/bin/env python3
"""Output check for desktop videos (F8960 T13) - the effect indicator against "green but empty".

Usage: verify_output.py <slug> <lang>      (build.sh runs it for meta.format == desktop; manual use for any video)
Checks out/<slug>.<lang>.mp4 (resolution/fps/audio/duration), every SRT (parsable, >= 1 cue, monotonic, no overlap),
cues per narrated scene (spoken language AND every subtitle language), frames per scene, actual <= planned + 3 s,
chapters >= 10 s. Prints the chapter list (paste into the YouTube description). Exit code != 0 on any error.
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIN_CHAPTER_S = 10.0
OVERRUN_S = 3.0
SRT_TIME = re.compile(r"(\d+):(\d\d):(\d\d),(\d{3}) --> (\d+):(\d\d):(\d\d),(\d{3})")


def _sec(h, m, s, ms):
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def parse_srt(text):
    """-> (cues [{start,end,text}], errors). Blocks: index, time line, >= 1 text line, blank line."""
    cues, errors = [], []
    blocks = [b for b in re.split(r"\n\s*\n", text.strip("\n")) if b.strip()] if text.strip() else []
    for n, block in enumerate(blocks, 1):
        lines = block.strip("\n").split("\n")
        if len(lines) < 3 or not lines[0].strip().isdigit():
            errors.append(f"block {n}: malformed (index/time/text)"); continue
        m = SRT_TIME.fullmatch(lines[1].strip())
        if not m:
            errors.append(f"block {n}: bad time line '{lines[1]}'"); continue
        g = m.groups()
        cues.append({"start": _sec(*g[:4]), "end": _sec(*g[4:]), "text": "\n".join(lines[2:])})
    return cues, errors


def check_cues(cues):
    """Errors for an empty list, end <= start, going backwards, overlapping cues."""
    if not cues:
        return ["no cues"]
    errors = []
    for i, c in enumerate(cues):
        if c["end"] <= c["start"]:
            errors.append(f"cue {i + 1}: end <= start")
        if i and c["start"] < cues[i - 1]["start"]:
            errors.append(f"cue {i + 1}: starts before the previous cue")
        elif i and c["start"] < cues[i - 1]["end"] - 0.001:
            errors.append(f"cue {i + 1}: overlaps the previous cue")
        if not c["text"].strip():
            errors.append(f"cue {i + 1}: empty text")
    return errors


def fmt_time(t):
    t = int(round(t)); h, rem = divmod(t, 3600); m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def build_chapters(segments, total, min_len=MIN_CHAPTER_S):
    """segments: [{id, start, name, chapter(bool)}] (intro first, outro last; `chapter` = starts a chapter).

    A too short first chapter (intro) is merged into the next one (which then starts at 0:00).
    Returns (chapters [{start, end, name}], errors); errors list every chapter shorter than min_len.
    """
    starts = [s for s in segments if s["chapter"]]
    if not starts:
        return [], ["no chapters"]
    chapters = [{"start": s["start"], "name": s["name"]} for s in starts]
    chapters[0]["start"] = 0.0
    for i, c in enumerate(chapters):
        c["end"] = chapters[i + 1]["start"] if i + 1 < len(chapters) else total
    if len(chapters) > 1 and chapters[0]["end"] - chapters[0]["start"] < min_len:
        nxt = chapters.pop(1); chapters[0] = {"start": 0.0, "end": nxt["end"], "name": nxt["name"]}
    errors = [f"chapter '{c['name']}' ({fmt_time(c['start'])}) is only {c['end'] - c['start']:.1f}s (< {min_len:.0f}s)"
              for c in chapters if c["end"] - c["start"] < min_len]
    return chapters, errors


def probe(mp4):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
                                   "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", str(mp4)])
    j = json.loads(out)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    num, den = v["r_frame_rate"].split("/")
    return {"width": v["width"], "height": v["height"], "fps": int(num) / int(den),
            "audio": any(s["codec_type"] == "audio" for s in j["streams"]), "duration": float(j["format"]["duration"])}


def verify(slug, lang):
    errors, warnings = [], []
    cache = ROOT / slug / ".cache" / lang
    out = ROOT / slug / "out"
    tl = json.loads((cache / "timeline.json").read_text())
    meta, B = tl["meta"], tl["brand"]
    mp4 = out / f"{slug}.{lang}.mp4"
    if not mp4.exists():
        return [f"missing {mp4}"], warnings, []
    p = probe(mp4)
    want = (B["video"]["width"], B["video"]["height"])
    print(f"video: {p['width']}x{p['height']} {p['fps']:.0f} fps, {p['duration']:.1f}s, audio={'yes' if p['audio'] else 'NO'}")
    if (p["width"], p["height"]) != want:
        errors.append(f"resolution {p['width']}x{p['height']}, expected {want[0]}x{want[1]}")
    if round(p["fps"]) != B["video"]["fps"]:
        errors.append(f"fps {p['fps']:.2f}, expected {B['video']['fps']}")
    if not p["audio"]:
        errors.append("no audio stream")
    target = meta.get("target_duration_s")
    if target:
        if abs(p["duration"] - target) / target > 0.25:
            warnings.append(f"duration {p['duration']:.0f}s deviates > 25 % from target {target}s")
    elif not 120 <= p["duration"] <= 240:
        warnings.append(f"duration {p['duration']:.0f}s outside 120-240 s")

    scenes = [s for s in tl["scenes"] if not s.get("branding")]
    narrated = [s for s in scenes if s.get("audio")]
    sub_langs = list(meta.get("subtitle_langs") or [])
    for code, expect in [(lang, sum(len(s["cues"]) for s in narrated))] + \
            [(sl, sum(len((s.get("subtitle_cues") or {}).get(sl, [])) for s in narrated)) for sl in sub_langs]:
        f = out / f"{slug}.{code}.srt"
        if not f.exists():
            errors.append(f"missing {f.name}"); continue
        cues, perr = parse_srt(f.read_text(encoding="utf-8"))
        errs = perr + check_cues(cues)
        if len(cues) != expect:
            errs.append(f"{len(cues)} cues in file, {expect} expected from the timeline")
        errors += [f"{f.name}: {e}" for e in errs]
        print(f"{f.name}: {len(cues)} cues {'OK' if not errs else 'FAIL'}")
    for s in narrated:
        if not s["cues"]:
            errors.append(f"scene {s['id']}: no {lang} cues")
        for sl in sub_langs:
            if not (s.get("subtitle_cues") or {}).get(sl):
                errors.append(f"scene {s['id']}: no {sl} subtitle cues")

    rec = json.loads((cache / "rec" / "frames.json").read_text())
    rs = {s["id"]: s for s in rec["scenes"]}
    for s in scenes:
        r = rs.get(s["id"])
        if not r:
            errors.append(f"scene {s['id']}: not in rec/frames.json"); continue
        a, b = r["start"], r["start"] + r["dur"]
        if not any(f["ts"] <= b for f in rec["frames"]):
            errors.append(f"scene {s['id']}: 0 frames")
        elif not any(a < f["ts"] <= b for f in rec["frames"]):
            warnings.append(f"scene {s['id']}: static (no new frame during the scene)")
        if r["dur"] > r["planned"] + OVERRUN_S:
            errors.append(f"scene {s['id']}: actual {r['dur']:.1f}s > planned {r['planned']:.1f}s + {OVERRUN_S:.0f}s")

    comp = json.loads((cache / "compose.json").read_text())
    has_marked = any(s.get("chapter") for s in scenes)
    segs = [{"id": "intro", "name": "Intro", "chapter": True}]
    for s in scenes:
        co = s.get("callout") or ""
        segs.append({"id": s["id"], "name": s.get("chapter") or (co.split(" · ")[-1] if co else s["id"]),
                     "chapter": bool(s.get("chapter")) if has_marked else True})
    segs.append({"id": "outro", "name": "Outro", "chapter": False})
    if len(segs) != len(comp["starts"]):
        errors.append(f"segment count {len(segs)} != compose.json starts {len(comp['starts'])}")
        return errors, warnings, []
    for sg, st in zip(segs, comp["starts"]):
        sg["start"] = st
    chapters, cerr = build_chapters(segs, comp["total"])
    errors += cerr
    return errors, warnings, chapters


def main(argv):
    if len(argv) != 3:
        sys.exit(__doc__)
    slug, lang = argv[1:]
    errors, warnings, chapters = verify(slug, lang)
    print("\nChapters (YouTube description):")
    for c in chapters:
        print(f"{fmt_time(c['start'])} {c['name']}")
    for w in warnings:
        print("WARN:", w)
    for e in errors:
        print("ERROR:", e)
    print("verify_output:", "FAIL" if errors else "OK")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
