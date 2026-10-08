import React, { useState, useEffect } from 'react';
import { SUBJECTS } from '../utils/schedule';

const TeacherAssignments = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ title: '', givenDate: '', dueDate: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const teacherSubject = user?.subject_code ? SUBJECTS[user.subject_code] : null;

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    const { getAssignments } = await import('../utils/assignments');
    const data = await getAssignments();
    // Filter to show only teacher's subject
    const filtered = data.filter(a => a.subject === user.subject_code);
    setAssignments(filtered);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { addAssignment, updateAssignment } = await import('../utils/assignments');
    const { getLocalISOString } = await import('../utils/schedule');
    
    const assignmentData = {
      ...form,
      subject: user.subject_code, // Force teacher's subject
      givenDate: form.givenDate || getLocalISOString(new Date())
    };

    let result;
    if (editing) {
      result = await updateAssignment(editing.id, assignmentData);
    } else {
      result = await addAssignment(assignmentData);
    }

    if (result.success) {
      setForm({ title: '', givenDate: '', dueDate: '', description: '' });
      setEditing(null);
      await loadAssignments();
      setMsg(editing ? 'Assignment updated!' : 'Assignment created!');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleEdit = (assignment) => {
    setEditing(assignment);
    setForm({
      title: assignment.title,
      givenDate: assignment.givenDate,
      dueDate: assignment.dueDate,
      description: assignment.description
    });
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this assignment?')) {
      const { deleteAssignment } = await import('../utils/assignments');
      await deleteAssignment(id);
      await loadAssignments();
      setMsg('Assignment deleted!');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '100%', padding: '1rem' }}>
      {/* Info Banner */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.1)' }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          📝 You can only create and manage assignments for <strong>{teacherSubject?.name || user.subject_code}</strong>
        </p>
      </div>

      {/* Assignment Form */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>{editing ? 'Edit Assignment' : 'Create New Assignment'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Assignment Title" 
            value={form.title} 
            onChange={e => setForm({...form, title: e.target.value})}
            required 
            style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: 'inherit' 
            }}
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', opacity: 0.8 }}>Given Date</label>
              <input 
                type="date" 
                value={form.givenDate} 
                onChange={e => setForm({...form, givenDate: e.target.value})}
                style={{ 
                  width: '100%',
                  padding: '12px', 
                  borderRadius: '8px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'inherit' 
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', opacity: 0.8 }}>Due Date</label>
              <input 
                type="date" 
                value={form.dueDate} 
                onChange={e => setForm({...form, dueDate: e.target.value})}
                required
                style={{ 
                  width: '100%',
                  padding: '12px', 
                  borderRadius: '8px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'inherit' 
                }}
              />
            </div>
          </div>

          <textarea 
            placeholder="Description (optional)" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})}
            rows={3}
            style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: 'inherit',
              resize: 'vertical'
            }}
          />

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn-primary">
              {editing ? 'Update' : 'Create'} Assignment
            </button>
            {editing && (
              <button 
                type="button" 
                onClick={() => {
                  setEditing(null);
                  setForm({ title: '', givenDate: '', dueDate: '', description: '' });
                }}
                style={{ 
                  padding: '0 1.5rem', 
                  background: 'transparent', 
                  border: '1px solid rgba(255,255,255,0.3)', 
                  color: 'inherit', 
                  borderRadius: '8px', 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {msg && <p style={{ color: '#2ed573', marginTop: '1rem' }}>{msg}</p>}
      </div>

      {/* Assignments List */}
      <h3 style={{ marginBottom: '1rem' }}>Your Assignments ({assignments.length})</h3>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {loading ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
        ) : assignments.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
            No assignments yet. Create one above!
          </div>
        ) : (
          assignments.map(a => (
            <div key={a.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{a.title}</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.3rem', opacity: 0.7 }}>
                  <span style={{ color: 'var(--accent)' }}>Given:</span> {new Date(a.givenDate).toLocaleDateString()} • 
                  <span style={{ color: '#ffa502' }}> Due:</span> {new Date(a.dueDate).toLocaleDateString()}
                </div>
                {a.description && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>{a.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => handleEdit(a)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    background: 'var(--accent)', 
                    color: 'var(--btn-text)', 
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(a.id)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    background: '#ff4757', 
                    color: 'white', 
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeacherAssignments;
