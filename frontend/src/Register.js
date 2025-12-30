import React, { useState } from 'react';
import api from './api';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', subject: '' });
  const [role, setRole] = useState('student');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/register/${role}`, formData);
      alert('Registration Successful! Please Login.');
      navigate('/login');
    } catch (error) {
      alert('Registration failed. Email might be taken.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>🚀 Create Account</h2>
        
        {/* Modern Role Toggles */}
        <div className="role-group">
            {['student', 'tutor', 'admin'].map((r) => (
                <button 
                    key={r}
                    type="button" 
                    className={`role-btn ${role === r ? 'active' : ''}`}
                    onClick={() => setRole(r)}
                >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
            ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input className="form-control" type="text" placeholder="Full Name" required 
            onChange={(e) => setFormData({...formData, name: e.target.value})} />
          
          <input className="form-control" type="email" placeholder="Email Address" required 
            onChange={(e) => setFormData({...formData, email: e.target.value})} />
          
          <input className="form-control" type="password" placeholder="Password" required 
            onChange={(e) => setFormData({...formData, password: e.target.value})} />

          {role === 'tutor' && (
             <input className="form-control" type="text" placeholder="Subject Specialization" required 
             onChange={(e) => setFormData({...formData, subject: e.target.value})} />
          )}

          <button type="submit" className="btn-primary" style={{marginTop:'10px'}}>
            Join as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </form>
        
        <p style={{marginTop: '20px', fontSize: '0.9rem'}}>
          Already have an account? <Link to="/login" style={{color: 'var(--primary)', fontWeight:600, textDecoration:'none'}}>Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;