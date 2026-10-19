"""Format merge for scenes.yml `meta.format` (extracted from tts.py so it can be unit-tested; F8960 T11/T12)."""
import copy


def merge_format(brand, meta):
    """Return a copy of `brand` with `formats.<meta.format>` merged in and `meta.timing` applied.

    No `meta.format` -> default 16:9 phone layout (unchanged behaviour). `vertical` and `desktop` replace
    `layout` and update `video`/`timing`; a format may also carry `record` (viewport/dsf for the recorder).
    """
    meta = meta or {}
    b = copy.deepcopy(brand)
    fmt = meta.get("format")
    if fmt:
        formats = b.get("formats") or {}
        if fmt not in formats:
            raise ValueError(f"unknown meta.format '{fmt}' (known: {', '.join(sorted(formats))})")
        f = formats[fmt]
        b["video"].update(f.get("video") or {})
        b["layout"] = f["layout"]
        b["timing"].update(f.get("timing") or {})
        if f.get("record"):
            b["record"] = f["record"]
    b["timing"].update(meta.get("timing") or {})
    return b


def voice_langs(meta):
    """Languages that get a TTS voice (None = every language, as before)."""
    return (meta or {}).get("voice_langs")


def subtitle_langs(meta):
    """Languages that only get a subtitle file (timing from the spoken language)."""
    return list((meta or {}).get("subtitle_langs") or [])
