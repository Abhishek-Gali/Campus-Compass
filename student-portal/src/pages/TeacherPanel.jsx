import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../utils/schedule';

const TeacherPanel = ({ user }) => {
  const navigate = useNavigate();
  const teacherSubject = user?.subject_code ? SUBJECTS[user.subject_code] : null;

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '100%', padding: '1rem' }}>
      {/* Header Section */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Welcome, {user?.name}!
        </h2>
        <div style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '1rem' }}>
          {teacherSubject?.name || user?.subject_code} Faculty
        </div>
        <div style={{ 
          marginTop: '1rem', 
          padding: '8px 16px', 
          background: 'rgba(99, 102, 241, 0.2)', 
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '12px', 
          display: 'inline-block',
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>
          Level 2 Access - Teacher Panel
        </div>
      </div>

      {/* Quick Access Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/mock-attendance')}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Mock Attendance</h3>
          <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>Mark student attendance</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/teacher-assignments')}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📚</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Assignments</h3>
          <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>Create and manage assignments</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/teacher-marks')}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎯</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Marks Entry</h3>
          <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>Enter and manage student marks</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/notes')}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📖</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Notes</h3>
          <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>View and upload notes</p>
        </div>
      </div>

      {/* Info Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem', background: 'rgba(99, 102, 241, 0.1)' }}>
        <h3 style={{ marginBottom: '1rem' }}>📊 Feature Access</h3>
        <ul style={{ lineHeight: '1.8', opacity: 0.9, paddingLeft: '1.5rem' }}>
          <li>✅ <strong>Mock Attendance</strong> - Mark attendance for all classes</li>
          <li>✅ <strong>Assignments</strong> - Create/edit assignments for {teacherSubject?.name || user?.subject_code}</li>
          <li>✅ <strong>Marks</strong> - Enter marks for {teacherSubject?.name || user?.subject_code}</li>
          <li>✅ <strong>Notes</strong> - View all notes, upload for your subject</li>
          <li>✅ <strong>Calendar</strong> - View academic calendar</li>
          <li>✅ <strong>About</strong> - Application information</li>
        </ul>
      </div>
    </div>
  );
};

export default TeacherPanel;
