import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import StudentDashboard from './pages/StudentDashboard';
import MockAttendance from './pages/MockAttendance';
import CalendarPage from './pages/CalendarPage';
import About from './pages/About';
import Notes from './pages/Notes';
import Contacts from './pages/Contacts';
import MarksTracker from './pages/MarksTracker';
import Sidebar from './components/Sidebar';
import { STUDENT_DATA } from './utils/studentData';
import BackgroundAnimation from './components/BackgroundAnimation';
import { Bell, Menu, X } from 'lucide-react';
import { fetchScheduleOverrides } from './utils/schedule';
import './index.css';

import AdminLogin from './pages/AdminLogin';
import ClassRepLogin from './pages/ClassRepLogin';
import ClassRepPanel from './pages/ClassRepPanel';
import TeacherLogin from './pages/TeacherLogin';
import TeacherPanel from './pages/TeacherPanel';
import TeacherMarks from './pages/TeacherMarks';
import TeacherAssignments from './pages/TeacherAssignments';
import ErrorBoundary from './components/ErrorBoundary';
import SemesterPerformance from './pages/SemesterPerformance';

// Layout wrapper for authenticated pages
const AppLayout = ({ children, user, onLogout, sidebarOpen, setSidebarOpen, onUpdateUser }) => {
    return (
        <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <Sidebar user={user} onLogout={onLogout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onUpdateUser={onUpdateUser} />
            <div className="main-content">
                <header className="top-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button 
                            className="mobile-menu-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            style={{ 
                                background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer',
                                display: 'none' // Hidden by default, shown via CSS on mobile
                            }}
                        >
                            <Menu size={24} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src="/logo.png" alt="Student Portal Logo" style={{ height: '40px', width: 'auto' }} />
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 'normal' }}>
                                {user?.role === 'Teacher' ? 'Teachers Panel' : 'Student Portal'}
                            </h2>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <button style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <Bell size={20} />
                         </button>
                    </div>
                </header>
                <main className="content-area">
                    {children}
                </main>
            </div>
            {/* Overlay for mobile when sidebar is open */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.5)', zIndex: 998, display: 'none'
                    }}
                />
            )}
        </div>
    );
};

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check for saved session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('student_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user', e);
        localStorage.removeItem('student_user');
      }
    }
  }, []);

  // Time-based Theme Logic
  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      const body = document.body;
      
      body.classList.remove('theme-morning', 'theme-afternoon', 'theme-night');
      
      if (hour >= 6 && hour < 12) {
        body.classList.add('theme-morning');
      } else if (hour >= 12 && hour < 16) {
        body.classList.add('theme-afternoon');
      } else if (hour >= 16 && hour < 19) {
        body.classList.add('theme-sunset');
      } else {
        body.classList.add('theme-night');
      }
    };

    updateTheme();
    const interval = setInterval(updateTheme, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Load schedule overrides from Supabase
  useEffect(() => {
    fetchScheduleOverrides();
  }, []);

  const handleLogin = (loggedInUser) => {
    // Preserve authenticated name from database; fallback to synthetic roster only if blank
    if (!loggedInUser.name) {
        const officialRecord = STUDENT_DATA.find(s => s.id === loggedInUser.id);
        if (officialRecord) {
            loggedInUser.name = officialRecord.name;
        }
    }

    setUser(loggedInUser);
    localStorage.setItem('student_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('student_user');
  };

  const handleAdminLogin = () => {
      setIsAdmin(true);
      setUser({ role: 'Admin', name: 'Administrator', id: 'ADMIN' }); // Ensure Admin has a user object too for consistency
  };
  
  const handleClassRepLogin = (crUser) => {
      setUser(crUser);
      setIsAdmin(true); // Allow access to Admin Panel
  };
  
  const handleTeacherLogin = (teacherUser) => {
      setUser(teacherUser);
      localStorage.setItem('student_user', JSON.stringify(teacherUser));
  };

  // Removed extra brace

  return (
    <Router>
      <div className="app-container">
        <BackgroundAnimation />
        <ErrorBoundary>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={!user && !isAdmin ? <Login onLogin={handleLogin} /> : <Navigate to={isAdmin ? "/admin" : "/"} />} />
                <Route path="/signup" element={!user && !isAdmin ? <Signup /> : <Navigate to="/" />} />
                
                {/* Admin Routes */}
                <Route path="/admin-login" element={!user ? <AdminLogin onAdminLogin={handleAdminLogin} /> : (user.role === 'Admin' ? <Navigate to="/admin" /> : <Navigate to="/" />)} />
                <Route path="/admin" element={(user && user.role === 'Admin') ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><Admin user={user} onSuperLogin={handleLogin} /></AppLayout> : <Navigate to="/admin-login" />} />
                
                {/* Class Rep Routes */}
                <Route path="/cr-login" element={!user ? <ClassRepLogin onLogin={handleClassRepLogin} /> : (user.role === 'ClassRep' ? <Navigate to="/class-rep" /> : <Navigate to="/" />)} />
                <Route path="/class-rep" element={(user && user.role === 'ClassRep') ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><ClassRepPanel user={user} /></AppLayout> : <Navigate to="/cr-login" />} />
                
                {/* Teacher Routes */}
                <Route path="/teacher-login" element={!user ? <TeacherLogin onLogin={handleTeacherLogin} /> : (user.role === 'Teacher' ? <Navigate to="/mock-attendance" /> : <Navigate to="/" />)} />
                <Route path="/teacher-panel" element={(user && user.role === 'Teacher') ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><TeacherPanel user={user} /></AppLayout> : <Navigate to="/teacher-login" />} />
                <Route path="/teacher-marks" element={(user && user.role === 'Teacher') ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><TeacherMarks user={user} /></AppLayout> : <Navigate to="/teacher-login" />} />
                <Route path="/teacher-assignments" element={(user && user.role === 'Teacher') ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><TeacherAssignments user={user} /></AppLayout> : <Navigate to="/teacher-login" />} />

                {/* Protected Routes */}
                <Route path="/" element={
                    user ? (
                        user.role === 'Admin' ? <Navigate to="/admin" /> :
                        user.role === 'ClassRep' ? <Navigate to="/class-rep" /> :
                        user.role === 'Teacher' ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><TeacherPanel user={user} /></AppLayout> :
                        <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><StudentDashboard user={user} onLogout={handleLogout} /></AppLayout>
                    ) : <Navigate to="/login" />
                } />
                <Route path="/notes" element={user ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><Notes user={user} /></AppLayout> : <Navigate to="/login" />} />
                <Route path="/calendar" element={user ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><CalendarPage /></AppLayout> : <Navigate to="/login" />} />
                <Route path="/about" element={user ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><About /></AppLayout> : <Navigate to="/login" />} />
                <Route path="/mock-attendance" element={user ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><MockAttendance user={user} /></AppLayout> : <Navigate to="/login" />} />
                <Route path="/contacts" element={user ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><Contacts /></AppLayout> : <Navigate to="/login" />} />
                <Route path="/marks" element={user ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><MarksTracker user={user} /></AppLayout> : <Navigate to="/login" />} />
                <Route path="/performance" element={user ? <AppLayout user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onUpdateUser={setUser}><SemesterPerformance user={user} /></AppLayout> : <Navigate to="/login" />} />
                
                {/* Redirect default */}
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </ErrorBoundary>
      </div>
    </Router>
  );
}

// Wrapper for Signup to handle navigation properly
// (Small fix: Login/Signup passed navigation props, but now we use Router Link/Navigate)
// Updating Login/Signup to use useNavigate hook would be cleaner, but for now passing wrappers works or simple refactor.
// Let's rely on the components' own state buttons? 
// Actually, `Login` calls `onNavigateSignup`. I need to wire that to `navigate('/signup')`.

export default App;
