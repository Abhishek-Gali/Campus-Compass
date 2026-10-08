import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/auth'; // We reuse the generic login function
import { Shield, Lock, User, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const ClassRepLogin = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(id, password);
      
      if (result.success) {
        // Enforce Role Check
        if (result.user.role !== 'ClassRep') {
             setError('Access Denied. This portal is for Class Representatives only.');
             setLoading(false);
             return;
        }

        // Success
        onLogin(result.user);
        navigate('/class-rep'); // Redirect to Class Rep Dashboard
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        position: 'relative',
        zIndex: 1,
        color: 'var(--text-primary)'
    }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
            <button 
                onClick={() => navigate('/login')} 
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', opacity: 0.7 }}
            >
                <ArrowLeft size={16} /> Student Login
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ 
                    width: '60px', height: '60px', background: 'rgba(245, 158, 11, 0.1)', 
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem', border: '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                    <Shield size={32} color="#f59e0b" />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>Class Rep Portal</h2>
                <p style={{ opacity: 0.6 }}>Manage your class resources</p>
            </div>

            {error && (
                <div className="error-msg" style={{ marginBottom: '1.5rem' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group" style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
                    <input 
                        type="text" 
                        placeholder="Rep ID" 
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        required
                        disabled={error && error.includes('locked')}
                        style={{ 
                            width: '100%', padding: '16px 16px 16px 50px', 
                            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', 
                            background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', 
                            outline: 'none', fontSize: '1rem',
                            opacity: (error && error.includes('locked')) ? 0.5 : 1
                        }}
                    />
                </div>

                {(!error || !error.includes('locked')) && (
                <div className="input-group" style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
                    <input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ 
                            width: '100%', padding: '16px 50px 16px 50px', 
                            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', 
                            background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', 
                            outline: 'none', fontSize: '1rem' 
                        }}
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
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                )}

                {(!error || !error.includes('locked')) && (
                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={loading}
                    style={{ 
                        marginTop: '0.5rem', width: '100%', padding: '16px', 
                        borderRadius: '16px', fontSize: '1rem', fontWeight: 'bold' 
                    }}
                >
                    {loading ? 'Authenticating...' : 'Access Dashboard'}
                </button>
                )}
            </form>
        </div>
    </div>
  );
};

export default ClassRepLogin;
