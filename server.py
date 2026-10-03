"""Folio Studio: loopback-only editor and static Astro publisher."""
import argparse
import hashlib
import copy
import io
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import threading
import urllib.parse
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image, ImageOps, UnidentifiedImageError
from dotenv import dotenv_values, unset_key
from credentials import read_credentials, write_credentials
from updates import check_update
import backups

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data'
ENV_FILE = ROOT / '.env'
TOKEN = secrets.token_urlsafe(32)
LOCK = threading.Lock()
JOB_LOCK = threading.Lock()
JOB = {'state': 'idle', 'message': ''}
SLUG = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
COLOR = re.compile(r'^#[0-9a-fA-F]{6}$')
STYLES = json.loads((ROOT / 'shared/styles.json').read_text(encoding='utf-8'))
BLOCKS = json.loads((ROOT / 'shared/blocks.json').read_text(encoding='utf-8'))

def cloudflare_settings():
    """Environment overrides encrypted settings; .env remains an import fallback."""
    values = dotenv_values(ENV_FILE, encoding='utf-8-sig')
    error = ''
    try:
        saved = read_credentials(DATA / 'credentials.dat')
    except ValueError as exc:
        saved, error = {}, str(exc)
    legacy = json.loads((DATA / 'cloudflare.json').read_text()) if (DATA / 'cloudflare.json').exists() else {}
    def setting(key, fallback=''):
        return (os.environ.get(key) or saved.get(key) or values.get(key) or fallback).strip()
    config = {'accountId': setting('CLOUDFLARE_ACCOUNT_ID', legacy.get('accountId', '')),
              'projectName': setting('CLOUDFLARE_PAGES_PROJECT', legacy.get('projectName', '')),
              'credentialStorage': 'windows-encrypted' if saved else 'environment' if os.environ.get('CLOUDFLARE_API_TOKEN') else 'env-import' if values.get('CLOUDFLARE_API_TOKEN') else 'unset'}
    if error: config['credentialError'] = error
    return config, setting('CLOUDFLARE_API_TOKEN')


def save_cloudflare_settings(config, token):
    """Encrypt before removing the three optional legacy .env entries."""
    previous, previous_token = cloudflare_settings()
    if previous.get('credentialError') and not token:
        raise ValueError(previous['credentialError'])
    values = {'CLOUDFLARE_ACCOUNT_ID': config['accountId'],
              'CLOUDFLARE_PAGES_PROJECT': config['projectName'],
              'CLOUDFLARE_API_TOKEN': token or previous_token}
    write_credentials(DATA / 'credentials.dat', values)
    # Read back successfully before touching a user's plaintext import file.
    if read_credentials(DATA / 'credentials.dat') != values:
        raise ValueError('Encrypted settings verification failed. Your .env has been preserved.')
    if ENV_FILE.exists():
        for key in values:
            if key in dotenv_values(ENV_FILE, encoding='utf-8-sig'):
                unset_key(str(ENV_FILE), key, encoding='utf-8-sig')


def identifier():
    return uuid.uuid4().hex

def default_project():
    return {'version': 1, 'name': 'Your name', 'description': '',
        'theme': {'background': '#f5f1e9', 'ink': '#292d29', 'accent': '#798269', 'serif': True, 'wide': False, 'spacious': True, 'rounded': False},
        'assets': [], 'pages': [{'id': identifier(), 'title': 'Selected work', 'slug': 'selected-work', 'blocks': [
            {'id': identifier(), 'type': 'hero', 'label': '', 'title': 'Selected work', 'text': '', 'images': [], 'spreads': [], 'fit': 'contain'},
            {'id': identifier(), 'type': 'sketchbook', 'label': '', 'title': 'Sketchbook', 'text': '', 'images': [], 'fit': 'contain', 'spreads': [
                {'id': identifier(), 'image': '', 'title': 'Page 1', 'caption': '', 'background': '#e8e3d6', 'hard': True, 'fit': 'contain'},
                {'id': identifier(), 'image': '', 'title': 'Page 2', 'caption': '', 'background': '#faf7ef', 'hard': False, 'fit': 'contain'},
                {'id': identifier(), 'image': '', 'title': 'Page 3', 'caption': '', 'background': '#faf7ef', 'hard': False, 'fit': 'contain'},
                {'id': identifier(), 'image': '', 'title': 'Page 4', 'caption': '', 'background': '#e8e3d6', 'hard': True, 'fit': 'contain'}]}]}]}

