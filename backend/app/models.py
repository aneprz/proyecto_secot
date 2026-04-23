from datetime import date
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field


class SeniorBase(BaseModel):
    nombre: Annotated[str, Field(min_length=1, max_length=120)]
    apellidos: Annotated[str, Field(min_length=1, max_length=160)]
    email: EmailStr | None = None
    movil: Annotated[str | None, Field(max_length=30)] = None
    fecha_alta: date | None = None
    activo: bool = True


class SeniorCreate(SeniorBase):
    pass


class SeniorUpdate(BaseModel):
    nombre: Annotated[str | None, Field(min_length=1, max_length=120)] = None
    apellidos: Annotated[str | None, Field(min_length=1, max_length=160)] = None
    email: EmailStr | None = None
    movil: Annotated[str | None, Field(max_length=30)] = None
    fecha_alta: date | None = None
    activo: bool | None = None


class SeniorOut(SeniorBase):
    senior_id: int

