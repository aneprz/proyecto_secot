# Debug login logic
from app.settings import settings
from app.db import get_connection
from app.auth import verify_password

print('=== DEBUG LOGIN ===')
print('Username from request: admin')
print('Password from request: admin')
print('AUTH_USERNAME from settings:', repr(settings.auth_username))
print('AUTH_PASSWORD_HASH from settings:', repr(settings.auth_password_hash))

# Simular _usuario_table_exists
try:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("select to_regclass('usuario');")
            result = cur.fetchone()
            table_exists = result[0] is not None
            print('Tabla usuario existe:', table_exists)
except Exception as e:
    print('Error checking table:', e)
    table_exists = False

print('table_exists:', table_exists)

if table_exists:
    print('Intentando login por BD...')
else:
    print('Usando bootstrap auth...')
    print('Username matches:', 'admin' == settings.auth_username)
    print('Password hash exists:', bool(settings.auth_password_hash))
    if settings.auth_password_hash:
        password_valid = verify_password('admin', settings.auth_password_hash)
        print('Password valid:', password_valid)