def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(path)

def load_project():
    return json.loads((DATA / 'project.json').read_text(encoding='utf-8'))

def valid_url(value, media=False):
    if not isinstance(value, str): return False
    if any(c.isspace() for c in value) or '\\' in value: return False
    if not media and (re.fullmatch(r'folio:page:[a-f0-9]{32}(?::block:[a-f0-9]{32})?', value) or re.fullmatch(r'#[a-zA-Z0-9_-]+', value)): return True
    if not media and value.startswith('/') and not value.startswith('//'): return True
    parsed = urllib.parse.urlparse(value)
    return parsed.scheme == 'https' and bool(parsed.netloc)


def validate_styles(values, block=False):
    if not isinstance(values, dict): raise ValueError('Invalid styles.')
    for key, value in values.items():
        field = STYLES['fields'].get(key)
        if not field:
            if not block: continue
            raise ValueError('Unknown block style.')
        if block and field.get('siteOnly'): raise ValueError('Invalid block style.')
        if field['type'] == 'color':
            valid = isinstance(value, str) and bool(COLOR.fullmatch(value))
        elif field['type'] == 'select':
            valid = isinstance(value, str) and value in field['options']
        else:
            valid = type(value) in (int, float) and field['min'] <= value <= field['max']
        if not valid: raise ValueError('Invalid style value: ' + key)


def validate_hidden_text(value, allowed):
    if not isinstance(value, list) or len(value)>len(allowed) or any(not isinstance(field,str) or field not in allowed for field in value) or len(set(value))!=len(value):
        raise ValueError('Invalid removed text areas.')

TEXT_FIELDS={'image':('text',),'gallery':('label','title'),'carousel':('label','title'),'cards':('label','title'),'imageText':('label','title','text'),'cover':('label','title','text'),'sketchbook':('label','title'),'video':('label','title'),'audio':('label','title')}

