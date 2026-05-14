from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field


class SeniorBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=120)]
    apellido1: Annotated[str, Field(min_length=1, max_length=80)]
    apellido2: Annotated[str, Field(min_length=1, max_length=80)]
    email_personal: EmailStr | None = None
    email_secot: EmailStr | None = None
    movil: Annotated[str | None, Field(max_length=30)] = None
    fecha_alta: date | None = None
    activo: bool = True


class SeniorCreate(SeniorBase):
    pass


class SeniorUpdate(BaseModel):
    nombre: Annotated[str | None, Field(min_length=1, max_length=120)] = None
    apellido1: Annotated[str | None, Field(min_length=1, max_length=80)] = None
    apellido2: Annotated[str | None, Field(min_length=1, max_length=80)] = None
    email_personal: EmailStr | None = None
    email_secot: EmailStr | None = None
    movil: Annotated[str | None, Field(max_length=30)] = None
    fecha_alta: date | None = None
    activo: bool | None = None


class SeniorOut(SeniorBase):
    senior_id: int


class UsuarioBase(BaseModel):
    username: Annotated[str, Field(min_length=3, max_length=80)]
    email: EmailStr | None = None
    rol: Annotated[str, Field(max_length=30)] = "read"  # read, write, admin
    senior_id: int | None = None
    activo: bool = True


class UsuarioCreate(UsuarioBase):
    password: Annotated[str, Field(min_length=8, max_length=200)]


class UsuarioUpdate(BaseModel):
    email: EmailStr | None = None
    rol: Annotated[str | None, Field(max_length=30)] = None
    senior_id: int | None = None
    activo: bool | None = None
    password: Annotated[str | None, Field(min_length=8, max_length=200)] = None


class UsuarioOut(UsuarioBase):
    usuario_id: int
    creado_en: datetime
    ultimo_login_en: datetime | None = None


class GrupoBase(BaseModel):
    nombre_grupo: Annotated[str, Field(min_length=1, max_length=160)]
    descripcion: str | None = None
    color_hex: Annotated[str | None, Field(max_length=7)] = None
    canal_teams: Annotated[str | None, Field(max_length=255)] = None
    responsable_senior_id: int | None = None
    activo: bool = True


class GrupoCreate(GrupoBase):
    pass


class GrupoUpdate(BaseModel):
    nombre_grupo: Annotated[str | None, Field(min_length=1, max_length=160)] = None
    descripcion: str | None = None
    color_hex: Annotated[str | None, Field(max_length=7)] = None
    canal_teams: Annotated[str | None, Field(max_length=255)] = None
    responsable_senior_id: int | None = None
    activo: bool | None = None


class GrupoOut(GrupoBase):
    grupo_id: int


class CentroBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=200)]
    tipo: Annotated[str | None, Field(max_length=80)] = None
    direccion: Annotated[str | None, Field(max_length=255)] = None
    municipio: Annotated[str | None, Field(max_length=120)] = None
    responsable_centro: Annotated[str | None, Field(max_length=200)] = None
    email_responsable: EmailStr | None = None
    telefono_responsable: Annotated[str | None, Field(max_length=30)] = None
    observaciones: Annotated[str | None, Field(max_length=2000)] = None
    activo: bool = True


class CentroCreate(CentroBase):
    pass


class CentroUpdate(BaseModel):
    nombre: Annotated[str | None, Field(min_length=1, max_length=200)] = None
    tipo: Annotated[str | None, Field(max_length=80)] = None
    direccion: Annotated[str | None, Field(max_length=255)] = None
    municipio: Annotated[str | None, Field(max_length=120)] = None
    responsable_centro: Annotated[str | None, Field(max_length=200)] = None
    email_responsable: EmailStr | None = None
    telefono_responsable: Annotated[str | None, Field(max_length=30)] = None
    observaciones: Annotated[str | None, Field(max_length=2000)] = None
    activo: bool | None = None


class CentroOut(CentroBase):
    centro_id: int


class SeniorGrupoBase(BaseModel):
    senior_id: int
    grupo_id: int
    rol_en_grupo: str | None = None
    fecha_alta: date | None = None
    fecha_baja: date | None = None
    activo: bool = True


class SeniorGrupoCreate(SeniorGrupoBase):
    pass


class SeniorGrupoUpdate(BaseModel):
    rol_en_grupo: str | None = None
    fecha_alta: date | None = None
    fecha_baja: date | None = None
    activo: bool | None = None


class SeniorGrupoOut(SeniorGrupoBase):
    senior_grupo_id: int


class ActividadBase(BaseModel):
    grupo_id: int
    centro_id: int
    titulo_actividad: Annotated[str, Field(min_length=1, max_length=200)]
    descripcion: str | None = None
    tipo_actividad: Annotated[str | None, Field(max_length=80)] = None
    senior_responsable_actividad_id: int | None = None
    estado_actividad: Annotated[str | None, Field(max_length=60)] = None
    fecha_inicio_prevista: date | None = None
    fecha_fin_prevista: date | None = None
    activo: bool = True


class ActividadCreate(ActividadBase):
    pass


class ActividadUpdate(BaseModel):
    grupo_id: int | None = None
    centro_id: int | None = None
    titulo_actividad: Annotated[str | None, Field(min_length=1, max_length=200)] = None
    descripcion: str | None = None
    tipo_actividad: Annotated[str | None, Field(max_length=80)] = None
    senior_responsable_actividad_id: int | None = None
    estado_actividad: Annotated[str | None, Field(max_length=60)] = None
    fecha_inicio_prevista: date | None = None
    fecha_fin_prevista: date | None = None
    activo: bool | None = None


class ActividadOut(ActividadBase):
    actividad_id: int
