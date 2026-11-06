import unittest, tempfile, pathlib, json
from update_videos import refresh

class FeedTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.folder = self.root / "public/data"
        self.folder.mkdir(parents=True)
        (self.folder / "settings.json").write_text(json.dumps({
            "channelUrl": "https://www.youtube.com/@faricraftyt",
            "channelId": "obsolete"
        }))
        (self.folder / "videos.json").write_text(json.dumps({
            "updatedAt": "previous", "error": None, "items": [{"id": "old"}]
        }))

    def tearDown(self):
        self.tmp.cleanup()

    def test_preserves_data_on_failure(self):
        def fail(_): raise ValueError("Network failure")
        result = refresh(self.root, fail)
        self.assertEqual(result["items"], [{"id": "old"}])
        self.assertEqual(result["updatedAt"], "previous")
        self.assertTrue(result["error"])

    def test_full_catalog_and_nested_tabs(self):
        def fetch(url):
            self.assertEqual(url, "https://www.youtube.com/@faricraftyt")
            videos = [{"id": f"{i:011d}", "title": f"Video {i}", "timestamp": 1700000000 + i} for i in range(65)]
            return {"entries": [{"entries": videos}, {"entries": [
                videos[0], {"id": "short123456", "title": "Short"},
                {"id": "private1234", "title": "Private", "availability": "private"}
            ]}]}
        result = refresh(self.root, fetch)
        self.assertEqual(len(result["items"]), 66)
        self.assertEqual(result["items"][0]["title"], "Video 64")
        self.assertIsNone(result["error"])
        self.assertEqual(result["items"][-1]["date"], "")

    def test_empty_response_keeps_previous_catalog(self):
        result = refresh(self.root, lambda _: {"entries": []})
        self.assertEqual(result["items"], [{"id": "old"}])
        self.assertTrue(result["error"])

class LanguageTests(unittest.TestCase):
    def test_catalog_requests_spanish_metadata(self):
        from unittest.mock import patch, MagicMock
        import sys
        from update_videos import fetch_catalog
        module = MagicMock()
        with patch.dict(sys.modules, {"yt_dlp": module}):
            fetch_catalog("https://www.youtube.com/@faricraftyt")
        options = module.YoutubeDL.call_args.args[0]
        self.assertEqual(options["extractor_args"]["youtube"]["lang"], ["es"])
        self.assertEqual(options["extractor_args"]["youtubetab"]["lang"], ["es"])
        self.assertIn("es", options["http_headers"]["Accept-Language"])
        self.assertTrue(options["skip_download"])

if __name__ == "__main__": unittest.main()