def validate_project(p):
    if not isinstance(p, dict) or p.get('version') != 1:
        raise ValueError('Unsupported project format.')
    if p.get('presentation', 'portfolio') not in ('portfolio', 'splash'):
        raise ValueError('Invalid portfolio presentation.')
    if not isinstance(p.get('discourageImageDownloads', False), bool):
        raise ValueError('Invalid image download setting.')
    for key in ('name', 'description'):
        if not isinstance(p.get(key), str) or len(p[key]) > 5000:
            raise ValueError('Invalid artist details.')
    theme = p.get('theme', {})
    for key in ('background', 'ink', 'accent'):
        if not COLOR.fullmatch(str(theme.get(key, ''))):
            raise ValueError('Theme colors must be hex colors.')
    for key in ('serif', 'wide', 'spacious', 'rounded'):
        if not isinstance(theme.get(key), bool):
            raise ValueError('Invalid theme option.')
    validate_styles(theme)
    pages = p.get('pages')
    if not isinstance(pages, list) or not 1 <= len(pages) <= 50:
        raise ValueError('A project needs between 1 and 50 pages.')
    ids, slugs = set(), set()
    assets = {a['id'] for a in p.get('assets', [])}
    def check_id(value):
        if not isinstance(value, str) or not re.fullmatch(r'[a-f0-9]{32}', value) or value in ids:
            raise ValueError('Invalid or duplicate item ID.')
        ids.add(value)
    def check_text(item, keys):
        for key in keys:
            if not isinstance(item.get(key), str) or len(item[key]) > 20000:
                raise ValueError('Invalid text content.')
    for page in pages:
        check_id(page.get('id'))
        check_text(page, ('title', 'slug'))
        if 'hideFromNavigation' in page and not isinstance(page['hideFromNavigation'], bool):
            raise ValueError('Invalid page navigation visibility.')
        if not SLUG.fullmatch(page['slug']) or page['slug'] in slugs or page['slug'] in ('media', '_astro', 'folio-assets'):
            raise ValueError('Page URLs must be unique lowercase words separated by hyphens.')
        slugs.add(page['slug'])
        if not isinstance(page.get('blocks'), list) or len(page['blocks']) > 200:
            raise ValueError('Too many blocks.')
        for block in page['blocks']:
            validate_styles(block.get('styles', {}), block=True)
            check_id(block.get('id'))
            if block.get('type') not in BLOCKS:
                raise ValueError('Unknown block type.')
            check_text(block, ('title', 'label', 'text'))
            if 'hiddenText' in block: validate_hidden_text(block['hiddenText'], TEXT_FIELDS.get(block['type'], ()))
            for field in BLOCKS[block['type']]['fields']:
                key = field['key']
                value = block.get(key, BLOCKS[block['type']]['defaults'].get(key))
                if field['type'] == 'checkbox':
                    if not isinstance(value, bool): raise ValueError('Invalid block option.')
                elif field['type'] == 'number':
                    low, high = (2, 4) if key == 'columns' else (0, 600)
                    if type(value) is not int or not low <= value <= high: raise ValueError('Invalid block size.')
                elif not isinstance(value, str) or len(value) > 20000:
                    raise ValueError('Invalid block option.')
                if key == 'url' and value and not valid_url(value, block['type'] in ('video', 'audio')):
                    raise ValueError('Use an HTTPS URL or a relative page link.')
            if 'items' in block:
                if not isinstance(block['items'], list) or len(block['items']) > 100: raise ValueError('Too many block items.')
                for item in block['items']:
                    if not isinstance(item, dict): raise ValueError('Invalid block item.')
                    check_text(item, ('title', 'text', 'url'))
                    if 'hiddenText' in item: validate_hidden_text(item['hiddenText'], ('title','text') if block['type']=='cards' else ())
                    if item['url'] and not valid_url(item['url']): raise ValueError('Invalid item link.')
            if block['type'] == 'freeLayout':
                layers = block.get('layers')
                if not isinstance(layers, list) or len(layers) > 100 or not isinstance(block.get('mobileStack'), bool): raise ValueError('Invalid free layout.')
                seen_layers = set()
                for layer in layers:
                    if not isinstance(layer, dict): raise ValueError('Invalid layer.')
                    check_id(layer.get('id'))
                    if layer['id'] in seen_layers: raise ValueError('Duplicate layer.')
                    seen_layers.add(layer['id'])
                    if layer.get('kind') not in ('image','text') or not isinstance(layer.get('text'), str) or len(layer['text']) > 20000: raise ValueError('Invalid layer content.')
                    if layer.get('assetId') != '' and layer.get('assetId') not in assets: raise ValueError('Unknown layer image.')
                    if layer.get('fit') not in ('contain','cover') or not isinstance(layer.get('opaque'),bool): raise ValueError('Invalid layer appearance.')
                    if any(not COLOR.fullmatch(str(layer.get(k,''))) for k in ('color','background')): raise ValueError('Invalid layer color.')
                    size=layer.get('fontSize')
                    if type(size) not in (int,float) or not 8 <= size <= 160: raise ValueError('Invalid layer text size.')
                    for geometry in [layer] + ([layer['mobile']] if 'mobile' in layer else []):
                        if not isinstance(geometry,dict) or any(type(geometry.get(k)) not in (int,float) or not 0 <= geometry[k] <= 100 for k in ('x','y','w','h')): raise ValueError('Invalid layer bounds.')
                        if geometry['w'] < 5 or geometry['h'] < 5 or geometry['x']+geometry['w'] > 100.01 or geometry['y']+geometry['h'] > 100.01: raise ValueError('Layer outside canvas.')
            if block.get('fit') not in ('contain', 'cover'):
                raise ValueError('Invalid image fit.')
            for key, low, high in (('width', 20, 100), ('height', 120, 1200)):
                if key in block and (type(block[key]) not in (int, float) or not low <= block[key] <= high):
                    raise ValueError('Invalid image size.')
            if not isinstance(block.get('images'), list) or any(i not in assets and not (block['type']=='cards' and i=='') for i in block['images']):
                raise ValueError('Unknown image.')
            if not isinstance(block.get('spreads'), list):
                raise ValueError('Invalid sketchbook pages.')
            for spread in block['spreads']:
                if 'fillPage' in spread and not isinstance(spread['fillPage'], bool):
                    raise ValueError('Invalid sketchbook fill-page setting.')
                check_id(spread.get('id'))
                check_text(spread, ('title', 'caption'))
                if spread.get('image') and spread['image'] not in assets:
                    raise ValueError('Unknown sketchbook image.')
                if not COLOR.fullmatch(str(spread.get('background', ''))) or spread.get('fit') not in ('contain', 'cover') or not isinstance(spread.get('hard'), bool):
                    raise ValueError('Invalid sketchbook page settings.')
    return p

