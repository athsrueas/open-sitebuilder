"""Folio Studio: loopback-only editor and static Astro publisher."""
import argparse
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
from dotenv import dotenv_values, set_key

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
    """Read fresh values so editing .env does not require an app restart."""
    values = dotenv_values(ENV_FILE, encoding='utf-8-sig')
    legacy = json.loads((DATA / 'cloudflare.json').read_text()) if (DATA / 'cloudflare.json').exists() else {}
    def setting(key, fallback=''):
        return (os.environ.get(key) or values.get(key) or fallback).strip()
    return {
        'accountId': setting('CLOUDFLARE_ACCOUNT_ID', legacy.get('accountId', '')),
        'projectName': setting('CLOUDFLARE_PAGES_PROJECT', legacy.get('projectName', '')),
    }, setting('CLOUDFLARE_API_TOKEN')

def save_cloudflare_settings(config, token):
    """Keep credentials in the private root .env, outside the generated site."""
    ENV_FILE.parent.mkdir(parents=True, exist_ok=True)
    for key, value in (('CLOUDFLARE_ACCOUNT_ID', config['accountId']),
                       ('CLOUDFLARE_PAGES_PROJECT', config['projectName'])):
        set_key(str(ENV_FILE), key, value, quote_mode='always', encoding='utf-8-sig')
    if token:
        set_key(str(ENV_FILE), 'CLOUDFLARE_API_TOKEN', token, quote_mode='always', encoding='utf-8-sig')

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


def validate_project(p):
    if not isinstance(p, dict) or p.get('version') != 1:
        raise ValueError('Unsupported project format.')
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
        if not SLUG.fullmatch(page['slug']) or page['slug'] in slugs or page['slug'] in ('media', '_astro'):
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
                    if item['url'] and not valid_url(item['url']): raise ValueError('Invalid item link.')
            if block.get('fit') not in ('contain', 'cover'):
                raise ValueError('Invalid image fit.')
            for key, low, high in (('width', 20, 100), ('height', 120, 1200)):
                if key in block and (type(block[key]) not in (int, float) or not low <= block[key] <= high):
                    raise ValueError('Invalid image size.')
            if not isinstance(block.get('images'), list) or any(i not in assets and not (block['type']=='cards' and i=='') for i in block['images']):
                raise ValueError('Unknown image.')
            if not isinstance(block.get('spreads'), list) or len(block['spreads']) > 200:
                raise ValueError('Too many sketchbook pages.')
            for spread in block['spreads']:
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
            for uid in [*block['images'], *(spread['image'] for spread in block['spreads'])] if uid}
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
        if match and match[1] not in used and path.is_file() and path.resolve().is_relative_to(public.resolve()):
            path.unlink()
    # Only processed images are published. The original uploads stay in data/originals.
    for asset in project['assets']:
        for key in ('src', 'full', 'thumb', 'medium'):
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
        for prefix, base in (('/ui/', ROOT / 'ui'), ('/shared/', ROOT / 'shared'), ('/media/', DATA / 'media'), ('/built/', ROOT / 'site/dist')):
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
            return self.reply(403, {'error': 'Invalid local editor session. Reload the editor.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 60 * 1024 * 1024:
                raise ValueError('Upload limit is 60 MB.')
            body = self.rfile.read(length)
            path = urllib.parse.urlparse(self.path).path
            if path == '/api/upload':
                return self.upload(body)
            value = json.loads(body)
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
