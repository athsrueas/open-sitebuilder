import copy
import io
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import urllib.error
import urllib.request
from PIL import Image
import server


class ProjectValidationTests(unittest.TestCase):
    def test_theme_and_block_style_validation(self):
        p = server.default_project()
        for preset in server.STYLES['presets']:
            p['theme'].update(preset['values'])
            server.validate_project(p)
        b = p['pages'][0]['blocks'][0]
        b['styles'] = {'bodySize': 24, 'headingFont': 'mono', 'background': '#ffffff'}
        server.validate_project(p)
        for invalid in ({'bodySize': float('nan')}, {'bodyFont': 'evil'}, {'ink': 'red'}, {'contentWidth': 900}):
            b['styles'] = invalid
            with self.assertRaises(ValueError): server.validate_project(p)

    def test_registered_blocks_and_link_validation(self):
        p = server.default_project()
        p['pages'][0]['blocks'] = []
        for kind, definition in server.BLOCKS.items():
            b = dict(id=server.identifier(), type=kind, title=definition['name'], label='', text='', images=[], spreads=[], fit='contain')
            b.update(copy.deepcopy(definition['defaults']))
            p['pages'][0]['blocks'].append(b)
        server.validate_project(p)
        link = next(b for b in p['pages'][0]['blocks'] if b['type'] == 'button')
        link['url'] = 'javascript:alert(1)'
        with self.assertRaisesRegex(ValueError, 'HTTPS'):
            server.validate_project(p)
        link['url'] = '/about/'
        server.validate_project(p)
        card = next(b for b in p['pages'][0]['blocks'] if b['type'] == 'cards')
        card['items'][0]['url'] = 'data:text/html,test'
        with self.assertRaisesRegex(ValueError, 'link'):
            server.validate_project(p)

    def test_image_size_is_bounded(self):
        p = server.default_project()
        b = p['pages'][0]['blocks'][0]
        b.update(width=65, height=420)
        server.validate_project(p)
        for key, value in [('width', 101), ('height', float('nan')), ('width', True)]:
            prior = b[key]
            b[key] = value
            with self.assertRaisesRegex(ValueError, 'size'):
                server.validate_project(p)
            b[key] = prior

    def test_rejects_duplicate_slugs_and_unsafe_colors(self):
        p = server.default_project()
        another = copy.deepcopy(p['pages'][0])
        another['id'] = server.identifier()
        p['pages'].append(another)
        with self.assertRaisesRegex(ValueError, 'URLs'):
            server.validate_project(p)
        p = server.default_project()
        p['theme']['ink'] = 'red; background:url(https://example.com)'
        with self.assertRaisesRegex(ValueError, 'hex'):
            server.validate_project(p)

    def test_rejects_missing_image_and_duplicate_spread_ids(self):
        p = server.default_project()
        b = p['pages'][0]['blocks'][1]
        b['spreads'][0]['image'] = 'unknown'
        with self.assertRaisesRegex(ValueError, 'image'):
            server.validate_project(p)
        b['spreads'][0]['image'] = ''
        b['spreads'][1]['id'] = b['spreads'][0]['id']
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            server.validate_project(p)


class LocalApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.data_patch = patch.object(server, 'DATA', Path(self.temp.name))
        self.data_patch.start()
        self.env_patch = patch.object(server, 'ENV_FILE', Path(self.temp.name) / '.env')
        self.env_patch.start()
        self.environ_patch = patch.dict(server.os.environ, {'CLOUDFLARE_API_TOKEN': '', 'CLOUDFLARE_ACCOUNT_ID': '', 'CLOUDFLARE_PAGES_PROJECT': ''})
        self.environ_patch.start()
        for name in ('media', 'originals'):
            (server.DATA / name).mkdir()
        server.atomic_json(server.DATA / 'project.json', server.default_project())
        self.http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.http.server_port}'

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()
        self.data_patch.stop()
        self.env_patch.stop()
        self.environ_patch.stop()
        self.temp.cleanup()

    def request(self, path, value=None, token=True, headers=None):
        payload = json.dumps(value).encode() if isinstance(value, dict) else value
        req_headers = headers or {}
        if token:
            req_headers['X-Folio-Token'] = server.TOKEN
        req = urllib.request.Request(self.url + path, data=payload, headers=req_headers)
        return urllib.request.urlopen(req)

    def test_block_catalogue_is_served_as_json(self):
        with self.request('/shared/blocks.json') as response:
            self.assertEqual(response.headers['Content-Type'], 'application/json')
            catalogue = json.load(response)
        self.assertEqual(set(catalogue), set(server.BLOCKS))

    def test_write_requires_session_and_read_rejects_foreign_host(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/api/project', server.default_project(), token=False)
        self.assertEqual(error.exception.code, 403)
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/api/project', headers={'Host': 'evil.example'})
        self.assertEqual(error.exception.code, 403)

    def test_upload_preserves_original_and_save_cannot_replace_asset_paths(self):
        buf = io.BytesIO()
        Image.new('RGBA', (3000, 2000), (255, 0, 0, 0)).save(buf, format='PNG')
        original = buf.getvalue()
        asset = json.load(self.request('/api/upload', original, headers={'X-File-Name': 'test.png'}))
        self.assertEqual((server.DATA / 'originals' / (asset['id'] + '.png')).read_bytes(), original)
        with Image.open(server.DATA / 'media' / (asset['id'] + '.webp')) as img:
            self.assertEqual(img.size, (2400, 1600))
            self.assertEqual(img.mode, 'RGBA')
            self.assertEqual(img.getpixel((0, 0))[3], 0)
        with Image.open(server.DATA / 'media' / (asset['id'] + '-full.webp')) as img:
            self.assertEqual(img.size, (3000, 2000))
        for field, dimensions in (('thumb', (480, 320)), ('medium', (1200, 800))):
            with self.request(asset[field]) as response:
                self.assertIn('immutable', response.headers['Cache-Control'])
                with Image.open(io.BytesIO(response.read())) as variant:
                    self.assertEqual(variant.size, dimensions)
                    self.assertEqual(variant.getpixel((0, 0))[3], 0)
        thumbnail = server.DATA / 'media' / (asset['id'] + '-thumb.webp')
        thumbnail.unlink()
        self.request(asset['thumb']).close()
        self.assertTrue(thumbnail.is_file())
        p = server.load_project()
        p['name'] = 'Test artist'
        p['assets'][0]['src'] = '/../../secret'
        self.request('/api/project', p).close()
        stored = server.load_project()
        self.assertEqual(stored['name'], 'Test artist')
        self.assertEqual(stored['assets'][0]['src'], asset['src'])

    def test_build_publishes_only_used_images_and_keeps_local_library(self):
        buf = io.BytesIO()
        Image.new('RGB', (40, 30), 'red').save(buf, format='PNG')
        active = json.load(self.request('/api/upload', buf.getvalue()))
        unused = json.load(self.request('/api/upload', buf.getvalue()))
        project = server.load_project()
        project['pages'][0]['blocks'][0]['type'] = 'image'
        project['pages'][0]['blocks'][0]['images'] = [active['id']]
        project['assets'][0]['archived'] = True
        root = server.DATA / 'build-root'
        public = root / 'site/public/media'
        public.mkdir(parents=True)
        (public / (unused['id'] + '.webp')).write_bytes(b'stale')
        with patch.object(server, 'ROOT', root), patch.object(server, 'node_command', return_value=['test']), patch.object(server.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='', stderr='')):
            server.build_project(project)
        exported = json.loads((root / 'site/src/project.json').read_text())
        self.assertEqual([a['id'] for a in exported['assets']], [active['id']])
        self.assertTrue((public / (active['id'] + '.webp')).exists())
        self.assertFalse((public / (unused['id'] + '.webp')).exists())
        self.assertEqual(len(project['assets']), 2)
        self.assertEqual(len(server.load_project()['assets']), 2)

    def test_edited_image_versions_preserve_alpha_and_source(self):
        source = io.BytesIO()
        Image.new('RGB', (40, 30), 'red').save(source, format='JPEG')
        original = json.load(self.request('/api/upload', source.getvalue(), headers={'X-File-Name': 'source.jpg'}))
        edited = io.BytesIO()
        Image.new('RGBA', (20, 15), (20, 50, 80, 64)).save(edited, format='PNG')
        asset = json.load(self.request('/api/upload', edited.getvalue(), headers={'X-File-Name': 'source-edited.png', 'X-Source-Asset': original['id']}))
        self.assertNotEqual(original['id'], asset['id'])
        self.assertEqual(asset['parentId'], original['id'])
        self.assertEqual(len(server.load_project()['assets']), 2)
        with Image.open(server.DATA / 'media' / (asset['id'] + '-full.webp')) as image:
            self.assertEqual(image.getpixel((0, 0)), (20, 50, 80, 64))
        self.assertEqual(self.request('/api/original/' + original['id']).read(), source.getvalue())
        with self.assertRaises(urllib.error.HTTPError): self.request('/api/original/../../.env')
        p = server.load_project()
        p['assets'][0]['archived'] = True
        self.request('/api/project', p).close()
        self.assertTrue(server.load_project()['assets'][0]['archived'])
        with self.assertRaises(urllib.error.HTTPError):
            self.request('/api/upload', edited.getvalue(), headers={'X-Source-Asset': 'f' * 32})

    def test_token_persists_in_env_but_is_not_returned_to_browser(self):
        value = {'accountId': 'a' * 32, 'projectName': 'test-portfolio', 'token': 'secret-test-token'}
        self.request('/api/config', value).close()
        self.assertNotIn('secret-test-token', (server.DATA / 'cloudflare.json').read_text())
        config, token = server.cloudflare_settings()
        self.assertEqual(token, 'secret-test-token')
        self.assertEqual(config['projectName'], 'test-portfolio')
        response = json.load(self.request('/api/config'))
        self.assertTrue(response['hasToken'])
        self.assertNotIn('token', response)
        self.assertNotIn('secret-test-token', json.dumps(response))
        value['token'] = ''
        self.request('/api/config', value).close()
        self.assertEqual(server.cloudflare_settings()[1], 'secret-test-token')

    def test_env_edits_are_read_without_restart_and_environment_takes_precedence(self):
        server.ENV_FILE.write_text('# local settings\nCLOUDFLARE_API_TOKEN="first-token"\nCLOUDFLARE_ACCOUNT_ID=' + 'b' * 32 + '\nCLOUDFLARE_PAGES_PROJECT=gallery\n')
        config, token = server.cloudflare_settings()
        self.assertEqual(token, 'first-token')
        self.assertEqual(config['projectName'], 'gallery')
        server.ENV_FILE.write_text('CLOUDFLARE_API_TOKEN=updated-token\n')
        self.assertEqual(server.cloudflare_settings()[1], 'updated-token')
        with patch.dict(server.os.environ, {'CLOUDFLARE_API_TOKEN': 'external-token'}):
            self.assertEqual(server.cloudflare_settings()[1], 'external-token')

    def test_traversal_and_missing_publish_configuration(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/ui/%2e%2e/server.py')
        self.assertEqual(error.exception.code, 404)
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/api/publish', {})
        self.assertEqual(error.exception.code, 400)
        self.assertIn('Settings', error.exception.read().decode())

    def test_rejects_non_image_upload(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/api/upload', b'<script>alert(1)</script>')
        self.assertEqual(error.exception.code, 400)


if __name__ == '__main__':
    unittest.main()