def node_command(script, *args):
    node = shutil.which('node')
    if not node:
        raise ValueError('Install Node.js 22.12 or newer, then restart Folio Studio.')
    path = ROOT / script
    if not path.exists():
        raise ValueError('Dependencies are missing. Run setup.ps1 first.')
    return [node, str(path), *args]

def build_project(project):
    validate_project(project)
    used = {uid for page in project['pages'] for block in page['blocks']
            for uid in [*block['images'], *(spread['image'] for spread in block['spreads']), *(layer['assetId'] for layer in block.get('layers',[]))] if uid}
    project = copy.deepcopy(project)
    project['assets'] = [asset for asset in project['assets'] if asset['id'] in used]
    for asset in project['assets']:
        for size, suffix, field in ((480, '-thumb', 'thumb'), (1200, '-medium', 'medium')):
            ensure_image_variant(asset['id'], size, suffix)
            asset[field] = f"/media/{asset['id']}{suffix}.webp"
    atomic_json(ROOT / 'site/src/project.json', project)
    public = ROOT / 'site/public/media'
    public.mkdir(parents=True, exist_ok=True)
    # Remove stale generated derivatives so unused versions are not published.
    for path in public.iterdir():
        match = re.fullmatch(r'([a-f0-9]{32})(?:-full|-thumb|-medium)?\.webp', path.name)
        if match and (match[1] not in used or project.get('discourageImageDownloads') and path.name.endswith('-full.webp')) and path.is_file() and path.resolve().is_relative_to(public.resolve()):
            path.unlink()
    # Only processed images are published. The original uploads stay in data/originals.
    for asset in project['assets']:
        for key in ('src', 'full', 'thumb', 'medium'):
            if key == 'full' and project.get('discourageImageDownloads'):
                continue
            filename = Path(asset[key]).name
            shutil.copy2(DATA / 'media' / filename, public / filename)
    result = subprocess.run(node_command('node_modules/astro/bin/astro.mjs', 'build', '--root', 'site'), cwd=ROOT,
        capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if result.returncode:
        raise ValueError('Astro build failed:\n' + (result.stdout + result.stderr)[-6000:])
    return result.stdout[-2000:]

def start_job(action, project, config, token):
    if not JOB_LOCK.acquire(blocking=False):
        raise ValueError('A build or publish is already running.')
    JOB.update(state='running', message='Building your Astro portfolio…', url='')
    def work():
        try:
            build_project(project)
            if action == 'publish':
                JOB['message'] = 'Uploading to Cloudflare Pages…'
                env = os.environ.copy()
                env['CLOUDFLARE_ACCOUNT_ID'] = config['accountId']
                env['CLOUDFLARE_API_TOKEN'] = token
                result = subprocess.run(node_command('node_modules/wrangler/bin/wrangler.js', 'pages', 'deploy', 'site/dist',
                    '--project-name', config['projectName'], '--branch', 'main'), cwd=ROOT, env=env,
                    capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300,
                    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                output = (result.stdout + result.stderr).replace(token, '[redacted]')
                if result.returncode:
                    raise ValueError('Cloudflare publish failed:\n' + output[-5000:])
                urls = re.findall(r'https://[a-z0-9.-]+\.pages\.dev', output)
                JOB.update(state='done', message='Your portfolio is published.', url=urls[-1] if urls else '')
            else:
                JOB.update(state='done', message='Astro build complete. The files are in site/dist.', url='/built/')
        except Exception as exc:
            JOB.update(state='error', message=str(exc).replace(token, '[redacted]') if token else str(exc))
        finally:
            JOB_LOCK.release()
    threading.Thread(target=work, daemon=True).start()

def original_image_path(project, uid):
    if not isinstance(uid, str) or not re.fullmatch(r'[a-f0-9]{32}', uid) or not any(a['id'] == uid for a in project['assets']):
        raise ValueError('Unknown image.')
    base = (DATA / 'originals').resolve()
    if not base.is_relative_to(DATA.resolve()): raise ValueError('Invalid original folder.')
    for extension in ('.jpg', '.png', '.webp'):
        path = base / (uid + extension)
        if path.is_file() and path.resolve().is_relative_to(base): return path
    raise ValueError('Original file is unavailable.')


def reveal_image(uid):
    if os.name != 'nt': raise ValueError('Show in File Explorer is available on Windows.')
    with LOCK:
        path = original_image_path(load_project(), uid)
    subprocess.Popen(['explorer.exe', '/select,', str(path)], creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))


def recycle_media_folder(folder):
    # Only a verified staging folder under this application's data can be recycled.
    folder = folder.resolve()
    trash = (DATA / 'trash').resolve()
    if not folder.is_relative_to(DATA.resolve()) or not folder.is_relative_to(trash) or folder == trash:
        raise ValueError('Invalid image recovery folder.')
    if os.name != 'nt': return False
    import ctypes
    class FileOperation(ctypes.Structure):
        _fields_ = [('hwnd', ctypes.c_void_p), ('operation', ctypes.c_uint), ('source', ctypes.c_void_p),
                    ('destination', ctypes.c_void_p), ('flags', ctypes.c_ushort), ('aborted', ctypes.c_int),
                    ('mappings', ctypes.c_void_p), ('title', ctypes.c_wchar_p)]
    names = ctypes.create_unicode_buffer(str(folder) + '\0')
    operation = FileOperation(operation=3, source=ctypes.cast(names, ctypes.c_void_p), flags=0x40 | 0x10 | 0x4 | 0x400)
    api = ctypes.windll.shell32.SHFileOperationW
    api.argtypes = [ctypes.POINTER(FileOperation)]; api.restype = ctypes.c_int
    return api(ctypes.byref(operation)) == 0 and not operation.aborted


def delete_media(uid):
    if not isinstance(uid, str) or not re.fullmatch(r'[a-f0-9]{32}', uid): raise ValueError('Unknown image.')
    if not JOB_LOCK.acquire(blocking=False): raise ValueError('Wait for the build or publish to finish before deleting images.')
    try:
        with LOCK:
            project = load_project()
            asset = next((a for a in project['assets'] if a['id'] == uid), None)
            if not asset: raise ValueError('Unknown image.')
            project['assets'] = [a for a in project['assets'] if a['id'] != uid]
            for other in project['assets']:
                if other.get('parentId') == uid: other.pop('parentId')
            for page in project['pages']:
                for block in page['blocks']:
                    # Cards retain slots so captions/links stay attached to their neighbors.
                    block['images'] = ['' if value == uid else value for value in block['images']] if block['type'] == 'cards' else [value for value in block['images'] if value != uid]
                    for layer in block.get('layers', []):
                        if layer['assetId'] == uid: layer['assetId'] = ''
                    for spread in block['spreads']:
                        if spread['image'] == uid: spread['image'] = ''
            validate_project(project)
            folder = (DATA / 'trash' / ('image-' + uid + '-' + uuid.uuid4().hex)).resolve()
            if not folder.is_relative_to(DATA.resolve()) or not folder.is_relative_to((DATA / 'trash').resolve()): raise ValueError('Invalid recovery folder.')
            folder.mkdir(parents=True)
            moved = []
            try:
                for base, names in ((DATA / 'originals', [uid + ext for ext in ('.jpg', '.png', '.webp')]),
                                    *((base, [uid + suffix + '.webp' for suffix in ('', '-full', '-thumb', '-medium')]) for base in (DATA / 'media', ROOT / 'site/public/media', ROOT / 'site/dist/media'))):
                    base = base.resolve()
                    if not (base.is_relative_to(DATA.resolve()) or base.is_relative_to(ROOT.resolve())):
                        raise ValueError('Invalid image storage folder.')
                    for name in names:
                        source = base / name
                        if source.is_file() and source.resolve().is_relative_to(base):
                            dest = folder / (str(len(moved)) + '-' + name)
                            source.replace(dest); moved.append((source, dest))
                atomic_json(folder / 'image.json', asset)
                atomic_json(DATA / 'project.json', project)
            except Exception:
                for source, dest in reversed(moved):
                    if dest.exists(): dest.replace(source)
                raise
            try:
                recycled = recycle_media_folder(folder)
            except Exception:
                recycled = False  # Retain the recovery folder if the Windows shell is unavailable.
            return {'project': project, 'recycled': recycled,
                    'message': 'Image deleted. Local files moved to the Windows Recycle Bin.' if recycled else 'Image deleted. Recovery files are in ' + str(folder)}
    finally:
        JOB_LOCK.release()


def ensure_image_variant(uid, size, suffix):
    """Small cached derivatives for existing imports as well as new images."""
    if not re.fullmatch(r'[a-f0-9]{32}', uid):
        raise ValueError('Invalid image ID.')
    target = DATA / 'media' / f'{uid}{suffix}.webp'
    if target.is_file(): return target
    source = DATA / 'media' / f'{uid}.webp'
    if not source.is_file(): raise FileNotFoundError('Image unavailable.')
    with Image.open(source) as opened:
        img = opened.convert('RGBA' if 'A' in opened.getbands() else 'RGB')
        img.thumbnail((size, size), Image.Resampling.LANCZOS)
        temp = target.with_name(target.name + '.' + uuid.uuid4().hex + '.tmp')
        try:
            img.save(temp, 'WEBP', quality=86, lossless=img.mode == 'RGBA')
            temp.replace(target)
        finally:
            temp.unlink(missing_ok=True)
    return target


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, status, body, mime='application/json', cache='no-store'):
        if mime == 'application/json' and not isinstance(body, (bytes, bytearray)):
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', cache)
        self.end_headers()
        self.wfile.write(body)

    def host_ok(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}')

    def file(self, base, relative):
        path = (base / urllib.parse.unquote(relative)).resolve()
        if not path.is_relative_to(base.resolve()) or not path.is_file():
            return self.reply(404, {'error': 'File not found.'})
        mime = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
        if path.suffix in ('.js', '.mjs'):
            mime = 'text/javascript'
        content = path.read_bytes()
        if path.suffix == '.html' and base.resolve() == (ROOT / 'site/dist').resolve():
            content = content.replace(b'href="/', b'href="/built/')
        cache = 'public, max-age=31536000, immutable' if base.resolve() == (DATA / 'media').resolve() else 'no-store'
        self.reply(200, content, mime, cache)

    def do_GET(self):
        if not self.host_ok():
            return self.reply(403, {'error': 'Invalid host.'})
        path = urllib.parse.urlparse(self.path).path
        variant = re.fullmatch(r'/media/([a-f0-9]{32})-(thumb|medium)\.webp', path)
        if variant:
            try:
                ensure_image_variant(variant[1], 480 if variant[2] == 'thumb' else 1200, '-' + variant[2])
            except (FileNotFoundError, OSError):
                return self.reply(404, {'error': 'Image unavailable.'})
        if path == '/':
            return self.reply(200, (ROOT / 'ui/index.html').read_text(encoding='utf-8').replace('__TOKEN__', TOKEN), 'text/html; charset=utf-8')
        if path == '/api/project':
            with LOCK:
                return self.reply(200, load_project())
        if path == '/api/instance':
            return self.reply(200, {'appId': hashlib.sha256(str(ROOT.resolve()).rstrip('\\').lower().encode()).hexdigest(),
                'pid': os.getpid(), 'version': json.loads((ROOT / 'package.json').read_text())['version']})
        if path == '/api/backups':
            with LOCK:
                return self.reply(200, {'keep': backups.retention(DATA), 'items': backups.inventory(DATA),
                    'portfolioKeep': backups.retention(DATA, 'portfolio'), 'portfolioItems': backups.inventory(DATA, 'portfolio')})
        if path == '/api/updates':
            try:
                return self.reply(200, check_update(ROOT, refresh='refresh=1' in self.path))
            except Exception:
                return self.reply(200, {'error': 'Could not check updates. Check internet access and try again.'})
        if path == '/api/config':
            config, token = cloudflare_settings()
            config['hasToken'] = bool(token)
            return self.reply(200, config)
        if path == '/api/job':
            return self.reply(200, JOB.copy())
        if path == '/vendor/page-flip.js':
            return self.file(ROOT / 'node_modules/page-flip/dist/js', 'page-flip.browser.js')
        vendors = {'/vendor/cropper.js': ('cropperjs/dist', 'cropper.esm.js'),
                   '/vendor/pica.js': ('pica/dist', 'pica.min.mjs'),
                   '/vendor/magic-wand.js': ('magic-wand-tool/dist', 'magic-wand.js')}
        if path in vendors:
            folder, filename = vendors[path]
            return self.file(ROOT / 'node_modules' / folder, filename)
        if path.startswith('/api/original/'):
            uid = path.removeprefix('/api/original/')
            if not re.fullmatch(r'[a-f0-9]{32}', uid) or not any(a['id'] == uid for a in load_project()['assets']):
                return self.reply(404, {'error': 'Unknown image.'})
            for extension in ('.jpg', '.png', '.webp'):
                if (DATA / 'originals' / (uid + extension)).is_file():
                    return self.file(DATA / 'originals', uid + extension)
            return self.reply(404, {'error': 'Original unavailable.'})
        for prefix, base in (('/ui/', ROOT / 'ui'), ('/shared/', ROOT / 'shared'), ('/media/', DATA / 'media'), ('/built/', ROOT / 'site/dist'), ('/folio-assets/', ROOT / 'site/dist/folio-assets')):
            if path.startswith(prefix):
                relative = path[len(prefix):]
                if prefix == '/built/' and (not relative or relative.endswith('/')):
                    relative += 'index.html'
                return self.file(base, relative)
        # Absolute asset URLs in the built Astro preview.
        if path.startswith('/_astro/'):
            return self.file(ROOT / 'site/dist/_astro', path[len('/_astro/'):])
        if path.endswith('/'):
            return self.file(ROOT / 'site/dist', path.lstrip('/') + 'index.html')
        self.reply(404, {'error': 'Not found.'})

    def do_POST(self):
        if not self.host_ok() or not secrets.compare_digest(self.headers.get('X-Folio-Token', ''), TOKEN):
            return self.reply(403, {'error': 'Invalid local editor session. Reload the editor.', 'code': 'session_expired'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 60 * 1024 * 1024:
                raise ValueError('Upload limit is 60 MB.')
            body = self.rfile.read(length)
            path = urllib.parse.urlparse(self.path).path
            if path == '/api/upload':
                return self.upload(body)
            value = json.loads(body)
            if path.startswith('/api/backups/'):
                if not JOB_LOCK.acquire(blocking=False): raise ValueError('Wait for the current build or publish to finish.')
                try:
                    with LOCK:
                        kind = value.get('kind', 'code')
                        backups.backup_root(DATA, kind)
                        if path == '/api/backups/settings':
                            keep = value.get('keep')
                            if type(keep) is not int or keep not in backups.KEEP_CHOICES: raise ValueError('Invalid backup retention choice.')
                            settings = {'keep': backups.retention(DATA), 'portfolioKeep': backups.retention(DATA, 'portfolio')}
                            settings['keep' if kind == 'code' else 'portfolioKeep'] = keep
                            atomic_json(DATA / 'backup-settings.json', settings)
                            results = backups.prune(DATA, recycle_media_folder, kind)
                        elif path == '/api/backups/delete':
                            results = [backups.remove(DATA, value.get('id'), recycle_media_folder, kind)]
                        elif path == '/api/backups/reveal':
                            uid = value.get('id')
                            if uid not in {item['id'] for item in backups.inventory(DATA, kind)}: raise ValueError('Unknown backup.')
                            if os.name != 'nt': raise ValueError('File Explorer is available on Windows.')
                            subprocess.Popen(['explorer.exe', str(backups.backup_root(DATA, kind) / uid)])
                            results = []
                        else: raise ValueError('Unknown backup action.')
                    return self.reply(200, {'ok': True, 'recoveryFolders': [r['recoveryFolder'] for r in results if not r['recycled']]})
                finally:
                    JOB_LOCK.release()
            if path == '/api/media/reveal':
                reveal_image(value.get('id'))
                return self.reply(200, {'ok': True})
            if path == '/api/media/delete':
                if value.get('confirmed') is not True: raise ValueError('Confirm image deletion first.')
                return self.reply(200, delete_media(value.get('id')))
            if path == '/api/project':
                with LOCK:
                    stored_assets = load_project()['assets']
                    incoming = {a['id']: a for a in value.get('assets', [])}
                    for asset in stored_assets:
                        update = incoming.get(asset['id'], {})
                        for field in ('name', 'alt'):
                            if field in update:
                                if not isinstance(update[field], str) or len(update[field]) > 1000:
                                    raise ValueError('Invalid image description.')
                                asset[field] = update[field]
                        if 'archived' in update:
                            if not isinstance(update['archived'], bool): raise ValueError('Invalid archive setting.')
                            asset['archived'] = update['archived']
                    value['assets'] = stored_assets
                    validate_project(value)
                    atomic_json(DATA / 'project.json', value)
                return self.reply(200, {'ok': True})
            if path == '/api/update':
                if JOB_LOCK.locked():
                    raise ValueError('Wait for the build or publish to finish before updating.')
                update = check_update(ROOT, refresh=True)
                if not update['managed']:
                    raise ValueError('This is a development checkout. Use Git to update it.')
                if not update['available']:
                    raise ValueError('Folio Studio is already up to date.')
                if os.name != 'nt':
                    raise ValueError('The automatic installer supports Windows only.')
                subprocess.Popen(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
                    '-File', str(ROOT / 'Update.ps1'), '-WaitForProcessId', str(os.getpid())], cwd=ROOT,
                    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                self.reply(202, {'ok': True})
                threading.Thread(target=self.server.shutdown, daemon=True).start()
                return
            if path == '/api/config':
                config = {'accountId': value.get('accountId', '').strip(), 'projectName': value.get('projectName', '').strip()}
                if config['accountId'] and not re.fullmatch(r'[a-f0-9]{32}', config['accountId']):
                    raise ValueError('Cloudflare account ID must be 32 lowercase hex characters.')
                if config['projectName'] and not SLUG.fullmatch(config['projectName']):
                    raise ValueError('Use lowercase words and hyphens for the Pages project name.')
                with LOCK:
                    save_cloudflare_settings(config, value.get('token', '').strip())
                    atomic_json(DATA / 'cloudflare.json', config)
                return self.reply(200, {'ok': True})
            if path in ('/api/build', '/api/publish'):
                config, token = cloudflare_settings()
                if path.endswith('publish') and not (config.get('accountId') and config.get('projectName') and token):
                    raise ValueError('Add your Cloudflare account ID, existing Pages project name, and API token in Settings first.')
                with LOCK:
                    project = copy.deepcopy(load_project())
                start_job('publish' if path.endswith('publish') else 'build', project, config, token)
                return self.reply(202, {'ok': True})
            if path == '/api/shutdown':
                if JOB_LOCK.locked():
                    raise ValueError('Wait for the current build or publish to finish first.')
                self.reply(200, {'ok': True})
                threading.Thread(target=self.server.shutdown, daemon=True).start()
                return
            self.reply(404, {'error': 'Not found.'})
        except (ValueError, KeyError, TypeError, UnidentifiedImageError, Image.DecompressionBombError) as exc:
            self.reply(400, {'error': str(exc)})
        except Exception:
            self.reply(500, {'error': 'Local operation failed. Check available disk space and restart the editor.'})

    def upload(self, body):
        source_id = self.headers.get('X-Source-Asset', '')
        if source_id and not any(a['id'] == source_id for a in load_project()['assets']):
            raise ValueError('Unknown source image.')
        with Image.open(io.BytesIO(body)) as opened:
            if opened.format not in ('JPEG', 'PNG', 'WEBP'):
                raise ValueError('Upload a JPEG, PNG, or WebP image.')
            if opened.width * opened.height > 80_000_000:
                raise ValueError('Image exceeds 80 megapixels. Resize the scan first.')
            original_format = opened.format
            oriented = ImageOps.exif_transpose(opened)
            if oriented.mode in ('RGBA', 'LA', 'P'):
                img = oriented.convert('RGBA')
            else:
                img = oriented.convert('RGB')
        uid = identifier()
        original = DATA / 'originals' / (uid + {'JPEG': '.jpg', 'PNG': '.png', 'WEBP': '.webp'}[original_format])
        original.write_bytes(body)
        width, height = img.size
        for size, suffix, quality in ((480, '-thumb', 86), (1200, '-medium', 86), (2400, '', 86), (5000, '-full', 92)):
            resized = img.copy()
            resized.thumbnail((size, size), Image.Resampling.LANCZOS)
            resized.save(DATA / 'media' / f'{uid}{suffix}.webp', 'WEBP', quality=quality,
                         lossless=img.mode == 'RGBA' or original_format == 'PNG')
        name = urllib.parse.unquote(self.headers.get('X-File-Name', 'Artwork'))[:200]
        asset = {'id': uid, 'name': name, 'alt': Path(name).stem, 'width': width, 'height': height,
            'src': f'/media/{uid}.webp', 'full': f'/media/{uid}-full.webp',
            'thumb': f'/media/{uid}-thumb.webp', 'medium': f'/media/{uid}-medium.webp'}
        if source_id:
            asset['parentId'] = source_id
        with LOCK:
            project = load_project()
            project['assets'].append(asset)
            atomic_json(DATA / 'project.json', project)
        self.reply(200, asset)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4873)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    for folder in ('media', 'originals'):
        (DATA / folder).mkdir(parents=True, exist_ok=True)
    if not (DATA / 'project.json').exists():
        atomic_json(DATA / 'project.json', default_project())
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    url = f'http://127.0.0.1:{args.port}'
    print(f'Folio Studio is running at {url}. Close this window to stop it.', flush=True)
    if not args.no_browser:
        threading.Timer(.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
