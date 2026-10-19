import base64, copy, sys, unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from regression import compare_results


def thumb(v):
    return base64.b64encode(np.full(64 * 36, v, dtype=np.uint8).tobytes()).decode()


BASE = {"video": {"width": 1920, "height": 1080, "fps": 30.0, "duration": 100.0},
        "geom": {"sx": 1, "sy": 2, "sw": 3, "sh": 4}, "srt_sha256": "a",
        "layers": {"base-x.png": {"sha256": "h1", "thumb": thumb(100)}, "bezel.png": {"sha256": "h2", "thumb": thumb(10)}}}


def failed(now):
    return [c for c, ok, _ in compare_results(BASE, now) if not ok]


class Compare(unittest.TestCase):
    def test_identical_passes(self):
        self.assertEqual(failed(copy.deepcopy(BASE)), [])

    def test_each_regression_is_detected(self):
        n = copy.deepcopy(BASE); n["video"]["width"] = 1080; self.assertIn("resolution", failed(n))
        n = copy.deepcopy(BASE); n["video"]["duration"] = 100.5; self.assertIn("duration", failed(n))
        n = copy.deepcopy(BASE); n["geom"]["sw"] = 5; self.assertIn("geom", failed(n))
        n = copy.deepcopy(BASE); n["srt_sha256"] = "b"; self.assertIn("srt", failed(n))
        n = copy.deepcopy(BASE); del n["layers"]["bezel.png"]; self.assertIn("layer set", failed(n))
        n = copy.deepcopy(BASE); n["layers"]["base-x.png"] = {"sha256": "zz", "thumb": thumb(110)}; self.assertIn("layer pixels", failed(n))

    def test_tiny_pixel_difference_is_tolerated(self):
        n = copy.deepcopy(BASE); n["layers"]["base-x.png"] = {"sha256": "zz", "thumb": thumb(100)}
        self.assertEqual(failed(n), [])


if __name__ == "__main__":
    unittest.main()
