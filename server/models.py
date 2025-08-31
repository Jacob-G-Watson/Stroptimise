from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
import uuid
from datetime import datetime


def guid():
    return str(uuid.uuid4())


class User(SQLModel, table=True):
    id: str = Field(default_factory=guid, primary_key=True)
    name: str
    password: str
    jobs: List["Job"] = Relationship(back_populates="user")
    # todo kerf should be per user


class Job(SQLModel, table=True):
    id: str = Field(default_factory=guid, primary_key=True)
    name: str
    user_id: str = Field(foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="jobs")
    cabinets: List["Cabinet"] = Relationship(back_populates="job")
    placement_groups: List["PlacementGroup"] = Relationship(back_populates="job")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    kerf_mm: Optional[int] = None
    allow_rotation: bool = True
    # todo allow rotation should be moved to the sheet


class Colour(SQLModel, table=True):
    id: str = Field(default_factory=guid, primary_key=True)
    name: str
    pieces: List["Piece"] = Relationship(back_populates="colour")
    sheets: List["Sheet"] = Relationship(back_populates="colour")


class Sheet(SQLModel, table=True):
    id: str = Field(default_factory=guid, primary_key=True)
    name: str
    colour_id: str = Field(foreign_key="colour.id")
    width: int
    height: int
    colour: Optional[Colour] = Relationship(back_populates="sheets")


class Cabinet(SQLModel, table=True):
    id: str = Field(default_factory=guid, primary_key=True)
    name: str
    job_id: str = Field(foreign_key="job.id")
    job: Optional[Job] = Relationship(back_populates="cabinets")
    pieces: List["Piece"] = Relationship(back_populates="cabinet")


class Piece(SQLModel, table=True):
    id: str = Field(default_factory=guid, primary_key=True)
    cabinet_id: str = Field(foreign_key="cabinet.id")
    colour_id: Optional[str] = Field(foreign_key="colour.id")
    name: Optional[str] = None
    width: int = 0
    height: int = 0
    # Optional polygon geometry stored inline as JSON string of [[x, y], ...]
    points_json: Optional[str] = None
    cabinet: Optional[Cabinet] = Relationship(back_populates="pieces")
    colour: Optional[Colour] = Relationship(back_populates="pieces")


class Placement(SQLModel, table=True):
    id: str = Field(default_factory=guid, primary_key=True)
    placement_group_id: str = Field(foreign_key="placement_group.id")
    sheet_id: str = Field(foreign_key="sheet.id")
    piece_id: str = Field(foreign_key="piece.id")
    x: int
    y: int
    w: int
    h: int
    angle: int = 0  # degrees of rotation
    sheet_index: int = 1

    placement_group: Optional["PlacementGroup"] = Relationship(
        back_populates="placements"
    )


class PlacementGroup(SQLModel, table=True):
    __tablename__ = "placement_group"
    id: str = Field(default_factory=guid, primary_key=True)
    optimise_method: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    job_id: Optional[str] = Field(default=None, foreign_key="job.id")
    job: Optional[Job] = Relationship(back_populates="placement_groups")
    placements: List[Placement] = Relationship(back_populates="placement_group")
