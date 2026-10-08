import React, { useState, useEffect } from 'react';
import { SUBJECTS } from '../utils/schedule';
import { STUDENT_DATA } from '../utils/studentData';
import { fetchMarksForSubject, saveStudentMark, calculateInternals } from '../utils/marks';
import { generateMarksExcel } from '../utils/exportUtils';
import { Download } from 'lucide-react';

const TeacherMarks = ({ user }) => {
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [exporting, setExporting] = useState(false);

  const teacherSubject = user?.subject_code ? SUBJECTS[user.subject_code] : null;

  useEffect(() => {
    loadMarks();
  }, []);

  const loadMarks = async () => {
    setLoading(true);
    try {
      const marksData = await fetchMarksForSubject(user.subject_code);
      const marksMap = {};
      marksData.forEach(m => {
        marksMap[m.student_id] = m;
      });
      setMarks(marksMap);
    } catch (error) {
      console.error('Error loading marks:', error);
    }
    setLoading(false);
  };

  const handleMarkChange = (studentId, field, value) => {
    const numValue = value === '' ? null : Number(value);
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        subject_code: user.subject_code,
        [field]: numValue
      }
    }));
  };

  const handleSave = async (studentId) => {
    try {
      const studentMarks = marks[studentId];
      if (!studentMarks) return;

      const result = await saveStudentMark(studentId, user.subject_code, {
        cat1: studentMarks.cat1 ?? null,
        cat2: studentMarks.cat2 ?? null,
        model: studentMarks.model ?? null,
        assignment1: studentMarks.assignment1 ?? null,
        assignment2: studentMarks.assignment2 ?? null,
        seminar: studentMarks.seminar ?? null
      });

      if (!result.success) {
        setMsg('Error saving marks: ' + result.message);
      } else {
        const student = STUDENT_DATA.find(s => s.id === studentId);
        setMsg(`✅ Marks saved for ${student?.name}`);
        setEditingStudent(null);
      }

      setTimeout(() => setMsg(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMsg('An unexpected error occurred');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      generateMarksExcel(
        user.subject_code,
        teacherSubject?.name || user.subject_code,
        marks,
        STUDENT_DATA,
        calculateInternals
      );
    } catch (e) {
      console.error('Export error:', e);
    }
    setExporting(false);
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '100%', padding: '1rem' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        {/* Info Banner */}
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.1)', flex: 1, marginRight: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            📊 You can only enter and edit marks for <strong>{teacherSubject?.name || user.subject_code}</strong>
          </p>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none',
            background: 'rgba(46, 213, 115, 0.15)', color: '#2ed573',
            cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
            whiteSpace: 'nowrap',
            outline: '1px solid rgba(46, 213, 115, 0.3)',
            transition: 'background 0.2s'
          }}
        >
          <Download size={16} />
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      {msg && (
        <div className="glass-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', background: 'rgba(46, 213, 115, 0.15)', color: '#2ed573' }}>
          {msg}
        </div>
      )}

      {/* Marks Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>
          Student Marks Entry
          <span style={{ fontSize: '0.85rem', opacity: 0.5, marginLeft: '0.75rem', fontWeight: 'normal' }}>
            ({STUDENT_DATA.length} students)
          </span>
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.75rem', opacity: 0.6, fontSize: '0.8rem', width: '50px' }}>#</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', opacity: 0.6, fontSize: '0.8rem' }}>Student</th>
                <th style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>CAT1<br/>(50)</th>
                <th style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>CAT2<br/>(50)</th>
                <th style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>Model<br/>(100)</th>
                <th style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>Assign 1<br/>(5)</th>
                <th style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>Assign 2<br/>(5)</th>
                <th style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>Seminar<br/>(5)</th>
                <th style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>Internal<br/>(50)</th>
                <th style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {STUDENT_DATA.map((student, index) => {
                const studentMarks = marks[student.id] || {};
                const isEditing = editingStudent === student.id;
                const { total } = calculateInternals(studentMarks);
                const totalColor = total >= 40 ? '#2ed573' : total >= 25 ? '#ffa502' : total > 0 ? '#ff4757' : 'inherit';

                const inputStyle = {
                  width: '60px',
                  padding: '6px',
                  borderRadius: '6px',
                  background: isEditing ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: isEditing ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: 'inherit',
                  textAlign: 'center',
                  outline: 'none'
                };

                return (
                  <tr
                    key={student.id}
                    style={{ background: isEditing ? 'rgba(99,102,241,0.05)' : 'transparent', borderRadius: '8px' }}
                  >
                    <td style={{ padding: '0.6rem 0.75rem', opacity: 0.4, fontSize: '0.8rem' }}>{index + 1}</td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{student.name}</div>
                      <div style={{ opacity: 0.5, fontSize: '0.75rem' }}>{student.id}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                      <input type="number" value={studentMarks.cat1 ?? ''} min="0" max="50"
                        onChange={e => handleMarkChange(student.id, 'cat1', e.target.value)}
                        onFocus={() => setEditingStudent(student.id)} style={inputStyle} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                      <input type="number" value={studentMarks.cat2 ?? ''} min="0" max="50"
                        onChange={e => handleMarkChange(student.id, 'cat2', e.target.value)}
                        onFocus={() => setEditingStudent(student.id)} style={inputStyle} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                      <input type="number" value={studentMarks.model ?? ''} min="0" max="100"
                        onChange={e => handleMarkChange(student.id, 'model', e.target.value)}
                        onFocus={() => setEditingStudent(student.id)} style={inputStyle} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                      <input type="number" value={studentMarks.assignment1 ?? ''} min="0" max="5"
                        onChange={e => handleMarkChange(student.id, 'assignment1', e.target.value)}
                        onFocus={() => setEditingStudent(student.id)} style={inputStyle} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                      <input type="number" value={studentMarks.assignment2 ?? ''} min="0" max="5"
                        onChange={e => handleMarkChange(student.id, 'assignment2', e.target.value)}
                        onFocus={() => setEditingStudent(student.id)} style={inputStyle} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                      <input type="number" value={studentMarks.seminar ?? ''} min="0" max="5"
                        onChange={e => handleMarkChange(student.id, 'seminar', e.target.value)}
                        onFocus={() => setEditingStudent(student.id)} style={inputStyle} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.6rem', fontWeight: 'bold', color: totalColor }}>
                      {total > 0 ? total.toFixed(1) : '—'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.4rem' }}>
                      <button
                        onClick={() => handleSave(student.id)}
                        style={{
                          padding: '6px 14px', borderRadius: '6px', border: 'none',
                          background: isEditing ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                          color: isEditing ? 'var(--btn-text)' : 'inherit',
                          cursor: 'pointer', fontSize: '0.82rem', fontWeight: 'bold',
                          transition: 'background 0.2s'
                        }}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeacherMarks;
