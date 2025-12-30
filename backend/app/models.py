from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from .database import Base

# 1. Student Table
class Student(Base):
    __tablename__ = "student"
    student_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=func.now())

# 2. Tutor Table
class Tutor(Base):
    __tablename__ = "tutor"
    tutor_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=func.now())

# 3. Admin Table
class Admin(Base):
    __tablename__ = "admin"
    admin_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=func.now())

# 4. Session Table
class Session(Base):
    __tablename__ = "session"
    session_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student.student_id"), nullable=False)
    started_at = Column(DateTime, default=func.now())
    ended_at = Column(DateTime, nullable=True)
    queries = relationship("Query", backref="session")

# 5. Query Table
class Query(Base):
    __tablename__ = "query"
    query_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("session.session_id"), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    status = Column(String(20), default="pending")
    answers = relationship("Answer", backref="query")

# 6. Answer Table
class Answer(Base):
    __tablename__ = "answer"
    answer_id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("query.query_id"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("tutor.tutor_id"), nullable=True) 
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=func.now())
    is_ai = Column(Integer, default=0) 

# 7. Escalation Table
class Escalation(Base):
    __tablename__ = "escalation"
    escalation_id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("query.query_id"), nullable=False)
    tutor_id = Column(Integer, ForeignKey("tutor.tutor_id"), nullable=True)
    escalated_at = Column(DateTime, default=func.now())
    status = Column(String(20), default="pending")

# 8. Feedback Table
class Feedback(Base):
    __tablename__ = "feedback"
    feedback_id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("answer.answer_id"), nullable=False)
    student_id = Column(Integer, ForeignKey("student.student_id"), nullable=False)
    rating = Column(Integer, nullable=False) 
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())