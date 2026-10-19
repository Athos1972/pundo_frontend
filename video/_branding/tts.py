#!/usr/bin/env python3
"""TTS step: scenes.yml -> per-scene mp3 + timing JSON (edge-tts).

Usage: tts.py <slug> <lang>
Writes video/<slug>/.cache/<lang>/audio/<scene>.mp3 and video/<slug>/.cache/<lang>/timeline.json
"""
import asyncio, hashlib, json, re, subprocess, sys
from pathlib import Path
import yaml, edge_tts
from formats import merge_format, voice_langs, subtitle_langs
from subtitles import distribute_cues, sentence_spans

ROOT = Path(__file__).resolve().parents[1]
slug, lang = sys.argv[1], sys.argv[2]
brand = yaml.safe_load((ROOT / "_branding/brand.yml").read_text())
scenes = yaml.safe_load((ROOT / slug / "scenes.yml").read_text())
cache = ROOT / slug / ".cache" / lang
META = scenes.get("meta") or {}
_vl = voice_langs(META)
if _vl and lang not in _vl:                                               # e.g. desktop team videos: EL = subtitles only
    print(f"{lang} is subtitle-only for {slug}; build {_vl[0]}, the .{lang}.srt is produced with it", file=sys.stderr)
    sys.exit(2)
brand = merge_format(brand, META)                                         # meta.format (vertical/desktop) + meta.timing
SUB_LANGS = subtitle_langs(META)
(cache / "audio").mkdir(parents=True, exist_ok=True)
T = brand["timing"]
V = brand["voices"][lang]
MAXC = brand["layout"]["subtitle_max_chars"]


def probe(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "default=nw=1:nk=1", str(path)])
    return float(out)


def norm(text):
    return re.sub(r"\s+", " ", text).strip()


PRON = (brand.get("pronunciation") or {}).get(lang) or {}


def spoken(text):
    """Respell words for the voice only (brand.yml `pronunciation`); subtitles keep the original text."""
    for word, say in PRON.items():
        text = re.sub(rf"(?<!\w){re.escape(word)}(?!\w)", say, text, flags=re.IGNORECASE)
    return text


async def synth(text, out, tries=25):
    for i in range(tries):
        try:
            return await _synth(text, out)
        except Exception as e:  # edge-tts sometimes answers 403/handshake errors transiently
            print(f"  tts retry {i+1}: {type(e).__name__}", file=sys.stderr)
            await asyncio.sleep(2 + min(i, 5))
    raise RuntimeError("edge-tts failed repeatedly")


def align_to_text(text, words):
    """WordBoundary tokens carry no punctuation; map their timings onto the original whitespace tokens."""
    toks = [(m.start(), m.end(), m.group()) for m in re.finditer(r"\S+", text)]
    pos, spans = 0, []
    for (a, b, w) in words:
        i = text.find(w, pos)
        if i < 0:
            spans.append(None); continue
        spans.append((i, i + len(w))); pos = i + len(w)
    out = []
    for (ts, te, tt) in toks:
        hit = [words[k] for k, sp in enumerate(spans) if sp and sp[0] < te and sp[1] > ts]
        out.append([hit[0][0], hit[-1][1], tt] if hit else [None, None, tt])
    for i, t in enumerate(out):
        if t[0] is None:
            prev = next((o for o in reversed(out[:i]) if o[0] is not None), None)
            nxt = next((o for o in out[i + 1:] if o[0] is not None), None)
            t[0] = prev[1] if prev else (nxt[0] if nxt else 0.0)
            t[1] = nxt[0] if nxt else t[0]
    return [tuple(t) for t in out]


