"""Subtitle-only languages (F8960 T12): distribute a translated text over the time span of the spoken (EN) narration.

Pure functions, stdlib only (unit-tested in tests/test_subtitles.py). No TTS for the subtitle language: the timing
comes from the English audio of the same scene.
"""
import re

SENT_END = re.compile(r"(?<=[.!?;·…])\s+")


def norm(text):
    return re.sub(r"\s+", " ", str(text)).strip()


def split_sentences(text):
    """Split at sentence-final punctuation (incl. the Greek question mark ';'). Empty parts are dropped."""
    return [s for s in (norm(p) for p in SENT_END.split(norm(text))) if s]


def sentence_spans(words):
    """Group aligned word timings [(start, end, token), ...] into sentence spans [(start, end), ...]."""
    spans, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[.!?;·…]['\")»]?$", w[2]):
            spans.append((cur[0][0], cur[-1][1])); cur = []
    if cur:
        spans.append((cur[0][0], cur[-1][1]))
    return spans


def wrap_lines(text, max_chars):
    """Greedy word wrap into lines of <= max_chars (a single longer word keeps its own line)."""
    lines, cur = [], ""
    for w in text.split(" "):
        if cur and len(cur) + 1 + len(w) > max_chars:
            lines.append(cur); cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines


def chunk_sentence(sentence, max_chars):
    """Chunks of <= 2 lines x max_chars chars; returns list of text blocks (lines joined by newline).

    A sentence of more than 2 lines is split into chunks of similar length (no tiny orphan cue at the end);
    falls back to plain greedy filling if the balanced split does not fit into 2 lines per chunk.
    """
    lines = wrap_lines(sentence, max_chars)
    greedy = ["\n".join(lines[i:i + 2]) for i in range(0, len(lines), 2)]
    n = len(greedy)
    if n < 2:
        return greedy
    words, target = sentence.split(" "), len(sentence) / n
    parts, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        if len(parts) < n - 1 and len(" ".join(cur)) >= target - 3 and len(words) - i - 1 >= n - 1 - len(parts):
            parts.append(" ".join(cur)); cur = []
    if cur:
        parts.append(" ".join(cur))
    wrapped = [wrap_lines(p, max_chars) for p in parts]
    if len(parts) == n and all(len(w) <= 2 for w in wrapped):
        return ["\n".join(w) for w in wrapped]
    return greedy


def _check_span(a, b):
    if not (b > a):
        raise ValueError(f"invalid span: end ({b}) must be after start ({a})")


def _spread(chunks, a, b):
    """Allocate [a, b] to chunks proportionally to their character count; contiguous, no overlap."""
    weights = [max(len(c.replace("\n", " ")), 1) for c in chunks]
    total, t, cues = sum(weights), a, []
    for c, w in zip(chunks, weights):
        e = t + (b - a) * w / total
        cues.append({"start": round(t, 3), "end": round(e, 3), "text": c})
        t = e
    cues[-1]["end"] = round(b, 3)
    return cues


def distribute_cues(text, span_start, span_end, max_chars=42, spans=None):
    """Cues for `text` (string, or list of sentences) inside [span_start, span_end].

    If `text` is a list and `spans` (spoken sentence spans, see sentence_spans) has the same length, every sentence is
    placed in the span of its spoken counterpart (sentence-accurate). Otherwise the whole text is spread over
    [span_start, span_end] proportionally to character count.
    """
    _check_span(span_start, span_end)
    if isinstance(text, (list, tuple)):
        sentences = [norm(s) for s in text if norm(s)]
    else:
        sentences = split_sentences(text) if norm(text or "") else []
    if not sentences:
        raise ValueError("empty subtitle text")
    if isinstance(text, (list, tuple)) and spans and len(spans) == len(sentences):
        cues = []
        for s, (a, b) in zip(sentences, spans):
            a, b = max(a, span_start), min(b, span_end)
            _check_span(a, b)
            cues += _spread(chunk_sentence(s, max_chars), a, b)
        return cues
    chunks = [c for s in sentences for c in chunk_sentence(s, max_chars)]
    return _spread(chunks, span_start, span_end)


def _ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def srt_lines(cues, offset=0.0, first_index=1):
    """SRT blocks (list of strings, one per cue) with times shifted by `offset`; same layout as compose.py's EN SRT."""
    return [f"{first_index + i}\n{_ts(offset + c['start'])} --> {_ts(offset + c['end'])}\n{c['text']}\n"
            for i, c in enumerate(cues)]
