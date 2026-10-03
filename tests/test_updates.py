import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import updates


class UpdateTests(unittest.TestCase):
    def setUp(self):
        updates._cache = None

    def test_versions_cache_and_checkout_protection(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'package.json').write_text('{"version":"0.2.0"}')
            with patch.object(updates, 'fetch_json', side_effect=[{'sha':'a'*40},{'version':'0.10.0'}]) as fetch:
                result = updates.check_update(root)
                self.assertTrue(result['available'])
                self.assertTrue(result['managed'])
                (root / '.git').mkdir()
                self.assertFalse(updates.check_update(root)['managed'])
                self.assertEqual(fetch.call_count, 2)
                self.assertNotIn('token', str(fetch.call_args_list).lower())

    def test_rejects_invalid_remote_metadata(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'package.json').write_text('{"version":"0.2.0"}')
            with patch.object(updates, 'fetch_json', return_value={'sha':'../../untrusted'}):
                with self.assertRaises(ValueError): updates.check_update(root)
            with self.assertRaises(ValueError): updates.version_tuple('1.2.3;run')

    def test_same_or_older_version_is_not_an_update(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'package.json').write_text('{"version":"0.2.0"}')
            with patch.object(updates, 'fetch_json', side_effect=[{'sha':'a'*40},{'version':'0.1.0'}]):
                self.assertFalse(updates.check_update(root)['available'])
