import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from verify_output import parse_srt, check_cues, build_chapters, fmt_time

GOOD = """1
00:00:01,000 --> 00:00:03,500
First line

2
00:00:03,500 --> 00:00:06,000
Second line
two lines
"""


def segs(items):
    # (id, start, chapter?)
    return [{"id": i, "name": i.title(), "start": s, "chapter": c} for i, s, c in items]


class Srt(unittest.TestCase):
    def test_good(self):
        cues, errs = parse_srt(GOOD)
        self.assertEqual(errs, []); self.assertEqual(len(cues), 2)
        self.assertEqual(check_cues(cues), [])

    def test_empty_file_is_an_error(self):
        cues, errs = parse_srt("")
        self.assertEqual(cues, []); self.assertEqual(check_cues(cues), ["no cues"])

    def test_malformed_block(self):
        _, errs = parse_srt("1\nnot a time\ntext\n")
        self.assertTrue(errs)
        _, errs = parse_srt("x\n00:00:01,000 --> 00:00:02,000\ntext\n")
        self.assertTrue(errs)

    def test_overlap_and_backwards(self):
        cues, _ = parse_srt("1\n00:00:01,000 --> 00:00:04,000\nA\n\n2\n00:00:03,000 --> 00:00:05,000\nB\n")
        self.assertTrue(any("overlaps" in e for e in check_cues(cues)))
        cues, _ = parse_srt("1\n00:00:05,000 --> 00:00:06,000\nA\n\n2\n00:00:03,000 --> 00:00:04,000\nB\n")
        self.assertTrue(any("before" in e for e in check_cues(cues)))
        cues, _ = parse_srt("1\n00:00:05,000 --> 00:00:05,000\nA\n")
        self.assertTrue(any("end <= start" in e for e in check_cues(cues)))


class Chapters(unittest.TestCase):
    def test_short_intro_is_merged_and_all_chapters_ok(self):
        ch, errs = build_chapters(segs([("intro", 0, True), ("a", 5.6, True), ("b", 25.0, True), ("outro", 50.0, False)]), 61.0)
        self.assertEqual(errs, [])
        self.assertEqual([(c["name"], c["start"]) for c in ch], [("A", 0.0), ("B", 25.0)])
        self.assertEqual(ch[-1]["end"], 61.0)

    def test_eight_second_chapter_is_an_error(self):
        ch, errs = build_chapters(segs([("intro", 0, True), ("a", 5.6, True), ("b", 25.0, True), ("c", 33.0, True), ("outro", 60.0, False)]), 71.0)
        self.assertEqual(len(errs), 1); self.assertIn("'B'", errs[0]); self.assertIn("8.0s", errs[0])

    def test_unmarked_scenes_belong_to_previous_chapter(self):
        ch, errs = build_chapters(segs([("intro", 0, True), ("a", 5.6, True), ("a2", 12.0, False), ("b", 30.0, True), ("outro", 50.0, False)]), 61.0)
        self.assertEqual(errs, []); self.assertEqual([c["name"] for c in ch], ["A", "B"])

    def test_no_chapters(self):
        self.assertEqual(build_chapters([], 10.0)[1], ["no chapters"])

    def test_time_format(self):
        self.assertEqual(fmt_time(0), "0:00"); self.assertEqual(fmt_time(125.4), "2:05"); self.assertEqual(fmt_time(3725), "1:02:05")


if __name__ == "__main__":
    unittest.main()
