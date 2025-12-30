import React, { useEffect, useState } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [systemStatus, setSystemStatus] = useState('Checking...');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const s = await api.get('/admin/stats');
        const r = await api.get('/admin/reports');
        const u = await api.get('/admin/users');
        setStats(s.data);
        setReports(r.data);
        setUsers(u.data);
        setSystemStatus('Online'); 
      } catch (error) {
        setSystemStatus('Offline');
        if (error.response?.status === 403) navigate('/login');
      }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const handlePrint = () => {
      window.print(); 
  };

  const aiResolved = stats ? stats.queries_resolved - stats.queries_escalated : 0;
  const aiPercentage = stats ? Math.round(((stats.total_queries - stats.queries_escalated) / stats.total_queries) * 100) || 0 : 0;

  return (
    <div className="dashboard-container">
      
     
      <div className="dashboard-header">
        <div>
            <h1>Admin Control Panel</h1>
            <div style={{display:'flex', alignItems:'center', gap:'15px', marginTop:'5px'}}>
                <span style={{
                    fontSize:'0.85rem', fontWeight:'bold', 
                    color: systemStatus === 'Online' ? '#10b981' : '#ef4444',
                    display:'flex', alignItems:'center', gap:'5px'
                }}>
                    <span style={{width:'8px', height:'8px', borderRadius:'50%', background: systemStatus === 'Online' ? '#10b981' : '#ef4444'}}></span>
                    System {systemStatus}
                </span>
                <span style={{fontSize:'0.85rem', color:'#94a3b8'}}>|</span>
                <span style={{fontSize:'0.85rem', color:'#64748b'}}>v1.0.0 (Stable)</span>
            </div>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={handlePrint} className="btn-primary" style={{width: 'auto', background: '#64748b'}}>🖨️ Export PDF</button>
            <button onClick={handleLogout} className="btn-primary" style={{width: 'auto', background: '#dc3545'}}>Logout</button>
        </div>
      </div>

 
      <div className="tabs-header" style={{marginBottom:'30px', background:'transparent', borderBottom:'2px solid #e2e8f0'}}>
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Analytics Overview</button>
        <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>📑 Detailed Reports</button>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 User Management</button>
      </div>

      {activeTab === 'overview' && stats && (
        <>
            <div className="stats-grid">
                <StatCard title="Total Students" value={stats.total_students} color="#4F46E5" />
                <StatCard title="Total Queries" value={stats.total_queries} color="#10B981" />
                <StatCard title="Escalation Rate" value={`${100 - aiPercentage}%`} color="#F59E0B" />
                <StatCard title="Active Tutors" value={stats.total_tutors} color="#3B82F6" />
            </div>

            <div className="table-card" style={{padding:'30px', textAlign:'center'}}>
                <h3>🤖 AI Effectiveness Report</h3>
                <p style={{color:'#64748b'}}>Percentage of queries resolved automatically by AI vs Escalated.</p>
                <div style={{height:'30px', width:'100%', background:'#e2e8f0', borderRadius:'15px', overflow:'hidden', marginTop:'20px', display:'flex'}}>
                    <div style={{width: `${aiPercentage}%`, background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'0.8rem', fontWeight:'bold'}}>
                        AI Resolved ({aiPercentage}%)
                    </div>
                    <div style={{flex:1, background:'#f59e0b', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'0.8rem', fontWeight:'bold'}}>
                        Escalated
                    </div>
                </div>
            </div>
        </>
      )}


      {activeTab === 'reports' && reports && (
        <div className="table-section" style={{gridTemplateColumns:'1fr 1fr'}}>
            <div className="table-card">
                <div className="table-header"><h3>🎓 Top Active Students</h3></div>
                <table className="modern-table">
                    <thead><tr><th>Name</th><th style={{textAlign:'right'}}>Queries Asked</th></tr></thead>
                    <tbody>
                        {reports.student_activity.map((s, i) => (
                            <tr key={i}><td>{s.name}</td><td style={{textAlign:'right', fontWeight:'bold'}}>{s.queries}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="table-card">
                <div className="table-header"><h3>🏆 Tutor Performance</h3></div>
                <table className="modern-table">
                    <thead><tr><th>Name</th><th style={{textAlign:'right'}}>Resolutions</th></tr></thead>
                    <tbody>
                        {reports.tutor_performance.map((t, i) => (
                            <tr key={i}><td>{t.tutor_name}</td><td style={{textAlign:'right', fontWeight:'bold'}}>{t.answers_given}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="table-card" style={{gridColumn:'1 / -1'}}>
                <div className="table-header"><h3>🚩 Recent Escalations Log</h3></div>
                <table className="modern-table">
                    <thead><tr><th>Query ID</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                        {reports.recent_escalations.map(e => (
                            <tr key={e.query_id}>
                                <td>#{e.query_id}</td>
                                <td><span className={`badge ${e.status === 'resolved' ? 'resolved' : 'escalated'}`}>{e.status}</span></td>
                                <td>{new Date(e.escalated_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}


      {activeTab === 'users' && (
          <div className="table-card">
              <div className="table-header"><h3>System User List</h3></div>
              <table className="modern-table">
                  <thead><tr><th>Role</th><th>Name</th><th>Email</th><th>Joined</th></tr></thead>
                  <tbody>
                      {users.map((u, i) => (
                          <tr key={i}>
                              <td><span style={{padding:'4px 8px', borderRadius:'4px', fontSize:'0.75rem', fontWeight:'bold', background: u.role === 'Tutor' ? '#e0e7ff' : '#f0fdf4', color: u.role === 'Tutor' ? '#4338ca' : '#15803d'}}>{u.role}</span></td>
                              <td style={{fontWeight:'500'}}>{u.name}</td>
                              <td style={{color:'#64748b'}}>{u.email}</td>
                              <td>{new Date(u.joined).toLocaleDateString()}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
}

const StatCard = ({ title, value, color }) => (
    <div className="stat-card">
        <div className="stat-icon" style={{background: color, width:'50px', height:'50px', fontSize:'1.5rem'}}>📊</div>
        <div className="stat-info"><h3>{value}</h3><p>{title}</p></div>
    </div>
);

export default AdminDashboard;