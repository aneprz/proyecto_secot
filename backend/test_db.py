from app.db import get_connection
try:
    with get_connection() as conn:
        print('Conexión exitosa')
        with conn.cursor() as cur:
            cur.execute("select to_regclass('usuario');")
            result = cur.fetchone()
            print('Tabla usuario existe:', result[0] is not None)
except Exception as e:
    print('Error de conexión:', e)