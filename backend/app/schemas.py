from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

    subject: Optional[str] = None 

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str 

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str 

class LoginRequest(BaseModel):
    username: str
    password: str


class QueryCreate(BaseModel):
    content: str
    image: Optional[str] = None 

class AnswerResponse(BaseModel):
    answer_id: int
    content: str
    tutor_id: Optional[int]
    timestamp: datetime
    class Config:
        from_attributes = True

class QueryResponse(BaseModel):
    query_id: int
    content: str
    status: str
    timestamp: datetime
    answers: List[AnswerResponse] = [] 
    class Config:
        from_attributes = True


class TutorAnswerCreate(BaseModel):
    query_id: int
    content: str


class FeedbackCreate(BaseModel):
    answer_id: int
    rating: int
    comment: Optional[str] = None


class SessionHistory(BaseModel):
    session_id: int
    started_at: datetime
    queries: List[QueryResponse]
    class Config:
        from_attributes = True