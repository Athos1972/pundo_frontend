#!/usr/bin/env python3
"""Generic compose step: intro + scenes + outro -> MP4 + SRT (+ thumbnail, QA frames).

Usage: compose.py <slug> <lang>
Inputs (all under video/<slug>/.cache/<lang>/): timeline.json (tts.py), rec/frames.json + frames (record.mjs),
layers/ + intro/ + outro/ (render.mjs).  Output: video/<slug>/out/<slug>.<lang>.mp4 / .srt
"""
import json, subprocess, sys, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
slug, lang = sys.argv[1], sys.argv[2]
cache = ROOT / slug / ".cache" / lang
out_dir = ROOT / slug / "out"
out_dir.mkdir(exist_ok=True)
tl = json.loads((cache / "timeline.json").read_text())
B = tl["brand"]; T = B["timing"]; V = B["video"]; LY = B["layout"]
rec = json.loads((cache / "rec" / "frames.json").read_text())
layers = json.loads((cache / "layers" / "layers.json").read_text())
g = layers["geom"]
FPS, CF, LEAD = V["fps"], T["crossfade_s"], T["lead_in_s"]
work = cache / "work"
shutil.rmtree(work, ignore_errors=True); work.mkdir()


def run(cmd):
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if r.returncode:
        print(" ".join(map(str, cmd))); print(r.stdout[-3000:]); sys.exit(1)


def enc(extra=()):
    return ["-c:v", "libx264", "-preset", "fast", "-crf", "12", "-pix_fmt", "yuv420p", "-r", str(FPS), *extra]


frames = sorted(rec["frames"], key=lambda f: f["ts"])
rec_scenes = {s["id"]: s for s in rec["scenes"]}


def phone_clip(sid):
    s = rec_scenes[sid]; a, b = s["start"], s["start"] + s["dur"]
    before = [f for f in frames if f["ts"] <= a]
    inside = [f for f in frames if a < f["ts"] < b]
    seq = ([before[-1]] if before else []) + inside
    seq0 = seq[0]
    items = []
    for i, f in enumerate(seq):
        t0 = a if i == 0 else f["ts"]
        t1 = seq[i + 1]["ts"] if i + 1 < len(seq) else b
        items.append((f["file"], max(t1 - t0, 1 / 120)))
    lst = work / f"{sid}.txt"
    with open(lst, "w") as fh:
        for fn, d in items:
            fh.write(f"file '{(cache / 'rec' / fn).as_posix()}'\nduration {d:.5f}\n")
        fh.write(f"file '{(cache / 'rec' / items[-1][0]).as_posix()}'\n")
    clip = work / f"{sid}-phone.mp4"
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst,
         "-vf", f"fps={FPS},scale={g['sw']}:{g['sh']}:flags=lanczos,format=yuv420p", "-t", f"{s['dur']:.3f}", *enc(), clip])
    return clip, s["dur"]


segments = []   # (path, duration, audio_path|None, cues)
intro_png = cache / "intro" / "f%04d.png"
run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", intro_png, *enc(), work / "intro.mp4"])
segments.append({"clip": work / "intro.mp4", "dur": T["intro_s"], "audio": None, "cues": []})

for sc in tl["scenes"]:
    if sc.get("branding"):
        continue
    sid = sc["id"]
    clip, dur = phone_clip(sid)
    ly = layers["scenes"][sid]
    lyd = cache / "layers"
    inputs = ["-loop", "1", "-framerate", str(FPS), "-i", lyd / ly["base"], "-i", clip,
              "-loop", "1", "-framerate", str(FPS), "-i", lyd / "bezel.png"]
    fc = [f"[0:v][1:v]overlay={g['sx']}:{g['sy']}:eof_action=pass[a]", "[a][2:v]overlay=0:0[v0]"]
    last = "v0"
    for i, sub in enumerate(ly["subs"]):
        inputs += ["-loop", "1", "-framerate", str(FPS), "-i", lyd / sub["file"]]
        a, b = LEAD + sub["start"], LEAD + sub["end"]
        x = f"{LY['right_x']}+({LY['right_w']}-w)/2"; y = f"{LY['subtitle_y'] + LY['subtitle_h']}-h"
        fc.append(f"[{last}][{3 + i}:v]overlay={x}:{y}:enable='between(t,{a:.3f},{b:.3f})'[s{i}]")
        last = f"s{i}"
    scene_mp4 = work / f"{sid}.mp4"
    run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", ";".join(fc), "-map", f"[{last}]",
         "-t", f"{dur:.3f}", *enc(), scene_mp4])
    segments.append({"clip": scene_mp4, "dur": dur, "audio": ROOT / sc["audio"] if sc.get("audio") else None,
                     "cues": sc["cues"], "id": sid})
    print(f"  scene {sid}: {dur:.1f}s")

