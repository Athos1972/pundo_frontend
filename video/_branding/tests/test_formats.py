import copy, shutil, subprocess, sys, unittest
from pathlib import Path
import yaml

HERE = Path(__file__).resolve().parent
BRANDING = HERE.parent
VIDEO = BRANDING.parent
sys.path.insert(0, str(BRANDING))
from formats import merge_format, voice_langs, subtitle_langs

BRAND = yaml.safe_load((BRANDING / "brand.yml").read_text())


class MergeFormat(unittest.TestCase):
    def test_default_is_unchanged(self):
        b = merge_format(BRAND, {"slug": "x"})
        self.assertEqual(b["layout"], BRAND["layout"])
        self.assertEqual(b["video"], BRAND["video"])
        self.assertEqual(b["timing"], BRAND["timing"])
        self.assertNotIn("record", b)

    def test_vertical_unchanged(self):
        b = merge_format(BRAND, {"format": "vertical"})
        self.assertEqual((b["video"]["width"], b["video"]["height"]), (1080, 1920))
        self.assertTrue(b["layout"]["vertical"])
        self.assertEqual(b["layout"], BRAND["formats"]["vertical"]["layout"])
        self.assertEqual(b["timing"]["intro_s"], 2.6)
        self.assertNotIn("record", b)

    def test_desktop(self):
        b = merge_format(BRAND, {"format": "desktop"})
        self.assertEqual((b["video"]["width"], b["video"]["height"]), (1920, 1080))
        self.assertEqual(b["layout"]["device"], "browser")
        self.assertEqual((b["layout"]["screen_w"], b["layout"]["screen_h"]), (1344, 756))
        self.assertNotIn("phone_screen_h", b["layout"])
        self.assertEqual(b["record"]["viewport"], {"width": 1440, "height": 810})
        self.assertFalse(b["layout"].get("vertical"))

    def test_desktop_screen_has_recording_aspect(self):
        b = merge_format(BRAND, {"format": "desktop"})
        vp, ly = b["record"]["viewport"], b["layout"]
        self.assertLess(abs((vp["width"] / vp["height"]) / (ly["screen_w"] / ly["screen_h"]) - 1), 0.01)

    def test_desktop_window_fits_canvas_and_subtitles(self):
        ly = merge_format(BRAND, {"format": "desktop"})["layout"]
        left, top = ly["phone_center_x"] - ly["screen_w"] / 2, ly["phone_center_y"] - ly["screen_h"] / 2 - ly["browser_bar_h"]
        self.assertGreaterEqual(left, 0); self.assertLessEqual(left + ly["screen_w"], 1920)
        self.assertGreaterEqual(top, ly["callout_band"]["y"] + ly["callout_band"]["h"])   # band above the window
        self.assertLessEqual(ly["phone_center_y"] + ly["screen_h"] / 2, 1080)
        # tuned on the pilot (T17): even a two-line subtitle (2 x 52 px + 32 px padding = 136 px, bottom-aligned at
        # subtitle_y + subtitle_h) must not cover the window (it hid the sidebar bottom: "CRM"/"Help")
        two_line_top = ly["subtitle_y"] + ly["subtitle_h"] - 136
        self.assertLessEqual(ly["phone_center_y"] + ly["screen_h"] / 2, two_line_top)

    def test_meta_timing_wins_and_input_is_not_mutated(self):
        before = copy.deepcopy(BRAND)
        b = merge_format(BRAND, {"format": "vertical", "timing": {"intro_s": 1.0}})
        self.assertEqual(b["timing"]["intro_s"], 1.0)
        self.assertEqual(BRAND, before)

    def test_unknown_format_is_an_error(self):
        with self.assertRaises(ValueError):
            merge_format(BRAND, {"format": "tablet"})


class SceneFixture(unittest.TestCase):
    def test_desktop_fixture_shape(self):
        sc = yaml.safe_load((HERE / "fixtures/scenes.desktop.yml").read_text())
        self.assertEqual(voice_langs(sc["meta"]), ["en"])
        self.assertEqual(subtitle_langs(sc["meta"]), ["el"])
        for s in sc["scenes"]:
            if s.get("narration"):                       # every narrated scene has the voice text AND the subtitle text
                self.assertIn("en", s["narration"]); self.assertIn("el", s["subtitle"])
        self.assertEqual(subtitle_langs({}), []); self.assertIsNone(voice_langs({}))


class SubtitleOnlyLanguage(unittest.TestCase):
    def test_tts_refuses_subtitle_only_language(self):
        tmp = VIDEO / "_tmp-fixture-desktop"
        try:
            tmp.mkdir()
            shutil.copy(HERE / "fixtures/scenes.desktop.yml", tmp / "scenes.yml")
            r = subprocess.run([sys.executable, str(BRANDING / "tts.py"), tmp.name, "el"], capture_output=True, text=True)
            self.assertEqual(r.returncode, 2)
            self.assertIn("subtitle-only", r.stderr)
            self.assertFalse((tmp / ".cache").exists())          # nothing written for the refused language
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