async def _synth(text, out):
    comm = edge_tts.Communicate(text, V["voice"], rate=V["rate"], pitch=V["pitch"], boundary="WordBoundary")
    words, sents = [], []
    with open(out, "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
            elif ch["type"] == "SentenceBoundary":
                sents.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
    return words, sents


def chunk_words(words, dur):
    """Group word timings into subtitle cues of <=2 lines x MAXC chars, break at sentence/comma ends."""
    cues, cur = [], []
    def flush():
        nonlocal cur
        if cur:
            cues.append({"start": cur[0][0], "end": cur[-1][1], "text": " ".join(w[2] for w in cur)})
            cur = []
    for w in words:
        trial = " ".join(x[2] for x in cur + [w])
        if cur and len(trial) > MAXC * 2 - 4:
            flush()
        cur.append(w)
        if re.search(r"[.!?;·]$|[.!?;]»?$", w[2]) and len(" ".join(x[2] for x in cur)) > MAXC * 0.6:
            flush()
        elif re.search(r"[,:]$", w[2]) and len(" ".join(x[2] for x in cur)) > MAXC * 1.3:
            flush()
    flush()
    # make cues contiguous (hold until next cue starts if gap is small)
    for i, c in enumerate(cues):
        if i + 1 < len(cues) and cues[i + 1]["start"] - c["end"] < 0.6:
            c["end"] = cues[i + 1]["start"]
        c["end"] = min(dur, c["end"] + 0.15)
    for i in range(len(cues) - 1):          # never overlap the next cue (burned-in subtitles would stack)
        cues[i]["end"] = min(cues[i]["end"], cues[i + 1]["start"])
    return cues


async def main():
    timeline = []
    for sc in scenes["scenes"]:
        entry = {"id": sc["id"], "branding": sc.get("branding"), "audio": None, "audio_s": 0.0, "cues": [],
                 "callout": sc.get("callout", {}).get(lang) if sc.get("callout") else None}
        if sc.get("chapter"):
            entry["chapter"] = sc["chapter"].get(lang)
        if sc.get("window_path"):                                         # desktop format: path shown in the window's address bar
            entry["window_path"] = sc["window_path"].get(lang) if isinstance(sc["window_path"], dict) else sc["window_path"]
        if sc.get("narration"):
            text = norm(sc["narration"][lang])
            out = cache / "audio" / f"{sc['id']}.mp3"
            say = spoken(text)
            key = hashlib.sha1(f"{say}|{V}".encode()).hexdigest()
            meta_f = cache / "audio" / f"{sc['id']}.json"
            if out.exists() and meta_f.exists() and json.loads(meta_f.read_text()).get("key") == key:
                words = [tuple(w) for w in json.loads(meta_f.read_text())["words"]]  # cached
            else:
                words, sents = await synth(say, out)
                if words:
                    words = align_to_text(say, words)
                    orig = text.split(" ")  # respelling is word-for-word, so tokens line up 1:1
                    if len(orig) == len(words):
                        words = [(a, b, o) for (a, b, _), o in zip(words, orig)]
                meta_f.write_text(json.dumps({"key": key, "words": words}))
            dur = probe(out)
            if not words:  # fallback: spread words evenly (voice without WordBoundary)
                toks = text.split(" ")
                tot = sum(len(t) + 1 for t in toks)
                t0 = 0.0
                for t in toks:
                    d = dur * (len(t) + 1) / tot
                    words.append((t0, t0 + d, t)); t0 += d
            entry.update(audio=str(out.relative_to(ROOT)), audio_s=dur, cues=chunk_words(words, dur), words=len(words))
            if SUB_LANGS:                                                 # subtitle-only languages: timing from this (spoken) track
                entry["subtitle_cues"] = {}
                spans = sentence_spans(words)
                for sl in SUB_LANGS:
                    sub = (sc.get("subtitle") or {}).get(sl)
                    if not sub:
                        sys.exit(f"scene '{sc['id']}' is narrated but has no subtitle.{sl} (no silent omission)")
                    t0, t1 = words[0][0], min(dur, words[-1][1] + 0.15)
                    entry["subtitle_cues"][sl] = distribute_cues(sub, t0, t1, 42, spans)
            print(f"{lang} {sc['id']:<18} audio {dur:5.1f}s  cues {len(entry['cues'])}")
        timeline.append(entry)
    (cache / "timeline.json").write_text(json.dumps({"meta": scenes["meta"], "brand": brand, "scenes": timeline}, ensure_ascii=False, indent=1))
    tot = sum(s["audio_s"] for s in timeline)
    print(f"{lang}: narration total {tot:.1f}s")

asyncio.run(main())