outro_png = cache / "outro" / "f%04d.png"
run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", outro_png, *enc(), work / "outro.mp4"])
segments.append({"clip": work / "outro.mp4", "dur": T["outro_s"], "audio": None, "cues": []})

# ---- timeline offsets ----
starts, acc = [], 0.0
for i, s in enumerate(segments):
    starts.append(acc)
    acc += s["dur"] - (CF if i < len(segments) - 1 else 0)
total = acc
print(f"total duration {total:.1f}s")

# ---- SRT ----
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"
srt, n = [], 1
for st, s in zip(starts, segments):
    for c in s["cues"]:
        srt.append(f"{n}\n{ts(st + LEAD + c['start'])} --> {ts(st + LEAD + c['end'])}\n{c['text']}\n"); n += 1
srt_path = out_dir / f"{slug}.{lang}.srt"
srt_path.write_text("\n".join(srt), encoding="utf-8")

# ---- audio: narration + optional music (loop w/ crossfade, ducking) -> two-pass loudnorm -> wav ----
import numpy as np, json as _json

def find_music():
    music = B.get("music", {}) or {}
    if not music.get("enabled", True):
        return None, music
    if music.get("file"):
        return (ROOT.parent / music["file"]).resolve(), music
    md = (ROOT.parent / music["dir"]).resolve()
    cand = sorted(p for p in md.glob("*") if p.suffix.lower() in (".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg")) if md.exists() else []
    return (cand[0] if cand else None), music


def build_music_loop(src, need_s, xf):
    """Loop `src` to >= need_s seconds with an equal-power crossfade at the best-matching loop point."""
    raw = work / "music-mono.f32"
    run(["ffmpeg", "-y", "-v", "error", "-i", src, "-ac", "1", "-ar", "8000", "-f", "f32le", raw])
    x = np.fromfile(raw, dtype="<f4"); sr = 8000; dur = len(x) / sr
    hop = sr // 100
    env = np.sqrt(np.convolve(x * x, np.ones(hop) / hop, "same"))[::hop]
    onset = np.maximum(np.diff(env, prepend=env[0]), 0)
    win = int(xf * 100)
    ref = onset[:win] - onset[:win].mean()
    best, best_s = -9, None
    for si in range(int((dur - 24) * 100), int((dur - xf - 0.3) * 100)):
        seg_ = onset[si:si + win]
        if len(seg_) < win:
            break
        seg_ = seg_ - seg_.mean()
        sc = float(np.dot(ref, seg_) / (np.linalg.norm(ref) * np.linalg.norm(seg_) + 1e-9))
        if sc > best:
            best, best_s = sc, si / 100
    print(f"  music loop point {best_s:.2f}s (of {dur:.1f}s), onset correlation {best:.2f}")
    full = work / "music-loop.wav"
    if need_s <= dur:
        run(["ffmpeg", "-y", "-v", "error", "-i", src, "-t", f"{need_s + 1:.2f}", full]); return full
    n = int(np.ceil((need_s - dur) / best_s)) + 1     # copies after the first, each adds `best_s`
    parts = n + 1
    cmd_ = ["ffmpeg", "-y", "-v", "error"]
    fc_, prev_ = [], None
    for i in range(parts):
        cmd_ += ["-i", src]
        tr = f"atrim=0:{best_s + xf:.3f}," if i < parts - 1 else ""
        fc_.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,{tr}asetpts=N/SR/TB[m{i}]")
    prev_ = "m0"
    for i in range(1, parts):
        fc_.append(f"[{prev_}][m{i}]acrossfade=d={xf}:c1=qsin:c2=qsin[c{i}]"); prev_ = f"c{i}"
    run(cmd_ + ["-filter_complex", ";".join(fc_), "-map", f"[{prev_}]", full])
    return full


acmd = ["ffmpeg", "-y", "-v", "error"]
af, amix, ai = [], [], 0
for st, s in zip(starts, segments):
    if s["audio"]:
        acmd += ["-i", s["audio"]]
        ms = int((st + LEAD) * 1000)
        af.append(f"[{ai}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{ai}]")
        amix.append(f"[a{ai}]"); ai += 1
