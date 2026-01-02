from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import os
from dotenv import load_dotenv

from . import models, schemas, nlp_engine
from .database import engine, get_db

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))


models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Real-Time Doubt Solving Chatbot")


origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def get_password_hash(password): return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

  
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None: raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    user = None
    if role == "student":
        user = db.query(models.Student).filter(models.Student.email == email).first()
    elif role == "tutor":
        user = db.query(models.Tutor).filter(models.Tutor.email == email).first()
    elif role == "admin":
        user = db.query(models.Admin).filter(models.Admin.email == email).first()
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    

    user.role = role 
    return user

@app.get("/")
def read_root():
    return {
        "status": "online", 
        "message": "Real-Time Doubt Solving Bot API is running!", 
        "docs": "/docs"
    }

@app.post("/register/{role}", response_model=schemas.UserResponse)
def register_user(role: str, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    hashed_pw = get_password_hash(user_data.password)
    
    if role == "student":
        if db.query(models.Student).filter(models.Student.email == user_data.email).first():
            raise HTTPException(status_code=400, detail="Email registered")
        new_user = models.Student(name=user_data.name, email=user_data.email, password=hashed_pw)
        db.add(new_user); db.commit(); db.refresh(new_user)
        return {"id": new_user.student_id, "name": new_user.name, "email": new_user.email, "role": "student"}

    elif role == "tutor":
        if db.query(models.Tutor).filter(models.Tutor.email == user_data.email).first():
            raise HTTPException(status_code=400, detail="Email registered")
        if not user_data.subject: user_data.subject = "General"
        new_user = models.Tutor(name=user_data.name, email=user_data.email, password=hashed_pw, subject=user_data.subject)
        db.add(new_user); db.commit(); db.refresh(new_user)
        return {"id": new_user.tutor_id, "name": new_user.name, "email": new_user.email, "role": "tutor"}

    elif role == "admin":
        if db.query(models.Admin).filter(models.Admin.email == user_data.email).first():
            raise HTTPException(status_code=400, detail="Email registered")
        new_user = models.Admin(name=user_data.name, email=user_data.email, password=hashed_pw)
        db.add(new_user); db.commit(); db.refresh(new_user)
        return {"id": new_user.admin_id, "name": new_user.name, "email": new_user.email, "role": "admin"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid role. Use 'student', 'tutor', or 'admin'.")

@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form_data.username
    password = form_data.password
    

    student = db.query(models.Student).filter(models.Student.email == email).first()
    if student and verify_password(password, student.password):
        token = create_access_token(data={"sub": email, "role": "student"})
        return {"access_token": token, "token_type": "bearer", "role": "student"}

    tutor = db.query(models.Tutor).filter(models.Tutor.email == email).first()
    if tutor and verify_password(password, tutor.password):
        token = create_access_token(data={"sub": email, "role": "tutor"})
        return {"access_token": token, "token_type": "bearer", "role": "tutor"}


    admin = db.query(models.Admin).filter(models.Admin.email == email).first()
    if admin and verify_password(password, admin.password):
        token = create_access_token(data={"sub": email, "role": "admin"})
        return {"access_token": token, "token_type": "bearer", "role": "admin"}

    raise HTTPException(status_code=401, detail="Incorrect credentials")



@app.post("/query", response_model=schemas.QueryResponse)
def submit_query(
    query_in: schemas.QueryCreate, 
    user: models.Student = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can ask queries")

    session = db.query(models.Session).filter(
        models.Session.student_id == user.student_id, 
        models.Session.ended_at == None
    ).first()

    if not session:
        session = models.Session(student_id=user.student_id)
        db.add(session); db.commit(); db.refresh(session)

    recent_queries = db.query(models.Query).filter(
        models.Query.session_id == session.session_id
    ).order_by(models.Query.timestamp.desc()).limit(3).all()

    context_history = []
    for q in reversed(recent_queries):
        context_history.append({"is_user": True, "content": q.content})
        ans = db.query(models.Answer).filter(models.Answer.query_id == q.query_id).first()
        if ans:
            context_history.append({"is_user": False, "content": ans.content})
  


    new_query = models.Query(session_id=session.session_id, content=query_in.content, status="answered")
    db.add(new_query); db.commit(); db.refresh(new_query)


    ai_text = nlp_engine.generate_answer(
        query_in.content, 
        query_in.image, 
        context_history  
    )
    
    new_answer = models.Answer(
        query_id=new_query.query_id, 
        content=ai_text, 
        is_ai=1
    )
    db.add(new_answer); db.commit()

    return {
        "query_id": new_query.query_id,
        "content": new_query.content,
        "status": new_query.status,
        "timestamp": new_query.timestamp,
        "answers": [{"answer_id": new_answer.answer_id, "content": ai_text, "tutor_id": None, "timestamp": new_answer.timestamp}]
    }


@app.post("/escalate/{query_id}")
def escalate_query(query_id: int, user: models.Student = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "student": raise HTTPException(status_code=403, detail="Forbidden")

    query = db.query(models.Query).filter(models.Query.query_id == query_id).first()
    if not query: raise HTTPException(status_code=404, detail="Query not found")

    query.status = "escalated"
    esc = models.Escalation(query_id=query_id)
    db.add(esc)
    db.commit()

    return {"message": "Query escalated to human tutor successfully."}



@app.get("/tutor/pending")
def get_pending_queries(user: models.Tutor = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "tutor": raise HTTPException(status_code=403, detail="Forbidden")
    queries = db.query(models.Query).filter(models.Query.status == "escalated").all()
    return queries

@app.post("/tutor/answer")
def tutor_answer(data: schemas.TutorAnswerCreate, user: models.Tutor = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "tutor": raise HTTPException(status_code=403, detail="Forbidden")

    answer = models.Answer(
        query_id=data.query_id,
        tutor_id=user.tutor_id,
        content=data.content,
        is_ai=0
    )
    db.add(answer)

    query = db.query(models.Query).filter(models.Query.query_id == data.query_id).first()
    query.status = "resolved"
    
    esc = db.query(models.Escalation).filter(models.Escalation.query_id == data.query_id).first()
    if esc: esc.status = "resolved"

    db.commit()
    return {"message": "Answer submitted"}



@app.post("/feedback")
def submit_feedback(fb: schemas.FeedbackCreate, user: models.Student = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "student": raise HTTPException(status_code=403, detail="Forbidden")

    feedback = models.Feedback(
        answer_id=fb.answer_id,
        student_id=user.student_id,
        rating=fb.rating,
        comment=fb.comment
    )
    db.add(feedback)
    db.commit()
    return {"message": "Feedback received"}



@app.get("/history", response_model=List[schemas.SessionHistory])
def get_history(user: models.Student = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "student": raise HTTPException(status_code=403, detail="Forbidden")

    sessions = db.query(models.Session).filter(models.Session.student_id == user.student_id)\
        .options(joinedload(models.Session.queries).joinedload(models.Query.answers))\
        .order_by(models.Session.started_at.desc()).all()
    
    result = []
    for s in sessions:
        queries_data = []
        for q in s.queries:
            q_answers = []
            for a in q.answers:
                q_answers.append({"answer_id": a.answer_id, "content": a.content, "tutor_id": a.tutor_id, "timestamp": a.timestamp})
            
            queries_data.append({
                "query_id": q.query_id,
                "content": q.content,
                "status": q.status,
                "timestamp": q.timestamp,
                "answers": q_answers
            })

        result.append({
            "session_id": s.session_id,
            "started_at": s.started_at,
            "queries": queries_data
        })
    
    return result



@app.get("/admin/stats")
def get_system_stats(user: models.Admin = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(status_code=403, detail="Forbidden")

    total_students = db.query(models.Student).count()
    total_tutors = db.query(models.Tutor).count()
    total_queries = db.query(models.Query).count()
    total_resolved = db.query(models.Query).filter(models.Query.status == "resolved").count()
    total_escalated = db.query(models.Query).filter(models.Query.status == "escalated").count()
    
    return {
        "total_students": total_students,
        "total_tutors": total_tutors,
        "total_queries": total_queries,
        "queries_resolved": total_resolved,
        "queries_escalated": total_escalated
    }



@app.get("/admin/reports")
def get_detailed_reports(user: models.Admin = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(status_code=403, detail="Forbidden")


    escalations = db.query(models.Escalation).order_by(models.Escalation.escalated_at.desc()).limit(10).all()
    escalation_report = []
    for esc in escalations:
        escalation_report.append({
            "query_id": esc.query_id,
            "status": esc.status,
            "escalated_at": esc.escalated_at
        })


    tutors = db.query(models.Tutor).all()
    tutor_performance = []
    for t in tutors:
        ans_count = db.query(models.Answer).filter(models.Answer.tutor_id == t.tutor_id).count()
        tutor_performance.append({
            "tutor_name": t.name,
            "answers_given": ans_count
        })

    students = db.query(models.Student).all()
    student_activity = []
    for s in students:
        q_count = db.query(models.Query).join(models.Session).filter(models.Session.student_id == s.student_id).count()
        if q_count > 0:
            student_activity.append({"name": s.name, "queries": q_count})

    student_activity.sort(key=lambda x: x['queries'], reverse=True)
    student_activity = student_activity[:5]

    return {
        "recent_escalations": escalation_report,
        "tutor_performance": tutor_performance,
        "student_activity": student_activity
    }

@app.get("/admin/users")
def get_all_users(user: models.Admin = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    User Management List (Scope Page 11: Oversight)
    """
    if user.role != "admin": raise HTTPException(status_code=403, detail="Forbidden")
    
    students = db.query(models.Student).all()
    tutors = db.query(models.Tutor).all()
    
    user_list = []
    for s in students:
        user_list.append({"id": s.student_id, "name": s.name, "email": s.email, "role": "Student", "joined": s.created_at})
    for t in tutors:
        user_list.append({"id": t.tutor_id, "name": t.name, "email": t.email, "role": "Tutor", "joined": t.created_at})
        
    return user_list

 
class UserUpdate(schemas.BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None

@app.put("/users/me")
def update_profile(data: UserUpdate, user: models.Student = Depends(get_current_user), db: Session = Depends(get_db)):

    if data.name:
        user.name = data.name
    

    if data.password:
        user.password = get_password_hash(data.password)
    
    db.commit()
    db.refresh(user)
    return {"message": "Profile updated successfully", "name": user.name}

@app.post("/session/new")
def start_new_session(user: models.Student = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "student": 
        raise HTTPException(status_code=403, detail="Forbidden")

    active_session = db.query(models.Session).filter(
        models.Session.student_id == user.student_id,
        models.Session.ended_at == None
    ).first()

    if active_session:
        active_session.ended_at = datetime.now()
        db.commit()

    
    return {"message": "Previous session ended. Ready for new chat."}