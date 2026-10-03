import json
from pathlib import Path
import tempfile
import unittest
import backups


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.data = Path(self.tmp.name)
        for name in ('20260101-000000', '20260201-000000', '20260301-000000', '20260401-000000'):
            folder = self.data / 'update-backups' / name
            folder.mkdir(parents=True)
            (folder / 'package.json').write_text('{"version":"0.1.0"}', encoding='utf-8')
        self.recycled = []

    def tearDown(self):
        self.tmp.cleanup()

    def recycle(self, path):
        self.recycled.append(path)
        return False

    def test_default_keeps_latest_with_recoverable_fallback(self):
        results = backups.prune(self.data, self.recycle)
        self.assertEqual([x['id'] for x in backups.inventory(self.data)], ['20260401-000000'])
        self.assertEqual(len(results), 3)
        self.assertTrue(all(Path(x['recoveryFolder']).exists() for x in results))

    def test_all_retention_choices(self):
        for keep, count in ((-1,4),(3,3),(1,1),(0,0)):
            (self.data / 'backup-settings.json').write_text(json.dumps({'keep':keep}))
            backups.prune(self.data, self.recycle)
            self.assertEqual(len(backups.inventory(self.data)),count)

    def test_invalid_preferences_default_to_one(self):
        for keep in (True, 'all', 99):
            (self.data / 'backup-settings.json').write_text(json.dumps({'keep':keep}))
            self.assertEqual(backups.retention(self.data),1)

    def test_unknown_and_traversal_ids_rejected_without_touching_data(self):
        for uid in ('../project.json', '', None, '20200101-000000'):
            with self.assertRaises(ValueError): backups.remove(self.data, uid, self.recycle)
        self.assertEqual(len(backups.inventory(self.data)),4)

    def test_userdata_not_in_inventory(self):
        (self.data / 'project.json').write_text('private portfolio')
        items = backups.inventory(self.data)
        self.assertEqual(len(items),4)
        self.assertEqual(items[0]['bytes'],len('{"version":"0.1.0"}'))
