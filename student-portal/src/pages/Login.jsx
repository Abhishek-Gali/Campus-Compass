import React, { useState } from 'react';
import ScrollPicker from '../components/ScrollPicker';
import { login } from '../utils/auth';
import { Lock, LogIn, Eye, EyeOff } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('11523060001');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState(''); // Just to ensure clean state
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password');
      return;
    }

    const result = await login(selectedId, password);
    if (result.success) {
      onLogin(result.user);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '3rem', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px' }}>Welcome Back</h2>
      <p style={{ marginBottom: '2rem', opacity: 0.6 }}>Enter your credentials to access the portal</p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '1rem', opacity: 0.8, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Select Student ID</label>
          <ScrollPicker selectedId={selectedId} onSelect={setSelectedId} disabled={error && error.includes('locked')} />
        </div>

        {(!error || !error.includes('locked')) && (
        <div style={{ marginBottom: '2rem', position: 'relative' }}>
          <Lock size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 50px 16px 50px', // Adjusted padding for right icon
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '1.1rem',
              transition: 'background 0.3s'
            }}
            onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onBlur={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              opacity: 0.6,
              cursor: 'pointer'
            }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        )}

        {error && <p style={{ color: '#ff4757', marginBottom: '1rem', background: 'rgba(255, 71, 87, 0.1)', padding: '10px', borderRadius: '12px' }}>{error}</p>}

        {(!error || !error.includes('locked')) && (
        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', borderRadius: '16px' }}>
          <span>Secure Login</span> <LogIn size={20} />
        </button>
        )}
      </form>

      <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <span style={{ opacity: 0.6 }}>New Student?</span> 
        <span onClick={() => navigate('/signup')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}>Create Account</span>
      </div>
    </div>
  );
};

export default Login;
