import React, { useState } from 'react';
import api from './api';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/login', formData);
      
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('role', response.data.role);

      if (response.data.role === 'tutor') navigate('/tutor');
      else if (response.data.role === 'admin') navigate('/admin');
      else navigate('/chat');
      
    } catch (error) {
      alert('Invalid Credentials');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>👋 Welcome Back</h2>
        <p style={{color:'#6b7280', marginBottom:'20px'}}>Enter your credentials to access your account.</p>
        
        <form onSubmit={handleLogin}>
          <input 
            className="form-control"
            type="email" placeholder="Email Address" required 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            className="form-control"
            type="password" placeholder="Password" required 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button type="submit" className="btn-primary">Sign In</button>
        </form>
        
        <p style={{marginTop: '20px', fontSize: '0.9rem'}}>
          Don't have an account? <Link to="/register" style={{color: 'var(--primary)', fontWeight:600, textDecoration:'none'}}>Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;