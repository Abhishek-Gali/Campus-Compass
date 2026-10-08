import React, { useState } from 'react';
import ScrollPicker from '../components/ScrollPicker';
import { register, checkNameExists } from '../utils/auth';
import { UserPlus, ArrowLeft, Camera, User, Eye, EyeOff } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedId, setSelectedId] = useState('11523060001');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null); // base64 string
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !name) {
      setMessage('Please fill all fields');
      setIsError(true);
      return;
    }

    const result = await register(selectedId, password, name, photo);
    setMessage(result.message);
    setIsError(!result.success);
  };

  const handleNameBlur = async () => {
      if (!name) return;
      const exists = await checkNameExists(name);
      if (exists) {
          setName(''); // Blank the name as requested
          setMessage('This name is already registered. Please use another.');
          setIsError(true);
      } else {
          // Clear error if valid
          if (message === 'This name is already registered. Please use another.') {
              setMessage('');
              setIsError(false);
          }
      }
  };

  return (
    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', minWidth: '320px', minHeight: '500px', padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <button onClick={() => navigate('/login')} style={{ position: 'absolute', top: '10px', left: '10px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', opacity: 0.6 }}>
        <ArrowLeft size={24} />
      </button>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px', marginTop: '1rem' }}>Join Portal</h2>

      <form onSubmit={handleSubmit}>
        {/* Step 1: ID Selection */}
        {step === 1 && (
            <div className="animate-fade-in">
                 <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '1rem', opacity: 0.8, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Select Your ID</label>
                    <ScrollPicker selectedId={selectedId} onSelect={setSelectedId} />
                </div>
                <button type="button" onClick={() => setStep(2)} className="btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '16px', fontSize: '1.1rem' }}>Next Step</button>
            </div>
        )}

        {/* Step 2: Personal Details */}
        {step === 2 && (
            <div className="animate-fade-in">
                 <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label htmlFor="photo-upload" style={{ cursor: 'pointer', position: 'relative' }}>
                        <div style={{ 
                            width: '100px', height: '100px', borderRadius: '50%', 
                            background: photo ? `url(${photo}) center/cover` : 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px dashed rgba(255,255,255,0.3)',
                            transition: 'border-color 0.3s'
                        }}>
                             {!photo && <Camera size={32} opacity={0.5} />}
                        </div>
                    </label>
                    <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                    <span style={{ fontSize: '0.9rem', marginTop: '0.8rem', opacity: 0.6 }}>Upload Profile Photo</span>
                </div>

                <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                    <User size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
                    <input
                        type="text"
                        placeholder="Full Legal Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleNameBlur}
                        style={{ width: '100%', padding: '16px 16px 16px 50px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', fontSize: '1.1rem' }}
                    />
                </div>

                <div style={{ marginBottom: '2rem', position: 'relative' }}>
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Choose Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '16px 50px 16px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', outline: 'none', fontSize: '1.1rem' }}
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

                {message && (
                <p style={{ 
                    color: isError ? '#ff4757' : '#2ed573', 
                    marginBottom: '1rem',
                    background: isError ? 'rgba(255, 71, 87, 0.1)' : 'rgba(46, 213, 115, 0.1)',
                    padding: '10px',
                    borderRadius: '12px'
                }}>
                    {message}
                </p>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: '16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)', borderRadius: '16px', cursor: 'pointer', fontSize: '1rem' }}>Back</button>
                    <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '16px', fontSize: '1rem' }}>
                     <span>Register</span> <UserPlus size={20} />
                    </button>
                </div>
            </div>
        )}
      </form>
    </div>
  );
};

export default Signup;
