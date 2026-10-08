import React from 'react';
import { Home, Calendar, Clock, BookOpen, LogOut, Menu, X, StickyNote, Settings, Info, ClipboardList, Contact, Award, TrendingUp, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { triggerHaptic, HapticPatterns } from '../utils/haptics';

const Sidebar = ({ 
    isOpen, 
    onClose, // Changed from toggleSidebar to match App.jsx
    activeTab = 'dashboard', 
    user, 
    onLogout // Changed from handleLogout to match App.jsx
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine active tab based on path if not explicitly passed
    const currentPath = location.pathname;
    const isNotes = currentPath === '/notes';
    const isDashboard = currentPath === '/dashboard';
    // const activeTab = isNotes ? 'notes' : 'dashboard'; // Derived state

    const handleNavigation = (path) => {
        triggerHaptic(HapticPatterns.medium);
        navigate(path);
        if (window.innerWidth <= 768 && isOpen) {
            onClose();
        }
    };

    const handleLogoutWithHaptic = () => {
        triggerHaptic(HapticPatterns.heavy);
        onLogout();
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="sidebar-overlay"
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998
                    }}
                />
            )}

            {/* Sidebar */}
            <div className={`sidebar glass-panel ${isOpen ? 'is-open' : ''}`}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Student Portal</h2>
                    <button className="mobile-sidebar-close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', display: 'none' }}>
                        <X size={24} />
                    </button>
                </div>

                <nav style={{ flex: 1, padding: '1rem 0' }}>
                    {/* Dashboard / Home - Hidden for Teachers */}
                    {user?.role !== 'Teacher' && (
                        <div 
                            className={`nav-item ${(isDashboard && (!user || user.role === 'Student')) || (user && (user.role === 'Admin' || user.role === 'ClassRep') && location.pathname === '/contacts') ? 'active' : ''}`}
                            onClick={() => handleNavigation(
                                user && user.role === 'Admin' ? '/contacts' :
                                user && user.role === 'ClassRep' ? '/contacts' :
                                '/'
                            )}
                            style={{
                                padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                cursor: 'pointer', borderRadius: '12px',
                                background: isDashboard ? 'rgba(255,255,255,0.1)' : 'transparent',
                                marginBottom: '0.5rem'
                            }}
                        >
                            {user && (user.role === 'Admin' || user.role === 'ClassRep') ? <Contact size={20} /> : <Home size={20} />}
                            <span>{user && (user.role === 'Admin' || user.role === 'ClassRep') ? 'Contacts' : 'Dashboard'}</span>
                        </div>
                    )}

                    {/* Notes - Available to all */}
                    <div 
                        className={`nav-item ${isNotes ? 'active' : ''}`}
                        onClick={() => handleNavigation('/notes')}
                        style={{
                            padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                            cursor: 'pointer', borderRadius: '12px',
                            background: isNotes ? 'rgba(255,255,255,0.1)' : 'transparent',
                            marginBottom: '0.5rem'
                        }}
                    >
                        <StickyNote size={20} />
                        <span>Notes</span>
                    </div>

                    {/* Calendar - Available to all */}
                    <div 
                        className={`nav-item ${location.pathname === '/calendar' ? 'active' : ''}`}
                        onClick={() => handleNavigation('/calendar')}
                        style={{
                            padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                            cursor: 'pointer', borderRadius: '12px',
                            background: location.pathname === '/calendar' ? 'rgba(255,255,255,0.1)' : 'transparent',
                            marginBottom: '0.5rem'
                        }}
                    >
                        <Calendar size={20} />
                        <span>Calendar</span>
                    </div>

                    {/* Marks - Teachers go to /teacher-marks, Students to /marks */}
                    <div 
                        className={`nav-item ${(user?.role === 'Teacher' && location.pathname === '/teacher-marks') || (user?.role !== 'Teacher' && location.pathname === '/marks') ? 'active' : ''}`}
                        onClick={() => handleNavigation(user?.role === 'Teacher' ? '/teacher-marks' : '/marks')}
                        style={{
                            padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                            cursor: 'pointer', borderRadius: '12px',
                            background: ((user?.role === 'Teacher' && location.pathname === '/teacher-marks') || (user?.role !== 'Teacher' && location.pathname === '/marks')) ? 'rgba(255,255,255,0.1)' : 'transparent',
                            marginBottom: '0.5rem'
                        }}
                    >
                        <Award size={20} />
                        <span>Marks</span>
                    </div>

                    {/* Performance - Hidden for Teachers */}
                    {user && user.role !== 'Teacher' && (
                        <div 
                            className={`nav-item ${location.pathname === '/performance' ? 'active' : ''}`}
                            onClick={() => handleNavigation('/performance')}
                            style={{
                                padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                cursor: 'pointer', borderRadius: '12px',
                                background: location.pathname === '/performance' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                marginBottom: '0.5rem'
                            }}
                        >
                            <TrendingUp size={20} />
                            <span>Performance</span>
                        </div>
                    )}

                    {/* About - Available to all */}
                    <div 
                        className={`nav-item ${location.pathname === '/about' ? 'active' : ''}`}
                        onClick={() => handleNavigation('/about')}
                        style={{
                            padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                            cursor: 'pointer', borderRadius: '12px',
                            background: location.pathname === '/about' ? 'rgba(255,255,255,0.1)' : 'transparent',
                            marginBottom: '0.5rem'
                        }}
                    >
                        <Info size={20} />
                        <span>About</span>
                    </div>

                    {/* Mock Attendance - Admin/ClassRep/Teacher Only */}
                    {user && (user.role === 'Admin' || user.role === 'ClassRep' || user.role === 'Teacher') && (
                        <div 
                            className={`nav-item ${location.pathname === '/mock-attendance' ? 'active' : ''}`}
                            onClick={() => handleNavigation('/mock-attendance')}
                            style={{
                                padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                cursor: 'pointer', borderRadius: '12px',
                                background: location.pathname === '/mock-attendance' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                marginBottom: '0.5rem'
                            }}
                        >
                            <ClipboardList size={20} />
                            <span>Mock Attendance</span>
                        </div>
                    )}

                    {/* Assignments - Teachers Only */}
                    {user && user.role === 'Teacher' && (
                        <div 
                            className={`nav-item ${location.pathname === '/teacher-assignments' ? 'active' : ''}`}
                            onClick={() => handleNavigation('/teacher-assignments')}
                            style={{
                                padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                cursor: 'pointer', borderRadius: '12px',
                                background: location.pathname === '/teacher-assignments' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                marginBottom: '0.5rem'
                            }}
                        >
                            <FileText size={20} />
                            <span>Assignments</span>
                        </div>
                    )}

                    {/* Role-Based Panel Link */}
                    {user && (user.role === 'Admin' || user.role === 'ClassRep') && (
                        <div 
                            className="nav-item"
                            onClick={() => handleNavigation(user.role === 'Admin' ? '/admin' : '/class-rep')}
                            style={{
                                padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                cursor: 'pointer', borderRadius: '12px',
                                background: 'transparent',
                                marginBottom: '0.5rem',
                                color: 'var(--accent)'
                            }}
                        >
                            <Settings size={20} />
                            <span>{user.role === 'Admin' ? 'Admin Panel' : 'Coordinator Panel'}</span>
                        </div>
                    )}
                </nav>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div 
                            style={{ 
                                width: 40, height: 40, borderRadius: '50%', 
                                background: user?.photo ? `url(${user.photo}) center/cover` : 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 'bold', color: 'white'
                            }}
                        >
                            {!user?.photo && user?.name?.charAt(0)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Student'}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{user?.id}</div>
                            {user?.role && user.role !== 'Student' && (
                                <div style={{ 
                                    fontSize: '0.7rem', background: 'var(--accent)', color: 'white', 
                                    padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '2px'
                                }}>
                                    {user.role}
                                </div>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={handleLogoutWithHaptic}
                        style={{
                            width: '100%', padding: '0.8rem', borderRadius: '12px',
                            border: '1px solid var(--glass-border)', background: 'rgba(255, 71, 87, 0.1)',
                            color: '#ff4757', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                        }}
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
