from datetime import date, datetime, time
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
    delegacion_id: int | None = None
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
    delegacion_id: int | None = None
    activo: bool | None = None


class SeniorOut(SeniorBase):
    senior_id: int


class UsuarioBase(BaseModel):
    username: Annotated[str, Field(min_length=3, max_length=80)]
    email: EmailStr | None = None
    rol: Annotated[str, Field(max_length=30)] = "read"  # read, write, admin
    senior_id: int | None = None
    delegacion_id: int | None = None
    activo: bool = True


class UsuarioCreate(UsuarioBase):
    password: Annotated[str, Field(min_length=8, max_length=200)]


class UsuarioUpdate(BaseModel):
    email: EmailStr | None = None
    rol: Annotated[str | None, Field(max_length=30)] = None
    senior_id: int | None = None
    delegacion_id: int | None = None
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
    delegacion_id: int | None = None
    activo: bool = True


class GrupoCreate(GrupoBase):
    pass


class GrupoUpdate(BaseModel):
    nombre_grupo: Annotated[str | None, Field(min_length=1, max_length=160)] = None
    descripcion: str | None = None
    color_hex: Annotated[str | None, Field(max_length=7)] = None
    canal_teams: Annotated[str | None, Field(max_length=255)] = None
    responsable_senior_id: int | None = None
    delegacion_id: int | None = None
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
    delegacion_id: int | None = None
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
    delegacion_id: int | None = None
    observaciones: Annotated[str | None, Field(max_length=2000)] = None
    activo: bool | None = None


class CentroOut(CentroBase):
    centro_id: int


class DelegacionBase(BaseModel):
    codigo: Annotated[str, Field(min_length=1, max_length=80)]
    nombre: Annotated[str, Field(min_length=1, max_length=200)]
    activo: bool = True


class DelegacionCreate(DelegacionBase):
    pass


class DelegacionUpdate(BaseModel):
    codigo: Annotated[str | None, Field(min_length=1, max_length=80)] = None
    nombre: Annotated[str | None, Field(min_length=1, max_length=200)] = None
    activo: bool | None = None


class DelegacionOut(DelegacionBase):
    delegacion_id: int


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
    delegacion_id: int | None = None
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
    delegacion_id: int | None = None
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


class ActividadSeniorBase(BaseModel):
    actividad_id: int
    senior_id: int
    rol_en_actividad: Annotated[str | None, Field(max_length=80)] = None
    fecha_alta: date | None = None
    fecha_baja: date | None = None
    activo: bool = True


class ActividadSeniorCreate(ActividadSeniorBase):
    pass


class ActividadSeniorUpdate(BaseModel):
    actividad_id: int | None = None
    senior_id: int | None = None
    rol_en_actividad: Annotated[str | None, Field(max_length=80)] = None
    fecha_alta: date | None = None
    fecha_baja: date | None = None
    activo: bool | None = None


class ActividadSeniorOut(ActividadSeniorBase):
    actividad_senior_id: int


class SesionBase(BaseModel):
    actividad_id: int
    grupo_id: int
    centro_id: int
    fecha: date
    hora_inicio: time | None = None
    hora_fin: time | None = None
    duracion_horas: float | None = None
    titulo_sesion: Annotated[str | None, Field(max_length=200)] = None
    ubicacion: Annotated[str | None, Field(max_length=255)] = None
    estado_sesion: Annotated[str | None, Field(max_length=60)] = None
    observaciones: str | None = None
    es_visible_calendario: bool = True
    activo: bool = True


class SesionCreate(SesionBase):
    pass


class SesionUpdate(BaseModel):
    actividad_id: int | None = None
    grupo_id: int | None = None
    centro_id: int | None = None
    fecha: date | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    duracion_horas: float | None = None
    titulo_sesion: Annotated[str | None, Field(max_length=200)] = None
    ubicacion: Annotated[str | None, Field(max_length=255)] = None
    estado_sesion: Annotated[str | None, Field(max_length=60)] = None
    observaciones: str | None = None
    es_visible_calendario: bool | None = None
    activo: bool | None = None


class SesionOut(SesionBase):
    sesion_id: int
