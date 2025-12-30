# Real-Time Doubt Solving Chatbot

## Setup Instructions

### 1. Backend Setup
1. Navigate to `backend/`
2. Install dependencies: `pip install -r requirements.txt`
3. Setup Database: Create MySQL DB `doubt_solving_chatbot`
4. Update `.env` with your API Keys and DB credentials.
5. Run Server: `uvicorn app.main:app --reload`

### 2. Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Run App: `npm start`

## Features
- Role-based access (Student, Tutor, Admin)
- AI-powered answers (Google Gemini 2.0)
- Voice & Image Input support
- Real-time escalation to human tutors
- Admin Analytics Dashboard
