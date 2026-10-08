import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../utils/schedule';
import { calculateInternals, fetchMarksForSubject, fetchStudentMarks, saveStudentMark } from '../utils/marks';
import { STUDENT_DATA } from '../utils/studentData';
import { ArrowLeft, Save, Calculator, Award } from 'lucide-react';

const MarksTracker = ({ user }) => {
    const navigate = useNavigate();
    const [selectedSubject, setSelectedSubject] = useState(Object.keys(SUBJECTS)[0]);
    const [marksData, setMarksData] = useState({}); // Map of studentId -> marksObj
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const isRep = user?.role === 'ClassRep' || user?.role === 'Admin';

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        loadData();
    }, [selectedSubject, user]);

    const loadData = async () => {
        setLoading(true);
        if (isRep) {
            // Rep fetches ALL marks for subject
            const data = await fetchMarksForSubject(selectedSubject);
            const map = {};
            data.forEach(m => map[m.student_id] = m);
            setMarksData(map);
        } else {
            // Student fetches ALL their own marks (across subjects)
            // But here we might just want to show the selected subject?
            // Actually simpler to fetch all their marks once
            const data = await fetchStudentMarks(user.id);
            const map = {};
            data.forEach(m => map[m.subject_code] = m);
            setMarksData(map);
        }
        setLoading(false);
    };

    const handleInputChange = (studentId, field, value) => {
        setMarksData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSave = async (studentIdOrSubjectCode) => {
        setSaving(true);
        // If rep, arg is studentId. If student, arg is SubjectCode (and we use user.id)
        const targetId = isRep ? studentIdOrSubjectCode : user.id;
        const targetSubject = isRep ? selectedSubject : studentIdOrSubjectCode;

        // For student view, we use the subject code as key in marksData
        // For rep view, we use studentId as key in marksData
        const marksKey = isRep ? targetId : targetSubject;
        const marks = marksData[marksKey] || {};
        
        // Sanitize numbers
        const cleanMarks = {
            cat1: Math.min(50, Number(marks.cat1 || 0)),
            cat2: Math.min(50, Number(marks.cat2 || 0)),
            model: Math.min(100, Number(marks.model || 0)),
            assignment1: Math.min(5, Number(marks.assignment1 || 0)),
            assignment2: Math.min(5, Number(marks.assignment2 || 0)),
            seminar: Math.min(5, Number(marks.seminar || 0)),
        };

        const result = await saveStudentMark(targetId, targetSubject, cleanMarks);
        if (result.success) {
            // alert('Saved!'); // Small update: remove alert for smoother UX or use toast
            // Toggle edit mode off if student
            if (!isRep) {
                setMarksData(prev => ({
                    ...prev,
                    [targetSubject]: { ...prev[targetSubject], _isEditing: false }
                }));
            }
        } else {
            alert('Failed to save: ' + result.message);
        }
        setSaving(false);
    };

    // --- STUDENT VIEW ---
    if (!isRep) {
        // Show cards for all subjects
        const subjectsList = Object.entries(SUBJECTS).filter(([k,v]) => k !== 'Break' && k !== 'Lunch');
        
        return (
            <div className="page-container">
                 <button 
                    onClick={() => navigate('/dashboard')} 
                    className="glass-panel" 
                    style={{ 
                        marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        padding: '0.8rem 1.2rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    <ArrowLeft size={20} /> Back
                </button>
                <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                    <Award /> Internal Marks Calculator
                </h2>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {subjectsList.map(([code, subj]) => {
                        const marks = marksData[code] || {};
                        const { total, breakdown } = calculateInternals(marks);
                        // Progress color
                        const scoreColor = total >= 40 ? '#2ed573' : total >= 25 ? '#ffa502' : '#ff4757';
                        
                        // Toggle for student editing (local state for UI only, saving goes to DB)
                        const isEditing = marks._isEditing;

                        const toggleEdit = () => {
                            setMarksData(prev => ({
                                ...prev,
                                [code]: { ...prev[code], _isEditing: !isEditing }
                            }));
                        };

                        const handleStudentInput = (field, val) => {
                             setMarksData(prev => ({
                                ...prev,
                                [code]: { ...prev[code], [field]: val }
                            }));
                        };

                        return (
                            <div key={code} className="glass-panel" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent)' }}>{subj.name}</h3>
                                        <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1rem' }}>{code}</p>
                                    </div>
                                    <button 
                                        onClick={isEditing ? () => handleSave(code) : toggleEdit}
                                        style={{ 
                                            background: isEditing ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                                            border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', color: 'white' 
                                        }}
                                        title={isEditing ? "Save Marks" : "Edit Marks"}
                                    >
                                        {isEditing ? <Save size={18} /> : <Calculator size={18} />}
                                    </button>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Projected Internal</div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: scoreColor }}>
                                            {total.toFixed(1)} <span style={{ fontSize: '1rem', opacity: 0.5 }}>/ 50</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    {/* Fields List */}
                                    {[
                                        { key: 'cat1', label: 'CAT 1', max: 50 },
                                        { key: 'cat2', label: 'CAT 2', max: 50 },
                                        { key: 'model', label: 'Model', max: 100 },
                                        { key: 'assignment1', label: 'Assign 1', max: 5 },
                                        { key: 'assignment2', label: 'Assign 2', max: 5 },
                                        { key: 'seminar', label: 'Seminar', max: 5 }
                                    ].map(item => (
                                        <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{opacity:0.6}}>{item.label}</span>
                                            {isEditing ? (
                                                <input 
                                                    type="number" 
                                                    value={marks[item.key] || ''}
                                                    onChange={(e) => handleStudentInput(item.key, e.target.value)}
                                                    placeholder="0"
                                                    style={{ 
                                                        width: '60px', padding: '2px 5px', borderRadius: '4px', border: 'none', 
                                                        background: 'rgba(0,0,0,0.3)', color: 'white', textAlign: 'right' 
                                                    }}
                                                />
                                            ) : (
                                                <span style={{color: '#7bed9f'}}>
                                                    {marks[item.key] || 0} <span style={{opacity:0.5, fontSize:'0.7rem'}}>/ {item.max}</span>
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- REP VIEW ---
    return (
        <div className="page-container" style={{ maxWidth: '1200px' }}>
             <button 
                onClick={() => navigate('/dashboard')} 
                className="glass-panel" 
                style={{ 
                    marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                    padding: '0.8rem 1.2rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)'
                }}
            >
                <ArrowLeft size={20} /> Back
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'white', margin: 0 }}>Manage Exam Marks</h2>
                
                {/* Subject Selector */}
                <select 
                    value={selectedSubject} 
                    onChange={e => setSelectedSubject(e.target.value)}
                    style={{ 
                        padding: '10px', borderRadius: '8px', 
                        background: 'rgba(255,255,255,0.1)', color: 'white', 
                        border: '1px solid rgba(255,255,255,0.2)', minWidth: '200px' 
                    }}
                >
                    {Object.entries(SUBJECTS)
                        .filter(([k]) => k !== 'Break' && k !== 'Lunch')
                        .map(([code, subj]) => (
                        <option key={code} value={code} style={{background: '#333'}}>
                            {code} - {subj.name}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? <p style={{color:'white'}}>Loading Marks...</p> : (
                <div className="glass-panel" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>Roll No</th>
                                <th style={{ padding: '1rem' }}>Name</th>
                                <th style={{ padding: '1rem', width: '80px' }}>CAT 1 (50)</th>
                                <th style={{ padding: '1rem', width: '80px' }}>CAT 2 (50)</th>
                                <th style={{ padding: '1rem', width: '80px' }}>Model (100)</th>
                                <th style={{ padding: '1rem', width: '60px' }}>A1 (5)</th>
                                <th style={{ padding: '1rem', width: '60px' }}>A2 (5)</th>
                                <th style={{ padding: '1rem', width: '60px' }}>Sem (5)</th>
                                <th style={{ padding: '1rem', width: '100px' }}>Internal (50)</th>
                                <th style={{ padding: '1rem' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {STUDENT_DATA.map(student => {
                                const marks = marksData[student.id] || {}; // marks for this student (fetched by subject)
                                const { total } = calculateInternals(marks);

                                return (
                                    <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.8rem 1rem', opacity: 0.7 }}>{student.id.slice(-3)}</td>
                                        <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold' }}>{student.name}</td>
                                        
                                        {/* INPUTS */}
                                        {['cat1', 'cat2', 'model', 'assignment1', 'assignment2', 'seminar'].map(field => (
                                            <td key={field} style={{ padding: '0.5rem' }}>
                                                <input 
                                                    type="number"
                                                    value={marks[field] || ''}
                                                    onChange={e => handleInputChange(student.id, field, e.target.value)}
                                                    style={{ 
                                                        width: '100%', padding: '5px', 
                                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '4px', color: 'white', textAlign: 'center'
                                                    }}
                                                    placeholder="0"
                                                />
                                            </td>
                                        ))}

                                        <td style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: total >= 25 ? '#2ed573' : '#ff4757' }}>
                                            {total.toFixed(1)}
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <button 
                                                onClick={() => handleSave(student.id)}
                                                disabled={saving}
                                                style={{ 
                                                    background: 'var(--primary)', border: 'none', 
                                                    borderRadius: '4px', padding: '6px', cursor: 'pointer', color: 'white'
                                                }}
                                            >
                                                <Save size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MarksTracker;
