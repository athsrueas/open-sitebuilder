import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from credentials import read_credentials, write_credentials


@unittest.skipUnless(os.name == 'nt', 'Native Windows DPAPI tests')
class CredentialTests(unittest.TestCase):
    def test_round_trip_and_tamper_detection(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'credentials.dat'
            values = {'token': 'disposable-test-secret'}
            write_credentials(path, values)
            encrypted = path.read_bytes()
            self.assertNotIn(values['token'].encode(), encrypted)
            self.assertEqual(read_credentials(path), values)
            path.write_bytes(encrypted[:-12])
            with self.assertRaisesRegex(ValueError, 'Re-enter'):
                read_credentials(path)

    def test_failed_encryption_keeps_existing_credentials(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'credentials.dat'
            write_credentials(path, {'token': 'old-test-token'})
            previous = path.read_bytes()
            with patch('credentials.protect', side_effect=ValueError('Encryption failed')):
                with self.assertRaises(ValueError):
                    write_credentials(path, {'token': 'new-test-token'})
            self.assertEqual(path.read_bytes(), previous)
            self.assertFalse(path.with_suffix('.tmp').exists())
