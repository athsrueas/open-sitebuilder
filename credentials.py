"""Current-user Windows DPAPI storage. No custom key or plaintext fallback."""
import ctypes
import json
import os
from ctypes import wintypes

class Blob(ctypes.Structure):
    _fields_ = [('size', wintypes.DWORD), ('data', ctypes.POINTER(ctypes.c_ubyte))]

def protect(data, decrypt=False):
    if os.name != 'nt':
        raise ValueError('Encrypted credential storage requires Windows. Use environment variables on other systems.')
    crypt = ctypes.WinDLL('crypt32', use_last_error=True)
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.LocalFree.argtypes = [ctypes.c_void_p]
    kernel.LocalFree.restype = ctypes.c_void_p
    buffer = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
    source, result = Blob(len(data), buffer), Blob()
    function = crypt.CryptUnprotectData if decrypt else crypt.CryptProtectData
    function.argtypes = [ctypes.POINTER(Blob), ctypes.c_void_p if decrypt else wintypes.LPCWSTR,
                        ctypes.POINTER(Blob), ctypes.c_void_p, ctypes.c_void_p,
                        wintypes.DWORD, ctypes.POINTER(Blob)]
    function.restype = wintypes.BOOL
    description = None if decrypt else 'Folio Studio Cloudflare settings'
    if not function(ctypes.byref(source), description, None, None, None, 1, ctypes.byref(result)):
        raise ValueError('Windows could not unlock the saved credentials. Enter the API token again on this Windows account.')
    try:
        return ctypes.string_at(result.data, result.size)
    finally:
        kernel.LocalFree(ctypes.cast(result.data, ctypes.c_void_p))

def read_credentials(path):
    if not path.exists():
        return {}
    try:
        value = json.loads(protect(path.read_bytes(), decrypt=True).decode('utf-8'))
        if not isinstance(value, dict) or any(not isinstance(v, str) for v in value.values()):
            raise ValueError('Invalid credentials')
        return value
    except (OSError, ValueError, UnicodeError):
        raise ValueError('Saved credentials cannot be read on this Windows account. Re-enter your Cloudflare settings.') from None

def write_credentials(path, value):
    encrypted = protect(json.dumps(value).encode('utf-8'))
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    try:
        temporary.write_bytes(encrypted)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
