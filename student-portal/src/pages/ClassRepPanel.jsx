import React, { useState, useEffect } from 'react';
import { getScheduleForDate, saveCustomSchedule, SUBJECTS, fetchScheduleOverrides, addScheduleOverride, deleteScheduleOverride, getLocalISOString } from '../utils/schedule';
import { getAssignments, addAssignment, updateAssignment, deleteAssignment } from '../utils/assignments';
import { sanitizeInput } from '../utils/security';
import { LogOut, Calendar as CalIcon, Edit2, Save, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// import Notes from './Notes';

const ClassRepPanel = ({ user, onLogout }) => {
  const navigate = useNavigate();
  // Default to assignments as the primary view for CRs
  const [activeTab, setActiveTab] = useState('assignments'); 
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [overrideType, setOverrideType] = useState('holiday'); // 'holiday' or 'working'
  const [dayOrder, setDayOrder] = useState(0); // 0=Mon, 1=Tue, etc.
  const [scheduleOverrides, setScheduleOverrides] = useState([]);
  const [msg, setMsg] = useState('');
  
  // Clock State
  const [currentTime, setCurrentTime] = useState(new Date()); 

  // Timetable Editor State
  const [editDate, setEditDate] = useState(getLocalISOString(new Date()));
  const [editSchedule, setEditSchedule] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [overrideSubject, setOverrideSubject] = useState('');
  
  // Assignments State
  const [assignments, setAssignments] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({ title: '', subject: '', givenDate: '', dueDate: '', description: '' });
  const [editingAssignment, setEditingAssignment] = useState(null);

  // Loading State
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const GIT_VERSION = 'ca47b10';

  const fetchData = async () => {
    loadAssignments();
    loadScheduleOverrides();
  };

  useEffect(() => {
    fetchData();
    
    // Clock interval
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  const loadScheduleOverrides = async () => {
    const data = await fetchScheduleOverrides();
    setScheduleOverrides(data);
  };
  
  const loadAssignments = async () => {
    setLoadingAssignments(true);
    const data = await getAssignments();
    setAssignments(data);
    setLoadingAssignments(false);
  };

  const handleAddScheduleOverride = async (e) => {
      e.preventDefault();
      if(!holidayDate) return;
      
      if (overrideType === 'holiday') {
          // Declare a custom holiday
          const result = await addScheduleOverride(holidayDate, 'holiday', null, holidayName || 'Custom Holiday');
          if (result.success) {
              setMsg('Holiday Declared Successfully!');
          } else {
              setMsg(`Error: ${result.error}`);
          }
      } else if (overrideType === 'working') {
          // Convert to working day
          const result = await addScheduleOverride(holidayDate, 'working', dayOrder, `Following ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayOrder]} Order`);
          if (result.success) {
              setMsg('Day Converted Successfully!');
          } else {
              setMsg(`Error: ${result.error}`);
          }
      }
      
      setHolidayName('');
      setHolidayDate('');
      await loadScheduleOverrides();
      setTimeout(() => setMsg(''), 3000);
  };
  
  const handleDeleteOverride = async (date) => {
      if (confirm(`Remove schedule override for ${date}?`)) {
          const result = await deleteScheduleOverride(date);
          if (result.success) {
              setMsg('Override removed!');
              await loadScheduleOverrides();
              setTimeout(() => setMsg(''), 3000);
          }
      }
  };

  // Timetable Handlers
  useEffect(() => {
      const loadEditSchedule = async () => {
          if (activeTab === 'timetable' && editDate) {
              setLoadingTimetable(true);
              const loaded = await getScheduleForDate(new Date(editDate));
              // We need a mutable copy of the schedule array specifically
              setEditSchedule(loaded && loaded.schedule ? [...loaded.schedule] : []);
              setLoadingTimetable(false);
          }
      };
      loadEditSchedule();
  }, [editDate, activeTab]);

  const handleSlotClick = (idx, currentCode) => {
      setSelectedSlot(idx);
      setOverrideSubject(currentCode);
  };

  const saveSlotChange = () => {
      if (selectedSlot === null || !editSchedule) return;
      const newSched = [...editSchedule];
      // Preserve time, update code
      newSched[selectedSlot] = { ...newSched[selectedSlot], code: overrideSubject };
      setEditSchedule(newSched);
      setSelectedSlot(null);
  };

  const handleSaveTimetable = async () => {
      const success = await saveCustomSchedule(editDate, editSchedule);
      if (success) {
          setMsg(`Timetable for ${editDate} saved!`);
          setTimeout(() => setMsg(''), 3000);
      } else {
          setMsg('Error saving timetable.');
      }
  };

  // Assignments Handlers
  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    const sanitized = {
      title: sanitizeInput(assignmentForm.title),
      subject: sanitizeInput(assignmentForm.subject),
      givenDate: assignmentForm.givenDate || getLocalISOString(new Date()),
      dueDate: assignmentForm.dueDate,
      description: sanitizeInput(assignmentForm.description)
    };
    
    let result;
    if (editingAssignment) {
      result = await updateAssignment(editingAssignment.id, sanitized);
      if (result.success) setEditingAssignment(null);
    } else {
      result = await addAssignment(sanitized);
    }
    
    if (result.success) {
      setAssignmentForm({ title: '', subject: '', givenDate: '', dueDate: '', description: '' });
      await loadAssignments();
      setMsg(editingAssignment ? 'Assignment updated!' : 'Assignment saved!');
    } else {
      setMsg(`Error: ${result.message}`);
    }
    setTimeout(() => setMsg(''), 5000);
  };
  
  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      title: assignment.title,
      subject: assignment.subject,
      givenDate: assignment.givenDate || getLocalISOString(new Date()),
      dueDate: assignment.dueDate,
      description: assignment.description
    });
  };
  
  const handleDeleteAssignment = async (id) => {
    if (confirm('Delete this assignment?')) {
      await deleteAssignment(id);
      await loadAssignments();
      setMsg('Assignment deleted!');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  // Determine tabs based on access level
  // Level 1: Timetable, Assignments, Holidays
  // Level 2: Assignments, Holidays
  // Level 3: Assignments only
  const userLevel = user?.access_level || 3;
  const tabs = ['assignments'];
  
  if (userLevel <= 2) {
      tabs.push('holidays');
  }
  
  if (userLevel === 1) {
      tabs.unshift('timetable');
  }

  return (
    <div className="animate-fade-in admin-container" style={{ width: '100%', maxWidth: '100%' }}>
      
      {/* Navigation Tabs */}
      <div className="glass-panel admin-tabs" style={{ padding: '0.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            {tabs.map(tab => (
                 <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)} 
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeTab === tab ? 'var(--accent)' : 'transparent',
                        color: activeTab === tab ? 'var(--btn-text)' : 'inherit',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s',
                        opacity: activeTab === tab ? 1 : 0.7
                    }}
                >
                    {tab}
                </button>
            ))}
      </div>

      <div className="admin-content">
        
        {/* TIMETABLE TAB */}
        {activeTab === 'timetable' && (
            <div>
                 <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                     <input 
                        type="date" 
                        value={editDate} 
                        onChange={e => setEditDate(e.target.value)} 
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'inherit' }} 
                     />
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         {msg && <span style={{ color: '#2ed573' }}>{msg}</span>}
                         <button onClick={handleSaveTimetable} className="btn-primary" style={{ display: 'flex', gap: '5px' }}>
                             <Save size={16} /> Save Changes
                         </button>
                     </div>
                 </div>

                 {loadingTimetable ? (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.8 }}>
                        <div className="spinner" style={{ 
                            width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', 
                            borderLeftColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 1rem',
                            animation: 'spin 1s linear infinite' 
                        }}></div>
                        <p>Loading Timetable...</p>
                    </div>
                 ) : (
                 <>
                 {/* MOBILE VIEW cards */}
                 <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     {editSchedule && editSchedule.length > 0 ? (
                        editSchedule.map((slot, idx) => {
                            const subj = SUBJECTS[slot.code];
                             return (
                                <div key={idx} className="glass-panel" 
                                    onClick={() => handleSlotClick(idx, slot.code)}
                                    style={{ 
                                        padding: '1rem', 
                                        border: selectedSlot === idx ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                        background: selectedSlot === idx ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255,255,255,0.05)',
                                        cursor: 'pointer'
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>{slot.time}</span>
                                        {selectedSlot === idx && <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 'bold' }}>EDITING</span>}
                                    </div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                        {subj ? subj.name : slot.code}
                                    </div>
                                    {subj && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{slot.code}</div>}
                                </div>
                             )
                        })
                     ) : (
                         <p>No schedule available.</p>
                     )}
                 </div>

                 <div className="glass-panel desktop-only" style={{ padding: '1rem', overflowX: 'auto' }}>
                 {editSchedule && editSchedule.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: '600px' }}>
                          <thead>
                              <tr>
                                  <th style={{ textAlign: 'left', padding: '1rem', opacity: 0.7 }}>Time</th>
                                  {editSchedule.map((slot, idx) => (
                                      <th key={idx} style={{ textAlign: 'center', fontSize: '0.8rem', opacity: 0.7 }}>{slot.time}</th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>Subject</td>
                                  {editSchedule.map((slot, idx) => {
                                      const subj = SUBJECTS[slot.code];
                                      return (
                                          <td key={idx} 
                                              onClick={() => handleSlotClick(idx, slot.code)}
                                              style={{ 
                                                  padding: '1rem',
                                                  textAlign: 'center',
                                                  cursor: 'pointer',
                                                  background: selectedSlot === idx ? 'rgba(37, 99, 235, 0.3)' : (subj ? (subj.color ? subj.color + '44' : 'rgba(255,255,255,0.05)') : 'rgba(255,255,255,0.05)'),
                                                  borderRadius: '8px',
                                                  border: selectedSlot === idx ? '2px solid var(--accent)' : '1px solid transparent',
                                                  color: subj ? 'inherit' : 'inherit'
                                              }}
                                          >
                                             {subj ? subj.name : slot.code}
                                          </td>
                                      );
                                  })}
                              </tr>
                          </tbody>
                      </table>
                 ) : (
                     <p>No schedule found or it's a Holiday/Sunday.</p>
                 )}
                 </div>

                 {selectedSlot !== null && (
                     <div className="glass-panel" style={{ marginTop: '1rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                         <h4 style={{ marginBottom: '1rem' }}>Edit Slot: {editSchedule[selectedSlot]?.time}</h4>
                         <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                             <select 
                                 value={overrideSubject} 
                                 onChange={e => setOverrideSubject(e.target.value)}
                                 style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)' }}
                             >
                                 <option value="Break" style={{color: 'black'}}>Break</option>
                                 <option value="Lunch" style={{color: 'black'}}>Lunch</option>
                                 {Object.keys(SUBJECTS).filter(key => key !== 'Break' && key !== 'Lunch').map(code => (
                                     <option key={code} value={code} style={{color: 'black'}}>{SUBJECTS[code].name} _ {code}</option>
                                 ))}
                             </select>
                             <button onClick={saveSlotChange} className="btn-primary">Update Slot</button>
                             <button onClick={() => setSelectedSlot(null)} style={{ padding: '0 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'inherit', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                         </div>
                     </div>
                 )}
                 </>
                 )}
            </div>
        )}

         {/* ASSIGNMENTS TAB */}
         {activeTab === 'assignments' && (
             <div>
                {loadingAssignments ? (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.8 }}>
                        <div className="spinner" style={{ 
                            width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', 
                            borderLeftColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 1rem',
                            animation: 'spin 1s linear infinite' 
                        }}></div>
                        <p>Loading Assignments...</p>
                    </div>
                ) : (
                <>
                 <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                     <h3 style={{ marginBottom: '1rem' }}>{editingAssignment ? 'Edit Assignment' : 'Add New Assignment'}</h3>
                     <form onSubmit={handleAssignmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                         <input type="text" placeholder="Assignment Name" value={assignmentForm.title} onChange={e => setAssignmentForm({...assignmentForm, title: e.target.value})} required 
                             style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }} />
                         
                         <input type="text" placeholder="Subject" value={assignmentForm.subject} onChange={e => setAssignmentForm({...assignmentForm, subject: e.target.value})} required 
                             style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }} />
                         
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                           <div>
                             <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', opacity: 0.8 }}>Given Date</label>
                             <input type="date" value={assignmentForm.givenDate} onChange={e => setAssignmentForm({...assignmentForm, givenDate: e.target.value})} required 
                                 style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }} />
                           </div>
                           <div>
                             <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem', opacity: 0.8 }}>Submission Date</label>
                             <input type="date" value={assignmentForm.dueDate} onChange={e => setAssignmentForm({...assignmentForm, dueDate: e.target.value})} required 
                                 style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }} />
                           </div>
                         </div>
                         <textarea placeholder="Description (optional)" value={assignmentForm.description} onChange={e => setAssignmentForm({...assignmentForm, description: e.target.value})} rows={3} 
                             style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%', resize: 'vertical' }} />
                         
                         <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                             <button type="submit" className="btn-primary" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}><Plus size={16} /> {editingAssignment ? 'Update' : 'Add'} Assignment</button>
                             {editingAssignment && <button type="button" onClick={() => {setEditingAssignment(null); setAssignmentForm({ title: '', subject: '', givenDate: '', dueDate: '', description: '' });}} style={{ padding: '0 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'inherit', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>}
                         </div>
                     </form>
                     {msg && <p style={{ color: '#2ed573', marginTop: '1rem' }}>{msg}</p>}
                 </div>

                 <h3 style={{ marginBottom: '1rem' }}>All Assignments ({assignments.length})</h3>
                 <div style={{ display: 'grid', gap: '1rem' }}>
                     {assignments.map(a => (
                         <div key={a.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                             <div style={{ flex: 1 }}>
                                 <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{a.title}</div>
                                 <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.2rem' }}>{a.subject}</div>
                                 <div style={{ fontSize: '0.85rem', marginTop: '0.3rem', opacity: 0.7 }}>
                                   <span style={{ color: 'var(--accent)' }}>Given:</span> {new Date(a.givenDate).toLocaleDateString()} • <span style={{ color: '#ffa502' }}>Due:</span> {new Date(a.dueDate).toLocaleDateString()}
                                 </div>
                                 <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>{a.description}</p>
                             </div>
                             <div style={{ display: 'flex', gap: '0.5rem' }}>
                                 <button onClick={() => handleEditAssignment(a)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: 'var(--btn-text)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                 <button onClick={() => handleDeleteAssignment(a.id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#ff4757', color: 'white', cursor: 'pointer' }}><Trash2 size={16} /></button>
                             </div>
                         </div>
                     ))}
                     {assignments.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center' }}>No assignments yet. Add one above!</p>}
                 </div>
                 </>
                )}
             </div>
         )}

        {/* HOLIDAYS TAB */}
        {activeTab === 'holidays' && (
            <div>
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Schedule Management</h3>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                            <input 
                                type="radio" 
                                name="overrideType" 
                                value="holiday" 
                                checked={overrideType === 'holiday'} 
                                onChange={() => setOverrideType('holiday')}
                            />
                            Declare Holiday
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                            <input 
                                type="radio" 
                                name="overrideType" 
                                value="working" 
                                checked={overrideType === 'working'} 
                                onChange={() => setOverrideType('working')}
                            />
                            Convert to Working Day
                        </label>
                    </div>
                    
                    <form onSubmit={handleAddScheduleOverride} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input 
                            type="date" 
                            value={holidayDate} 
                            onChange={e => setHolidayDate(e.target.value)} 
                            required 
                            style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }} 
                        />
                        
                        {overrideType === 'holiday' && (
                            <input 
                                type="text" 
                                placeholder="Holiday Name (e.g. Pongal)" 
                                value={holidayName} 
                                onChange={e => setHolidayName(e.target.value)} 
                                style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }} 
                            />
                        )}
                        
                        {overrideType === 'working' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Follow which day's timetable?</label>
                                <select 
                                    value={dayOrder} 
                                    onChange={e => setDayOrder(parseInt(e.target.value))}
                                    style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)', width: '100%' }} 
                                >
                                    <option value={0} style={{color: 'black'}}>Monday</option>
                                    <option value={1} style={{color: 'black'}}>Tuesday</option>
                                    <option value={2} style={{color: 'black'}}>Wednesday</option>
                                    <option value={3} style={{color: 'black'}}>Thursday</option>
                                    <option value={4} style={{color: 'black'}}>Friday</option>
                                </select>
                            </div>
                        )}
                        
                        <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                            {overrideType === 'holiday' ? 'Declare Holiday' : 'Convert to Working Day'}
                        </button>
                    </form>
                    {msg && <p style={{ color: '#2ed573', marginTop: '1rem' }}>{msg}</p>}
                </div>
                
                <h3 style={{ marginBottom: '1rem' }}>Active Overrides</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {scheduleOverrides.map(override => (
                        <div key={override.date} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{new Date(override.date).toLocaleDateString()}</div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                    {override.type === 'holiday' ? `Holiday: ${override.name}` : `Working Day (${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][override.day_order]} Order)`}
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDeleteOverride(override.date)} 
                                style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#ff4757', color: 'white', cursor: 'pointer' }}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    {scheduleOverrides.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center' }}>No schedule overrides yet.</p>}
                </div>
            </div>
        )}

      </div>
      
      {/* Footer for Git Info */}
      <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          opacity: 0.5,
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          pointerEvents: 'none'
      }}>
          Build: {GIT_VERSION}
      </div>
    </div>
  );
};

export default ClassRepPanel;
