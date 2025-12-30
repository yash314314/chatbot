import React, { useState, useEffect, useRef } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

function Chat() {
  const [history, setHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  

  const [showFeedbackModal, setShowFeedbackModal] = useState(null);
  const [hoverStar, setHoverStar] = useState(0);


  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', password: '' });


  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);


  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/history');
      setHistory(res.data);
  
      if (res.data.length > 0 && currentSession === undefined) { 
        loadSessionMessages(res.data[0]);
      }
    } catch (err) { console.error(err); }
  };

  const loadSessionMessages = (session) => {
    const msgs = [];
    session.queries.forEach(q => {
        msgs.push({ type: 'msg-user', text: q.content, id: q.query_id, status: q.status });
        q.answers.forEach(a => {
            if(!a.tutor_id) { 
                msgs.push({ type: 'msg-ai', text: a.content, id: a.answer_id, query_id: q.query_id });
            }
        });
    });
    setCurrentSession(msgs);
    setActiveTab('chat');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession, loading, selectedImage]);

 
  const handleNewChat = async () => {
      try {

          await api.post('/session/new');
          
          setCurrentSession(null); 
          setInput('');
          setSelectedImage(null);
          
     
          fetchHistory();
      } catch (e) {
          alert("Could not start new chat");
      }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setSelectedImage(reader.result);
        reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;

    const userMessageText = input;
    const imageToSend = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    setLoading(true);
    if(isListening && recognitionRef.current) recognitionRef.current.stop();

  
    const tempUserMsg = { 
        type: 'msg-user', 
        text: userMessageText + (imageToSend ? " [Image Attached]" : ""), 
        id: Date.now(), 
        status: 'sending' 
    };
    
    setCurrentSession(prev => [...(prev || []), tempUserMsg]);

    try {
      await api.post('/query', { content: userMessageText || "Analyze this image", image: imageToSend });
      
      const res = await api.get('/history');
      setHistory(res.data);
  
      if (res.data.length > 0) loadSessionMessages(res.data[0]);
    } catch (error) {
      alert("Error sending message.");
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async (queryId) => {
    if(!window.confirm("Move this to 'Tutor Resolutions'?")) return;
    try {
      await api.post(`/escalate/${queryId}`);
      alert("Moved to Escalations!");
      fetchHistory(); 
    } catch(e) { alert("Failed"); }
  };

  const handleFeedback = async (answerId, rating) => {
    try {
      await api.post('/feedback', { answer_id: answerId, rating: rating, comment: "User rating" });
      alert(`Rated ${rating} stars!`);
      setShowFeedbackModal(null);
      setHoverStar(0);
    } catch(e) { alert("Failed"); }
  };


  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
        await api.put('/users/me', profileData);
        alert("Profile Updated Successfully!");
        setShowProfileModal(false);
        setProfileData({ name: '', password: '' });
    } catch (err) { alert("Failed to update profile."); }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const escalatedQueries = history.flatMap(session => 
    session.queries.filter(q => q.status === 'escalated' || q.status === 'resolved')
  );

  
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (e) => {
        const transcript = Array.from(e.results).map(result => result[0]).map(result => result.transcript).join('');
        setInput(prev => transcript);
      };
      recognition.onerror = (e) => { setIsListening(false); if(e.error === 'not-allowed') alert("Mic denied"); };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleMic = () => {
      if(!recognitionRef.current) return alert("Use Chrome");
      isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
      setIsListening(!isListening);
  }

  return (
    <div className="chat-layout">

      <div className="sidebar">
        <div className="sidebar-header"><span>📚</span> DoubtSolver</div>

        <div style={{padding: '15px 10px 0 10px'}}>
            <button 
                className="btn-primary" 
                style={{background: 'white', color: '#4F46E5', border: '2px solid #4F46E5', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}
                onClick={handleNewChat}
            >
                <span>+</span> New Chat
            </button>
        </div>

        <div className="history-list">
            <div style={{padding:'15px 12px 5px', fontSize:'0.75rem', color:'#94a3b8', fontWeight:'bold'}}>HISTORY</div>
            {history.map(s => (
                <div key={s.session_id} className="history-item" onClick={() => loadSessionMessages(s)}>
                    <div>{new Date(s.started_at).toLocaleDateString()}</div>
                    <div style={{fontSize:'0.8rem', opacity:0.7}}>{s.queries.length} Queries</div>
                </div>
            ))}
        </div>
        
        <div className="sidebar-footer">
            <button className="btn-primary" style={{marginBottom:'10px', background:'#64748b'}} onClick={() => setShowProfileModal(true)}>
                👤 My Profile
            </button>
            <button className="btn-primary" style={{background:'#ef4444'}} onClick={handleLogout}>Logout</button>
        </div>
      </div>

  
      <div className="chat-main">
        <div className="tabs-header">
            <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>💬 AI Chat</button>
            <button className={`tab-btn ${activeTab === 'escalations' ? 'active' : ''}`} onClick={() => setActiveTab('escalations')}>
                👨‍🏫 Tutor Resolutions {escalatedQueries.length > 0 && <span style={{marginLeft:'5px', background:'red', color:'white', padding:'2px 6px', borderRadius:'10px', fontSize:'0.7rem'}}>{escalatedQueries.length}</span>}
            </button>
        </div>

        {activeTab === 'chat' && (
            <>
                <div className="messages-area">
           
                    {!currentSession ? (
                        <div style={{textAlign:'center', marginTop:'15%', opacity: 0.8}}>
                            <div style={{fontSize:'4rem', marginBottom:'10px'}}>🤖</div>
                            <h2>How can I help you today?</h2>
                            <p style={{color:'#6b7280'}}>Ask about math, science, coding, or upload an image.</p>
                        </div>
                    ) : 
                    currentSession.map((msg, idx) => (
                        <div key={idx} className={`message-bubble ${msg.type}`}>
                            {msg.type === 'msg-ai' && <span className="ai-badge-inline">🤖 AI</span>}
                            <div className="markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{msg.text}</ReactMarkdown>
                            </div>
                            {msg.type === 'msg-ai' && <div className="msg-actions"><div className="rate-btn-link" onClick={() => setShowFeedbackModal(msg.id)}><span>⭐ Rate</span></div></div>}
                            {msg.type === 'msg-user' && msg.status === 'answered' && <div className="msg-actions"><span className="action-link" style={{color:'#f59e0b'}} onClick={() => handleEscalate(msg.id)}>Not satisfied? Ask Tutor</span></div>}
                        </div>
                    ))}
                    {loading && <div className="message-bubble msg-ai">Thinking...</div>}
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-container">
                    {selectedImage && (
                        <div style={{marginBottom:'10px', position:'relative', width:'fit-content'}}>
                            <img src={selectedImage} alt="Preview" style={{height:'80px', borderRadius:'8px', border:'1px solid #ddd'}} />
                            <button onClick={() => setSelectedImage(null)} style={{position:'absolute', top:-5, right:-5, background:'red', color:'white', border:'none', borderRadius:'50%', width:'20px', height:'20px', cursor:'pointer'}}>×</button>
                        </div>
                    )}
                    <form className="input-box-wrapper" onSubmit={handleSend}>
                        <input type="file" accept="image/*" ref={fileInputRef} style={{display:'none'}} onChange={handleImageSelect} />
                        <button type="button" className="icon-btn" onClick={() => fileInputRef.current.click()} title="Attach Image">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        </button>
                        <button type="button" className={`icon-btn mic-btn ${isListening?'active':''}`} onClick={toggleMic} title="Speak">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                        </button>
                        <input className="chat-input" placeholder={isListening ? "Listening..." : "Type doubt or attach image..."} value={input} onChange={(e) => setInput(e.target.value)} disabled={loading} />
                        <button type="submit" className="icon-btn send-btn" disabled={loading}>➤</button>
                    </form>
                </div>
            </>
        )}

     
        {activeTab === 'escalations' && (
            <div className="resolution-list">
                {escalatedQueries.length === 0 ? <div style={{textAlign:'center', marginTop:'50px', color:'#94a3b8'}}><h3>No Escalations Yet</h3></div> : 
                    escalatedQueries.map(q => {
                        const tutorAnswer = q.answers.find(a => a.tutor_id !== null);
                        return (
                            <div key={q.query_id} className="res-card">
                                <div className="res-header"><span>#{q.query_id}</span><span className={`badge ${q.status === 'resolved' ? 'resolved' : 'escalated'}`}>{q.status}</span></div>
                                <div className="res-body"><div className="res-question">{q.content}</div>{tutorAnswer ? <div className="tutor-reply-box"><div className="tutor-badge">👨‍🏫 Tutor Reply</div><p>{tutorAnswer.content}</p></div> : <div style={{color:'#c2410c'}}>Waiting...</div>}</div>
                            </div>
                        );
                    })
                }
            </div>
        )}
      </div>

      {showFeedbackModal && (
          <div className="modal-overlay" onClick={() => setShowFeedbackModal(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h3>Rate Answer</h3>
                  <div className="star-container">{[1, 2, 3, 4, 5].map((star) => (<span key={star} className="star-btn" style={{color: star <= hoverStar ? '#fbbf24' : '#e5e7eb'}} onMouseEnter={() => setHoverStar(star)} onMouseLeave={() => setHoverStar(0)} onClick={() => handleFeedback(showFeedbackModal, star)}>★</span>))}</div>
                  <button className="btn-primary" style={{background:'#cbd5e1', color:'#334155'}} onClick={() => setShowFeedbackModal(null)}>Cancel</button>
              </div>
          </div>
      )}

 
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>👤 Edit Profile</h3>
                <form onSubmit={handleProfileUpdate} style={{textAlign:'left'}}>
                    <label style={{fontWeight:'bold', fontSize:'0.9rem'}}>New Name</label>
                    <input className="form-control" type="text" placeholder="Enter new name" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
                    <label style={{fontWeight:'bold', fontSize:'0.9rem'}}>New Password</label>
                    <input className="form-control" type="password" placeholder="Enter new password" value={profileData.password} onChange={e => setProfileData({...profileData, password: e.target.value})} />
                    <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                        <button type="submit" className="btn-primary">Save</button>
                        <button type="button" onClick={() => setShowProfileModal(false)} className="btn-primary" style={{background:'#cbd5e1', color:'#334155'}}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

export default Chat;