"""Separate code backups and verified portfolio snapshots."""
import json
import re
import uuid

BACKUP_NAME = re.compile(r'^\d{8}-\d{6}(?:-[a-f0-9]{8})?$')
KEEP_CHOICES = (0, 1, 3, -1)


def backup_root(data, kind='code'):
    if kind not in ('code', 'portfolio'): raise ValueError('Invalid backup type.')
    return data / 'update-backups' if kind == 'code' else data.parent / 'portfolio-backups'


def inventory(data, kind='code'):
    root = backup_root(data, kind)
    items = []
    parent = data if kind == 'code' else data.parent
    if root.exists() and (root.is_symlink() or root.resolve().parent != parent.resolve()):
        raise ValueError('Invalid backup directory.')
    for folder in root.iterdir() if root.exists() else []:
        if not BACKUP_NAME.fullmatch(folder.name) or not folder.is_dir() or folder.is_symlink() or (hasattr(folder, 'is_junction') and folder.is_junction()):
            continue
        if folder.resolve().parent != root.resolve():
            continue
        files = [p for p in folder.rglob('*') if p.is_file() and not p.is_symlink() and p.resolve().is_relative_to(folder.resolve())]
        try:
            version = json.loads((folder / ('package.json' if kind == 'code' else 'manifest.json')).read_text(encoding='utf-8-sig')).get('version', 'Unknown')
        except (OSError, ValueError):
            version = 'Unknown'
        items.append({'id': folder.name, 'version': str(version), 'bytes': sum(p.stat().st_size for p in files), 'created': folder.stat().st_mtime_ns})
    return sorted(items, key=lambda item: (item['created'], item['id']), reverse=True)


def retention(data, kind='code'):
    backup_root(data, kind)
    try:
        keep = json.loads((data / 'backup-settings.json').read_text(encoding='utf-8-sig'))['keep' if kind == 'code' else 'portfolioKeep']
        return keep if type(keep) is int and keep in KEEP_CHOICES else 1
    except (OSError, ValueError, KeyError, TypeError):
        return 1


def remove(data, backup_id, recycle, kind='code'):
    if not isinstance(backup_id, str) or backup_id not in {item['id'] for item in inventory(data, kind)}:
        raise ValueError('Unknown backup.')
    folder = backup_root(data, kind) / backup_id
    trash = data / 'trash'
    trash.mkdir(parents=True, exist_ok=True)
    if trash.is_symlink() or trash.resolve().parent != data.resolve():
        raise ValueError('Invalid recovery directory.')
    recovery = trash / (kind + '-backup-' + backup_id + '-' + uuid.uuid4().hex)
    folder.replace(recovery)
    try:
        recycled = recycle(recovery)
    except OSError:
        recycled = False
    return {'recycled': recycled, 'recoveryFolder': '' if recycled else str(recovery)}


def prune(data, recycle, kind='code'):
    keep = retention(data, kind)
    if keep == -1:
        return []
    return [remove(data, item['id'], recycle, kind) for item in inventory(data, kind)[keep:]]
