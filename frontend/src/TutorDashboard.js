import React, { useEffect, useState } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

function TutorDashboard() {
  const [queries, setQueries] = useState([]);
  const [answerInputs, setAnswerInputs] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPendingQueries = async () => {
      try {
        const response = await api.get('/tutor/pending');
        setQueries(response.data);
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/login');
        }
      }
    };
    fetchPendingQueries();
  }, [navigate]);

  const handleSubmitAnswer = async (queryId) => {
    const content = answerInputs[queryId];
    if (!content) return;

    try {
      await api.post('/tutor/answer', { query_id: queryId, content: content });
      alert('Answer Submitted Successfully!');
      setAnswerInputs({ ...answerInputs, [queryId]: '' });
      
      const response = await api.get('/tutor/pending');
      setQueries(response.data);
    } catch (error) {
      alert('Failed to submit answer.');
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <div className="dashboard-container">
      

      <div className="dashboard-header">
        <div>
            <h1>👨‍🏫 Tutor Workspace</h1>
            <p style={{color: '#64748b', margin: 0}}>Review and answer student escalations.</p>
        </div>
        <button onClick={handleLogout} className="btn-primary" style={{width: 'auto', background: '#dc3545'}}>
            Logout
        </button>
      </div>

      <div style={{maxWidth: '800px', margin: '0 auto'}}>
        
        {queries.length === 0 ? (
          <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow)'}}>
            <div style={{fontSize: '4rem', marginBottom: '20px'}}>🎉</div>
            <h2 style={{color: '#1e293b'}}>All Caught Up!</h2>
            <p style={{color: '#64748b'}}>There are no pending queries requiring your attention.</p>
          </div>
        ) : (
          queries.map((q) => (
            <div key={q.query_id} className="query-card">
              
      
              <div className="qc-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <span className="badge escalated">Escalated</span>
                    <span style={{color: '#64748b', fontSize: '0.9rem'}}>ID: #{q.query_id}</span>
                </div>
                <span style={{color: '#94a3b8', fontSize: '0.85rem'}}>
                    {new Date(q.timestamp).toLocaleString()}
                </span>
              </div>

   
              <div className="qc-body">
                <div style={{marginBottom: '10px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold'}}>Student Question:</div>
                <div className="qc-question">{q.content}</div>
                
                <div style={{marginBottom: '10px', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', marginTop: '20px'}}>Your Answer:</div>
                <div className="qc-input-area">
                    <textarea 
                      className="qc-textarea"
                      rows="3" 
                      placeholder="Write a clear and helpful explanation..." 
                      value={answerInputs[q.query_id] || ''}
                      onChange={(e) => setAnswerInputs({...answerInputs, [q.query_id]: e.target.value})}
                    />
                    <button 
                        className="btn-primary" 
                        onClick={() => handleSubmitAnswer(q.query_id)}
                        style={{width: 'auto', padding: '12px 20px', height: 'fit-content'}}
                    >
                      Send
                    </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TutorDashboard;