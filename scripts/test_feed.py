import unittest, tempfile, pathlib, json
from update_videos import refresh
class FeedTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name);self.folder=self.root/'public/data';self.folder.mkdir(parents=True)
        (self.folder/'settings.json').write_text(json.dumps({'channelId':'UC'+'a'*22}))
        (self.folder/'videos.json').write_text(json.dumps({'updatedAt':'previous','error':None,'items':[{'id':'old'}]}))
    def tearDown(self):self.tmp.cleanup()
    def test_preserves_data_on_failure(self):
        result=refresh(self.root,lambda _:b'invalid XML');self.assertEqual(result['items'],[{'id':'old'}]);self.assertTrue(result['error'])
    def test_parses_official_atom(self):
        xml=b'<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>abcdefghijk</yt:videoId><title>Real title</title><published>2026-11-05T00:00:00Z</published></entry></feed>'
        result=refresh(self.root,lambda _:xml);self.assertEqual(result['items'][0]['title'],'Real title');self.assertIsNone(result['error'])
if __name__=='__main__':unittest.main()
