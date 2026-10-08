import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherLogin, getTeachers } from '../utils/auth';
import { SUBJECTS } from '../utils/schedule';
import { Shield, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const TeacherLogin = ({ onLogin }) => {
  const [selectedId, setSelectedId] = useState('');
  const [teacherList, setTeacherList] = useState([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    const teachers = await getTeachers();
    setTeacherList(teachers);
    if (teachers.length > 0) {
      setSelectedId(teachers[0].id);
    }
  };

  // Get subject name from SUBJECTS mapping
  const getSubjectName = (subjectCode) => {
    return SUBJECTS[subjectCode]?.name || subjectCode;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await teacherLogin(selectedId, password);
      
      if (result.success) {
        onLogin(result.user);
        navigate('/teacher-panel');
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

  // Scroll Picker Component (matching student login style)
  const ScrollPicker = () => {
    const pickerRef = React.useRef(null);

    useEffect(() => {
      if (pickerRef.current && selectedId) {
        const selectedIndex = teacherList.findIndex(t => t.id === selectedId);
        const itemHeight = 50;
        pickerRef.current.scrollTop = selectedIndex * itemHeight;
      }
    }, [selectedId]);

    const handleScroll = (e) => {
      const container = e.target;
      const itemHeight = 50;
      const scrollPos = container.scrollTop;
      const centerIndex = Math.round(scrollPos / itemHeight);
      
      if (teacherList[centerIndex] && teacherList[centerIndex].id !== selectedId) {
        setSelectedId(teacherList[centerIndex].id);
      }
    };

    return (
      <div style={{ position: 'relative' }}>
        {/* Highlight bar */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '0',
          right: '0',
          height: '50px',
          transform: 'translateY(-50%)',
          border: '2px solid var(--accent)',
          borderRadius: '12px',
          pointerEvents: 'none',
          zIndex: 2,
          background: 'rgba(99, 102, 241, 0.08)'
        }} />
        
        {/* Scroll list */}
        <div 
          ref={pickerRef}
          onScroll={handleScroll}
          style={{
            height: '250px',
            overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            position: 'relative',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
          }}
        >
          <style>{`
            div::-webkit-scrollbar { display: none; }
          `}</style>
          
          {/* Top spacer */}
          <div style={{ height: '100px' }} />
          
          {/* Teacher items */}
          {teacherList.map((teacher) => {
            const isSelected = selectedId === teacher.id;
            return (
              <div
                key={teacher.id}
                onClick={() => setSelectedId(teacher.id)}
                style={{
                  height: '50px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: isSelected ? '1.1rem' : '0.85rem',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  opacity: isSelected ? 1 : 0.4,
                  transition: 'all 0.15s ease',
                  color: 'var(--text-primary)',
                  scrollSnapAlign: 'center'
                }}
              >
                <div>{getSubjectName(teacher.subject_code)}</div>
              </div>
            );
          })}
          
          {/* Bottom spacer */}
          <div style={{ height: '100px' }} />
        </div>
      </div>
    );
  };

  if (teacherList.length === 0) {
    return (
      <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        color: 'var(--text-primary)'
      }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading teacher accounts...</p>
        </div>
      </div>
    );
  }

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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem' }}>
        <button 
          onClick={() => navigate('/login')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-primary)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1.5rem', 
            opacity: 0.7 
          }}
        >
          <ArrowLeft size={16} /> Student Login
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            background: 'rgba(99, 102, 241, 0.1)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1rem', 
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}>
            <Shield size={32} color="#6366f1" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Teacher Portal</h2>
          <p style={{ opacity: 0.6 }}>Manage your subject resources</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '1rem', 
              opacity: 0.8, 
              fontSize: '0.9rem', 
              textTransform: 'uppercase', 
              letterSpacing: '1px' 
            }}>
              Select Teacher Account
            </label>
            <ScrollPicker />
          </div>

          {(!error || !error.includes('locked')) && (
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ 
                position: 'absolute', 
                left: '15px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                opacity: 0.6 
              }} />
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={error && error.includes('locked')}
                style={{ 
                  width: '100%', 
                  padding: '16px 50px 16px 50px', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  background: 'rgba(255,255,255,0.05)', 
                  color: 'var(--text-primary)', 
                  outline: 'none', 
                  fontSize: '1rem',
                  opacity: (error && error.includes('locked')) ? 0.5 : 1
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

          {error && (
            <div style={{ 
              color: '#ff4757', 
              background: 'rgba(255, 71, 87, 0.1)', 
              padding: '12px', 
              borderRadius: '12px',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          {(!error || !error.includes('locked')) && (
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ 
                marginTop: '0.5rem', 
                width: '100%', 
                padding: '16px', 
                borderRadius: '16px', 
                fontSize: '1rem', 
                fontWeight: 'bold',
                opacity: loading ? 0.7 : 1
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

export default TeacherLogin;
