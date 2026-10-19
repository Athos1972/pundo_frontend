import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from subtitles import chunk_sentence, distribute_cues, sentence_spans, split_sentences, srt_lines, norm

EL = "Αυτός είναι ο πίνακας ελέγχου του διαχειριστή. Εδώ βλέπετε τις ανοιχτές αιτήσεις και τα καταστήματα που περιμένουν έλεγχο. Ξεκινήστε πάντα από τις αιτήσεις;"


class Distribute(unittest.TestCase):
    def check_invariants(self, cues, a, b, max_chars=42):
        self.assertTrue(cues)
        for i, c in enumerate(cues):
            self.assertLess(c["start"], c["end"])
            self.assertGreaterEqual(c["start"], a - 1e-6)
            self.assertLessEqual(c["end"], b + 1e-6)
            lines = c["text"].split("\n")
            self.assertLessEqual(len(lines), 2)
            for ln in lines:
                self.assertLessEqual(len(ln), max_chars, ln)
            if i:
                self.assertGreaterEqual(c["start"], cues[i - 1]["end"] - 1e-6)   # no overlap

    def test_proportional_whole_text(self):
        cues = distribute_cues(EL, 1.0, 21.0)
        self.check_invariants(cues, 1.0, 21.0)
        self.assertEqual(norm(" ".join(c["text"] for c in cues)), norm(EL))     # nothing lost
        self.assertAlmostEqual(cues[-1]["end"], 21.0, places=2)

    def test_sentence_list_maps_to_spoken_sentences(self):
        spans = [(0.5, 3.0), (4.0, 9.0), (9.5, 12.0)]
        sents = split_sentences(EL)
        self.assertEqual(len(sents), 3)
        cues = distribute_cues(sents, 0.0, 12.5, spans=spans)
        self.check_invariants(cues, 0.0, 12.5)
        self.assertEqual(cues[0]["start"], 0.5)                                  # starts with the first spoken sentence
        self.assertIn("Ξεκινήστε", cues[-1]["text"])
        self.assertGreaterEqual(cues[-1]["start"], 9.5)                          # last sentence inside its span
        self.assertEqual(norm(" ".join(c["text"] for c in cues)), norm(EL))

    def test_list_with_other_count_falls_back_to_proportional(self):
        cues = distribute_cues(["Ένα. Δύο.", "Τρία."], 0.0, 6.0, spans=[(0, 1), (2, 3), (4, 5)])
        self.check_invariants(cues, 0.0, 6.0)
        self.assertEqual(cues[0]["start"], 0.0)
        self.assertAlmostEqual(cues[-1]["end"], 6.0, places=2)

    def test_empty_text_is_an_error(self):
        for bad in ("", "   ", [], [" "], None):
            with self.assertRaises(ValueError, msg=repr(bad)):
                distribute_cues(bad, 0.0, 5.0)

    def test_invalid_span_is_an_error(self):
        for a, b in ((5.0, 5.0), (5.0, 4.0)):
            with self.assertRaises(ValueError):
                distribute_cues("Κείμενο", a, b)

    def test_long_text_is_split_into_cues_of_two_lines(self):
        long = " ".join(["λέξη"] * 60) + "."
        cues = distribute_cues(long, 0.0, 30.0)
        self.assertGreater(len(cues), 2)
        self.check_invariants(cues, 0.0, 30.0)

    def test_three_line_sentence_has_no_tiny_orphan_cue(self):
        s = "Δείχνει τις ανοιχτές αιτήσεις, τα νέα καταστήματα και τις εργασίες που σας περιμένουν."
        chunks = chunk_sentence(s, 42)
        self.assertEqual(len(chunks), 2)
        self.assertGreater(len(chunks[-1].replace("\n", " ")), 0.4 * len(chunks[0].replace("\n", " ")))
        self.assertEqual(norm(" ".join(chunks)), s)

    def test_sentence_spans_from_word_timings(self):
        words = [(0.0, 0.4, "One"), (0.4, 0.8, "two."), (1.0, 1.4, "Three"), (1.4, 1.9, "four?")]
        self.assertEqual(sentence_spans(words), [(0.0, 0.8), (1.0, 1.9)])

    def test_srt_blocks(self):
        blocks = srt_lines([{"start": 1.0, "end": 2.5, "text": "Α\nΒ"}], offset=10.0, first_index=4)
        self.assertEqual(blocks, ["4\n00:00:11,000 --> 00:00:12,500\nΑ\nΒ\n"])


if __name__ == "__main__":
    unittest.main()