af.append("".join(amix) + f"amix=inputs={len(amix)}:normalize=0:duration=longest,apad,atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[nar]")
mf, music = find_music()
if mf and mf.exists():
    print("music:", mf.name)
    loop = build_music_loop(mf, total, music.get("loop_crossfade_s", 2.0))
    acmd += ["-i", loop]
    sa, sb = starts[1], starts[-1] + CF            # speech region on the final timeline
    r = music["ramp_s"]
    w = f"min(1,clip(({sa}+{r}-t)/{r},0,1)+clip((t-({sb}-{r}))/{r},0,1))"
    db = f"({music['scene_db']}+({music['intro_outro_db']}-({music['scene_db']}))*{w})"
    af.append("[nar]asplit=2[nar1][nar2]")
    af.append(f"[{ai}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{total:.3f},asetpts=N/SR/TB,"
              f"loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,volume='pow(10,{db}/20)':eval=frame,"
              f"afade=t=in:st=0:d={music['fade_in_s']},afade=t=out:st={total - music['fade_out_s']:.2f}:d={music['fade_out_s']}[mus]")
    af.append("[mus][nar2]sidechaincompress=threshold=0.02:ratio=3:attack=30:release=600:makeup=1[duck]")
    af.append(f"[nar1][duck]amix=inputs=2:normalize=0:duration=first,atrim=0:{total:.3f}[mix]")
else:
    af.append("[nar]anull[mix]")
premix = work / "premix.wav"
run(acmd + ["-filter_complex", ";".join(af), "-map", "[mix]", "-ar", "48000", premix])
# two-pass loudnorm -> -14 LUFS integrated, TP <= -1 dBTP
LN = "I=-14:TP=-1.5:LRA=11"
p1 = subprocess.run(["ffmpeg", "-v", "info", "-i", premix, "-af", f"loudnorm={LN}:print_format=json", "-f", "null", "-"],
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True).stdout
m = _json.loads(p1[p1.rindex("{"):p1.rindex("}") + 1])
final_wav = work / "final.wav"
run(["ffmpeg", "-y", "-v", "error", "-i", premix, "-af",
     f"loudnorm={LN}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000",
     "-ar", "48000", final_wav])

# ---- video: xfade chain + mux ----
cmd = ["ffmpeg", "-y", "-v", "error"]
for s in segments:
    cmd += ["-i", s["clip"]]
cmd += ["-i", final_wav]
vf, prev = [], "0:v"
for i in range(1, len(segments)):
    vf.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={CF}:offset={starts[i]:.3f}[x{i}]")
    prev = f"x{i}"
final = out_dir / f"{slug}.{lang}.mp4"
cmd += ["-filter_complex", ";".join(vf), "-map", f"[{prev}]", "-map", f"{len(segments)}:a",
        "-c:v", "libx264", "-preset", V["preset"], "-crf", str(V["crf"]), "-pix_fmt", "yuv420p", "-r", str(FPS),
        "-c:a", "aac", "-b:a", V["audio_bitrate"], "-ar", "48000", "-movflags", "+faststart", "-t", f"{total:.3f}", final]
run(cmd)
print("written", final)

# ---- QA frames (scene mids) + thumbnail source ----
qa = out_dir / "frames" / lang
shutil.rmtree(qa, ignore_errors=True); qa.mkdir(parents=True)
for st, s in zip(starts, segments):
    name = s.get("id") or ("intro" if st == 0 else "outro")
    mid = st + s["dur"] / 2
    run(["ffmpeg", "-y", "-v", "error", "-ss", f"{mid:.2f}", "-i", final, "-frames:v", "1", qa / f"{name}.png"])
# phone-only frame for the thumbnail: full-resolution recording frame near the end of step5 (photo visible)
thumb_src = None
tid = B.get("thumbnail_scene", "step5-name-photo")
if tid in rec_scenes:
    rs = rec_scenes[tid]; tt = rs["start"] + rs["dur"] * 0.9
    thumb_src = cache / "rec" / [f for f in frames if f["ts"] <= tt][-1]["file"]
if thumb_src:
    run(["node", ROOT / "_branding" / "render.mjs", "thumb", slug, lang, thumb_src])
json.dump({"total": total, "starts": starts}, open(cache / "compose.json", "w"))
