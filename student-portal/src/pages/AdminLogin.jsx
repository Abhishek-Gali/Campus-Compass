import React, { useState } from 'react';
import { adminLogin } from '../utils/auth';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = ({ onAdminLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await adminLogin(username, password);
    if(result.success) {
        onAdminLogin();
        navigate('/admin');
    } else {
        setError(result.message);
    }
  };

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
      <div style={{ marginBottom: '2rem' }}>
          <Shield size={64} style={{ color: '#ff4757', opacity: 0.8 }} />
      </div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>Admin Access</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Admin Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>


          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', paddingRight: '40px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-primary)', opacity: 0.7, cursor: 'pointer' }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {error && <p style={{ color: '#ff4757', marginBottom: '1rem', background: 'rgba(255, 71, 87, 0.1)', padding: '5px', borderRadius: '8px' }}>{error}</p>}

        <button type="submit" className="btn-primary" style={{ width: '100%', background: '#ff4757' }}>
          Authorize
        </button>
      </form>
      
      <button onClick={() => navigate('/login')} style={{ marginTop: '1rem', background: 'none', border:'none', color:'var(--text-primary)', opacity: 0.6, cursor:'pointer' }}>
          Back to Portal
      </button>
    </div>
  );
};

export default AdminLogin;
