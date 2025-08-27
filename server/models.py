from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    kerf_mm: Optional[int] = None
    allow_rotation: bool = True


class Sheet(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    width: int
    height: int
    sequence: int


class Piece(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    width: int
    height: int
    quantity: int


class Placement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id")
    sheet_id: int = Field(foreign_key="sheet.id")
    piece_id: int = Field(foreign_key="piece.id")
    x: int
    y: int
    w: int
    h: int
    rotated: bool = False
