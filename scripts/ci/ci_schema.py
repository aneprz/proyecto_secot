import os
import psycopg

conn = psycopg.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

cur.execute('''
create table if not exists senior (
  senior_id bigserial primary key,
  nombre varchar(120) not null,
  apellido1 varchar(80) not null,
  apellido2 varchar(80) not null,
  email_personal varchar(254),
  email_secot varchar(254),
  movil varchar(30),
  fecha_alta date,
  activo boolean not null default true
);
''')
cur.execute("select 1 from pg_constraint where conname = 'uq_senior_email_personal'")
if cur.fetchone() is None:
    cur.execute('alter table senior add constraint uq_senior_email_personal unique (email_personal)')
cur.execute("select 1 from pg_constraint where conname = 'uq_senior_email_secot'")
if cur.fetchone() is None:
    cur.execute('alter table senior add constraint uq_senior_email_secot unique (email_secot)')

cur.execute('''
create table if not exists grupo (
  grupo_id bigserial primary key,
  nombre_grupo varchar(160) not null,
  descripcion text,
  color_hex varchar(7),
  canal_teams varchar(255),
  responsable_senior_id bigint,
  activo boolean not null default true
);
''')
cur.execute("select 1 from pg_constraint where conname = 'uq_grupo_nombre_grupo'")
if cur.fetchone() is None:
    cur.execute('alter table grupo add constraint uq_grupo_nombre_grupo unique (nombre_grupo)')

cur.execute('''
create table if not exists centro (
  centro_id bigserial primary key,
  nombre_centro varchar(200) not null,
  tipo_centro varchar(80),
  direccion varchar(255),
  municipio varchar(120),
  responsable_centro varchar(200),
  email_responsable varchar(254),
  telefono_responsable varchar(30),
  observaciones text,
  activo boolean not null default true
);
''')

cur.execute('''
create table if not exists actividad (
  actividad_id bigserial primary key,
  grupo_id bigint not null,
  centro_id bigint not null,
  titulo_actividad varchar(200) not null,
  descripcion text,
  tipo_actividad varchar(80),
  senior_responsable_actividad_id bigint,
  estado_actividad varchar(60),
  fecha_inicio_prevista date,
  fecha_fin_prevista date,
  activo boolean not null default true
);
''')
cur.execute("select 1 from pg_constraint where conname = 'fk_actividad_grupo' and conrelid = 'actividad'::regclass")
if cur.fetchone() is None:
    cur.execute('alter table actividad add constraint fk_actividad_grupo foreign key (grupo_id) references grupo (grupo_id) on delete restrict')
cur.execute("select 1 from pg_constraint where conname = 'fk_actividad_centro' and conrelid = 'actividad'::regclass")
if cur.fetchone() is None:
    cur.execute('alter table actividad add constraint fk_actividad_centro foreign key (centro_id) references centro (centro_id) on delete restrict')

cur.execute('''
create table if not exists usuario (
  usuario_id bigserial primary key,
  username varchar(80) not null,
  email varchar(254),
  password_hash text not null,
  rol varchar(30) not null default 'user',
  senior_id bigint,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  ultimo_login_en timestamptz
);
''')
cur.execute("select 1 from pg_constraint where conname = 'uq_usuario_username'")
if cur.fetchone() is None:
    cur.execute('alter table usuario add constraint uq_usuario_username unique (username)')
cur.execute("select 1 from pg_constraint where conname = 'uq_usuario_email'")
if cur.fetchone() is None:
    cur.execute('alter table usuario add constraint uq_usuario_email unique (email)')

conn.commit()
cur.close()
conn.close()
