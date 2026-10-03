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
    def test_internal_destinations_and_fragments_are_navigation_only(self):
        ref='folio:page:'+('a'*32)+':block:'+('b'*32)
        for value in (ref, '#block-'+('b'*32), '/statement/#section'):
            self.assertTrue(server.valid_url(value))
            self.assertFalse(server.valid_url(value, media=True))
        for value in ('folio:page:bad', '#bad space', 'javascript:alert(1)'):
            self.assertFalse(server.valid_url(value))
        project=server.default_project()
        project['pages'][0]['blocks'][0].update(type='button',url=ref,buttonText='Read statement')
        server.validate_project(project)

    def test_page_navigation_visibility_is_optional_and_boolean(self):
        project=server.default_project()
        for value in (True, False):
            project['pages'][0]['hideFromNavigation']=value
            server.validate_project(project)
        project['pages'][0]['hideFromNavigation']='true'
        with self.assertRaisesRegex(ValueError, 'navigation visibility'):
            server.validate_project(project)

    def test_sketchbook_fill_page_is_optional_and_boolean(self):
        project=server.default_project()
        spread=project['pages'][0]['blocks'][1]['spreads'][0]
        for value in (True, False):
            spread['fillPage']=value
            server.validate_project(project)
        spread['fillPage']='true'
        with self.assertRaisesRegex(ValueError, 'fill-page'):
            server.validate_project(project)
    def test_sketchbooks_accept_more_than_200_pages_and_validate_every_page(self):
        project = server.default_project()
        book = project['pages'][0]['blocks'][1]
        template = book['spreads'][0]
        book['spreads'] = [dict(template, id=server.identifier(), title=f'Page {i+1}') for i in range(1000)]
        server.validate_project(project)
        book['spreads'][-1]['image'] = 'missing'
        with self.assertRaisesRegex(ValueError, 'image'):
            server.validate_project(project)

    def test_free_layout_bounds_and_mobile_validation(self):
        project=server.default_project()
        b=project['pages'][0]['blocks'][0]
        b.update(type='freeLayout',mobileStack=True,layers=[dict(id=server.identifier(),kind='text',assetId='',text='Test',x=10,y=10,w=45,h=25,fontSize=32,color='#111111',background='#ffffff',opaque=False,fit='contain',mobile=dict(x=5,y=20,w=90,h=25))])
        server.validate_project(project)
        for change in [dict(x=float('nan')),dict(x=99),dict(w=0),dict(color='red'),dict(assetId='missing'),dict(mobile=dict(x=90,y=0,w=30,h=20))]:
            candidate=copy.deepcopy(project)
            candidate['pages'][0]['blocks'][0]['layers'][0].update(change)
            with self.assertRaises(ValueError): server.validate_project(candidate)

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

    def test_built_runtime_assets_use_generated_directory(self):
        root=server.DATA/'built-runtime-root'
        runtime=root/'site/dist/folio-assets'
        runtime.mkdir(parents=True)
        (runtime/'materials.js').write_text('console.log("motion")')
        with patch.object(server,'ROOT',root):
            with self.request('/folio-assets/materials.js') as response:
                self.assertIn('javascript',response.headers['Content-Type'])
                self.assertEqual(response.read(),b'console.log("motion")')
            with self.assertRaises(urllib.error.HTTPError): self.request('/folio-assets/%2e%2e/%2e%2e/project.json')

    def test_block_catalogue_is_served_as_json(self):
        with self.request('/shared/blocks.json') as response:
            self.assertEqual(response.headers['Content-Type'], 'application/json')
            catalogue = json.load(response)
        self.assertEqual(set(catalogue), set(server.BLOCKS))

    def test_media_delete_removes_placements_and_files_but_keeps_versions(self):
        buf = io.BytesIO(); Image.new('RGB', (40, 30), 'red').save(buf, format='PNG')
        first = json.load(self.request('/api/upload', buf.getvalue()))
        version = json.load(self.request('/api/upload', buf.getvalue(), headers={'X-Source-Asset': first['id']}))
        p = server.load_project(); b = p['pages'][0]['blocks'][0]
        b.update(type='cards', images=[first['id'], version['id']], items=[{'title':'First','text':'','url':''},{'title':'Second','text':'','url':''}])
        book = p['pages'][0]['blocks'][1]; book['spreads'][0]['image'] = first['id']
        free=copy.deepcopy(b);free.update(id=server.identifier(),type='freeLayout',images=[],mobileStack=True,layers=[dict(id=server.identifier(),kind='image',assetId=first['id'],text='',x=10,y=10,w=40,h=50,fontSize=32,color='#111111',background='#ffffff',opaque=False,fit='contain')]);free.pop('items',None);p['pages'][0]['blocks'].append(free)
        self.request('/api/project', p).close()
        with patch.object(server, 'recycle_media_folder', return_value=False):
            result = json.load(self.request('/api/media/delete', {'id':first['id'],'confirmed':True}))
        stored = server.load_project()
        self.assertEqual([a['id'] for a in stored['assets']], [version['id']])
        self.assertNotIn('parentId', stored['assets'][0])
        self.assertEqual(stored['pages'][0]['blocks'][0]['images'], ['',version['id']])
        self.assertEqual(stored['pages'][0]['blocks'][1]['spreads'][0]['image'], '')
        self.assertEqual(stored['pages'][0]['blocks'][2]['layers'][0]['assetId'],'')
        self.assertFalse((server.DATA/'originals'/(first['id']+'.png')).exists())
        self.assertFalse((server.DATA/'media'/(first['id']+'.webp')).exists())
        self.assertTrue((server.DATA/'media'/(version['id']+'.webp')).exists())
        self.assertEqual(len(list((server.DATA/'trash').glob('*/image.json'))), 1)
        self.assertFalse(result['recycled']); server.validate_project(result['project'])
        # A stale editor save cannot reintroduce the deleted image reference.
        with self.assertRaises(urllib.error.HTTPError): self.request('/api/project', p)

    def test_media_delete_requires_confirmation_and_rejects_paths(self):
        for value in ({'id':'../project.json','confirmed':True},{'id':'a'*32,'confirmed':False}):
            with self.assertRaises(urllib.error.HTTPError) as error: self.request('/api/media/delete', value)
            self.assertEqual(error.exception.code, 400)
        with self.assertRaises(ValueError): server.recycle_media_folder(server.DATA.parent)

    def test_failed_media_project_write_restores_files(self):
        buf = io.BytesIO(); Image.new('RGB', (20, 20), 'green').save(buf, format='PNG')
        asset = json.load(self.request('/api/upload', buf.getvalue()))
        original_write = server.atomic_json
        def failing_write(path, value):
            if path == server.DATA/'project.json': raise OSError('Test write failure')
            return original_write(path, value)
        with patch.object(server, 'atomic_json', side_effect=failing_write), patch.object(server, 'recycle_media_folder') as recycle:
            with self.assertRaises(urllib.error.HTTPError): self.request('/api/media/delete', {'id':asset['id'],'confirmed':True})
            recycle.assert_not_called()
        self.assertEqual(server.load_project()['assets'][0]['id'], asset['id'])
        self.assertTrue((server.DATA/'originals'/(asset['id']+'.png')).exists())
        self.assertTrue((server.DATA/'media'/(asset['id']+'.webp')).exists())

    @unittest.skipUnless(server.os.name == 'nt', 'Windows Explorer integration')
    def test_media_reveal_selects_validated_original_without_shell(self):
        buf = io.BytesIO(); Image.new('RGB', (20, 20), 'blue').save(buf, format='PNG')
        asset = json.load(self.request('/api/upload', buf.getvalue()))
        with patch.object(server.subprocess, 'Popen') as launch:
            self.request('/api/media/reveal', {'id':asset['id']}).close()
            args = launch.call_args.args[0]
            self.assertEqual(args[:2], ['explorer.exe','/select,'])
            self.assertEqual(Path(args[2]), (server.DATA/'originals'/(asset['id']+'.png')).resolve())
            self.assertNotIn('shell', launch.call_args.kwargs)
            with self.assertRaises(urllib.error.HTTPError): self.request('/api/media/reveal', {'id':'../project.json'})
            self.assertEqual(launch.call_count, 1)

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
        project['pages'][0]['blocks'][0].update(type='freeLayout',images=[],mobileStack=True,layers=[dict(id=server.identifier(),kind='image',assetId=active['id'],text='',x=10,y=10,w=40,h=50,fontSize=32,color='#111111',background='#ffffff',opaque=False,fit='contain')])
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
        project['discourageImageDownloads'] = True
        with patch.object(server, 'ROOT', root), patch.object(server, 'node_command', return_value=['test']), patch.object(server.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='', stderr='')):
            server.build_project(project)
        self.assertFalse((public / (active['id'] + '-full.webp')).exists())
        self.assertTrue((server.DATA / 'media' / (active['id'] + '-full.webp')).exists())
        project['discourageImageDownloads'] = False
        with patch.object(server, 'ROOT', root), patch.object(server, 'node_command', return_value=['test']), patch.object(server.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout='', stderr='')):
            server.build_project(project)
        self.assertTrue((public / (active['id'] + '-full.webp')).exists())

    def test_update_action_requires_session_and_protects_checkout(self):
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request('/api/update', {}, token=False)
        self.assertEqual(error.exception.code, 403)
        with patch.object(server, 'check_update', return_value={'managed':False,'available':True}):
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.request('/api/update', {})
            self.assertEqual(error.exception.code, 400)

    def test_offline_update_check_returns_actionable_message(self):
        with patch.object(server, 'check_update', side_effect=ValueError('offline')):
            response = json.load(self.request('/api/updates'))
        self.assertIn('internet',response['error'])

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

    def test_token_is_encrypted_and_not_returned_to_browser(self):
        value = {'accountId': 'a' * 32, 'projectName': 'test-portfolio', 'token': 'secret-test-token'}
        self.request('/api/config', value).close()
        self.assertNotIn('secret-test-token', (server.DATA / 'cloudflare.json').read_text())
        self.assertNotIn(b'secret-test-token',(server.DATA/'credentials.dat').read_bytes())
        self.assertFalse(server.ENV_FILE.exists())
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

    def test_env_import_removes_only_cloudflare_keys_after_encryption(self):
        server.ENV_FILE.write_text('CLOUDFLARE_API_TOKEN=import-token\nCLOUDFLARE_ACCOUNT_ID='+'b'*32+'\nCLOUDFLARE_PAGES_PROJECT=gallery\nUNRELATED=keep-me\n')
        self.request('/api/config',dict(accountId='b'*32,projectName='gallery',token='')).close()
        self.assertEqual(server.cloudflare_settings()[1],'import-token')
        text=server.ENV_FILE.read_text()
        self.assertNotIn('import-token',text)
        self.assertIn('UNRELATED=keep-me',text)
        self.assertEqual(server.cloudflare_settings()[0]['credentialStorage'],'windows-encrypted')

    def test_failed_encryption_preserves_plaintext_import(self):
        server.ENV_FILE.write_text('CLOUDFLARE_API_TOKEN=preserve-token\n')
        with patch.object(server,'write_credentials',side_effect=ValueError('Encryption unavailable')):
            with self.assertRaises(urllib.error.HTTPError): self.request('/api/config',dict(accountId='a'*32,projectName='test',token=''))
        self.assertIn('preserve-token',server.ENV_FILE.read_text())

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
