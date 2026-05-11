from typing import Optional, List, Any


class BaseModel:
    def __init__(self, **data: Any):
        for key, value in data.items():
            setattr(self, key, value)

    def dict(self):
        return self.__dict__.copy()

    def model_dump(self):
        return self.dict()


class VideoMetadata(BaseModel):
    video_id: str
    title: str
    author: str
    thumbnail_url: str
    duration: float


class OutlineSubPoint(BaseModel):
    text: str
    timestamp: float


class OutlineSection(BaseModel):
    heading: str
    timestamp: float
    summary: str
    sub_points: List[OutlineSubPoint]


class Summaries(BaseModel):
    brief: str
    medium: str
    full: str


class Flashcard(BaseModel):
    front: str
    back: str
    timestamp: float
    source_text: str


class StudyMaterials(BaseModel):
    outline: List[OutlineSection]
    summaries: Summaries
    flashcards: List[Flashcard]


class SearchResult(BaseModel):
    timestamp: float
    text: str
    relevance: str


class ProcessRequest(BaseModel):
    youtube_url: str


class SearchRequest(BaseModel):
    query: str


class TranslateRequest(BaseModel):
    language: str
    content_type: str  # "outline" | "summaries" | "flashcards"
