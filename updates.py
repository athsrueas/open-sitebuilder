"""Public repository update metadata; never sends publishing credentials."""
import json
import re
import time
import urllib.request
from pathlib import Path

REPOSITORY = 'athsrueas/open-sitebuilder'
_cache = None

def version_tuple(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d+\.\d+\.\d+', value):
        raise ValueError('Unexpected update version.')
    return tuple(map(int, value.split('.')))

def fetch_json(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'FolioStudio-update-check', 'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=8) as response:
        content = response.read(1_000_001)
    if len(content) > 1_000_000:
        raise ValueError('Update response is too large.')
    return json.loads(content)

def check_update(root, refresh=False):
    global _cache
    current = json.loads((Path(root) / 'package.json').read_text())['version']
    if not refresh and _cache and time.monotonic() - _cache[0] < 900:
        return {**_cache[1], 'current': current, 'managed': not (Path(root) / '.git').exists()}
    commit = fetch_json(f'https://api.github.com/repos/{REPOSITORY}/commits/main')['sha']
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('Unexpected update commit.')
    latest = fetch_json(f'https://raw.githubusercontent.com/{REPOSITORY}/{commit}/package.json')['version']
    result = {'current': current, 'latest': latest, 'available': version_tuple(latest) > version_tuple(current),
              'commit': commit, 'managed': not (Path(root) / '.git').exists(),
              'url': f'https://github.com/{REPOSITORY}/commits/main'}
    _cache = (time.monotonic(), result)
    return result
