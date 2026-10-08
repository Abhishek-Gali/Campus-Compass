import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMockAttendance, saveMockAttendance, deleteMockAttendance, getAttendanceSummary, subscribeToAttendanceForDate } from '../utils/mockAttendance';
import { getScheduleForDate, subscribeToScheduleUpdates, getLocalISOString, SUBJECTS } from '../utils/schedule';
import { STUDENT_DATA } from '../utils/studentData';
import { Check, X, AlertCircle, Save, Calendar, Search, ArrowLeft, Trash2, Clock, Download, Upload, List, Plus, Tag } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const MockAttendance = ({ user }) => {
  const navigate = useNavigate();
  const [date, setDate] = useState(getLocalISOString(new Date()));
  const [schedule, setSchedule] = useState([]); // Array of slots for the selected date
  const [selectedSlot, setSelectedSlot] = useState(null); // The period object being attended { time, code, name ... }
  const [attendanceTakenPeriods, setAttendanceTakenPeriods] = useState(new Set()); // Track periods with attendance already taken
  
  const [attendanceMap, setAttendanceMap] = useState({}); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  
  // Modal for OD Reason
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudentForReason, setSelectedStudentForReason] = useState(null);
  const [reasonInput, setReasonInput] = useState('');

  // OD Presets
  const [odPresets, setOdPresets] = useState(() => {
    try {
        return JSON.parse(localStorage.getItem('od_presets')) || ['Sports Meet', 'Medical', 'Symposium', 'NSS/NCC', 'Placement'];
    } catch {
        return ['Sports Meet', 'Medical', 'Symposium', 'NSS/NCC', 'Placement'];
    }
  });
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [newPreset, setNewPreset] = useState('');

  useEffect(() => {
    localStorage.setItem('od_presets', JSON.stringify(odPresets));
  }, [odPresets]);

  const addPreset = () => {
    if(!newPreset.trim()) return;
    if(!odPresets.includes(newPreset.trim())) {
        setOdPresets([...odPresets, newPreset.trim()]);
    }
    setNewPreset('');
  };

  const deletePreset = (preset) => {
    setOdPresets(odPresets.filter(p => p !== preset));
  };

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Access Level
  const userRole = user?.role;
  const userLevel = userRole === 'Admin' ? 0 : (userRole === 'Teacher' ? 2 : (user?.access_level || 3));
  const teacherSubject = userRole === 'Teacher' ? user?.subject_code : null;

  useEffect(() => {
    if (!user || (user.role !== 'Admin' && user.role !== 'ClassRep' && user.role !== 'Teacher')) {
        navigate('/');
        return;
    }
    
    fetchSchedule();
    
    // Subscribe to global schedule updates (Local logic)
    const unsubscribeSchedule = subscribeToScheduleUpdates(() => {
        console.log('MockAttendance received schedule update. Refreshing...');
        fetchSchedule();
    });

    // Subscribe to Realtime Attendance Updates (Supabase)
    // This ensures green checks appear instantly when someone else takes attendance
    const unsubscribeAttendance = subscribeToAttendanceForDate(date, () => {
        console.log('Realtime Attendance Update received. Refreshing...');
        fetchSchedule();
    });

    // Reset slot selection when date changes
    setSelectedSlot(null);
    setMsg({ text: '', type: '' });
    
    return () => {
        unsubscribeSchedule();
        unsubscribeAttendance();
    };
  }, [date, user]);

  const fetchSchedule = async () => {
      setLoading(true);
      const data = await getScheduleForDate(new Date(date));
      let scheduledPeriods = [];
      if (data && data.schedule) {
          // Flatten/Process schedule items to ensure they are valid periods
          // Filter out Lunch/Break if desired, but user might want to check them (unlikely for attendance, but keeping logic flexible)
          scheduledPeriods = data.schedule.filter(s => s.code !== 'Break' && s.code !== 'Lunch');
          
          // For teachers, filter to only their subject
          if (userRole === 'Teacher' && teacherSubject) {
              scheduledPeriods = scheduledPeriods.filter(s => s.code === teacherSubject);
          }
          
          setSchedule(scheduledPeriods); 
      } else {
          setSchedule([]);
      }
      
      // Check which periods already have attendance taken
      // Check which periods already have attendance taken (Optimized for Egress)
      const { success, periods } = await getAttendanceSummary(date);
      if (success && periods) {
          setAttendanceTakenPeriods(new Set(periods));
      } else {
          setAttendanceTakenPeriods(new Set());
      }
      
      setLoading(false);
  };

  const handleSlotSelect = async (slot) => {
      // PERMISSION CHECK for Level 2 (Advance attendance blocking)
      if (userLevel >= 2) { // Level 2 and 3
          // Parse slot time (e.g. "08:30 - 11:00")
          const now = new Date();
          const selectedDate = new Date(date);
          
          // If selected date is future -> Block
          // Compare YYYY-MM-DD
          const todayStr = getLocalISOString(now);
          
          if (date > todayStr) {
               alert("Advance attendance is restricted to Admin & Level 1.");
               return;
          }

          // If date is today, check time
          if (date === todayStr) {
              const endTimeStr = slot.time.split(' - ')[1].trim(); // "11:00"
              const [endH, endM] = endTimeStr.split(':').map(Number);
              const slotEnd = new Date(now);
              slotEnd.setHours(endH, endM, 0);

              // Allow if current time >= slotStartTime? Or just open it. 
              // Requirement: "level 2 should wait till the time comes"
              // Interpret as: Can start marking once the period STARTS.
              const startTimeStr = slot.time.split(' - ')[0].trim();
              const [startH, startM] = startTimeStr.split(':').map(Number);
              const slotStart = new Date(now);
              slotStart.setHours(startH, startM, 0);

              if (now < slotStart) {
                  alert(`Please wait until ${startTimeStr} to mark this period.`);
                  return;
              }
          }
      }

      setLoading(true);
      setSelectedSlot(slot);
      
      // Fetch attendance for this specific slot
      // We use the period "code" + "time" as unique ID for the period if possible. 
      // But multiple periods might have same code. Ideally index.
      // Let's use `slot.time` as the unique period identifier for that day.
      const periodId = `${slot.code}_${slot.time}`; // Robust key
      
      const { success, data } = await fetchMockAttendance(date, periodId);
      
      const newMap = {};
      STUDENT_DATA.forEach(student => {
          newMap[student.id] = { status: 'Present', reason: '' };
      });

      if (success && data) {
          data.forEach(record => {
              newMap[record.student_id] = { 
                  status: record.status, 
                  reason: record.reason || '' 
              };
          });
      }
      
      setAttendanceMap(newMap);
      setLoading(false);
  };

  const handleStatusChange = (id, newStatus) => {
      if (newStatus === 'On-Duty') {
          setSelectedStudentForReason(id);
          setReasonInput(attendanceMap[id]?.reason || '');
          setModalOpen(true);
      } else {
          setAttendanceMap(prev => ({
              ...prev,
              [id]: { ...prev[id], status: newStatus, reason: '' } 
          }));
      }
  };

  const saveReason = () => {
      if (!selectedStudentForReason) return;
      if (!reasonInput.trim()) {
          alert("Reason is required for On-Duty");
          return;
      }
      setAttendanceMap(prev => ({
          ...prev,
          [selectedStudentForReason]: { ...prev[selectedStudentForReason], status: 'On-Duty', reason: reasonInput }
      }));
      setModalOpen(false);
      setSelectedStudentForReason(null);
  };

  const handleSave = async () => {
      setSaving(true);
      setMsg({ text: '', type: '' });

      const updates = STUDENT_DATA.map(student => ({
          student_id: student.id,
          ...attendanceMap[student.id]
      }));

      const periodId = `${selectedSlot.code}_${selectedSlot.time}`;
      const result = await saveMockAttendance(date, periodId, updates, userRole, userLevel);
      
      if (result.success) {
          setMsg({ text: result.message, type: 'success' });
          // Mark this period as having attendance taken
          setAttendanceTakenPeriods(prev => new Set([...prev, periodId]));
      } else {
          setMsg({ text: result.error || result.message, type: 'error' });
      }
      setSaving(false);
  };

  const handleDeleteAll = async () => {
      if (!confirm("Are you sure you want to DELETE all attendance records for this period?")) return;
      
      setSaving(true);
      const periodId = `${selectedSlot.code}_${selectedSlot.time}`;
      const result = await deleteMockAttendance(date, periodId);
      
      if (result.success) {
         setMsg({ text: 'Records Deleted. Resetting to Default.', type: 'success' });
         // Reset map
         const newMap = {};
         STUDENT_DATA.forEach(student => {
             newMap[student.id] = { status: 'Present', reason: '' };
         });
         setAttendanceMap(newMap);
         // Remove this period from the "attendance taken" set
         setAttendanceTakenPeriods(prev => {
             const newSet = new Set(prev);
             newSet.delete(periodId);
             return newSet;
         });
      } else {
         setMsg({ text: result.error, type: 'error' });
      }
      setSaving(false);
  };

  // --- EXCEL LOGIC ---
  const handleExportExcel = () => {
      if (!selectedSlot) return;

      // 1. Create Header Rows
      const subjectName = SUBJECTS[selectedSlot.code]?.name || selectedSlot.name || selectedSlot.code;
      const headerRows = [
        [`Date: ${date}`, `Day: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}`, `Time: ${selectedSlot.time}`, `Subject: ${selectedSlot.code} - ${subjectName}`],
        [], // Empty row for spacing
        ['Register No', 'Name', 'Status', 'Reason'] // Column Headers
      ];

      // 2. Create Data Rows
      const dataRows = STUDENT_DATA.map(student => [
          student.id,
          student.name,
          attendanceMap[student.id]?.status || 'Present',
          attendanceMap[student.id]?.reason || ''
      ]);

      // 3. Combine
      const finalData = [...headerRows, ...dataRows];

      const worksheet = XLSX.utils.aoa_to_sheet(finalData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
      
      // Styling cols (optional, Basic)
      const wscols = [
          {wch: 15}, // RegNo
          {wch: 30}, // Name
          {wch: 10}, // Status
          {wch: 30}  // Reason
      ];
      worksheet['!cols'] = wscols;

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      
      const fileName = `Attendance_${date}_${selectedSlot.code}.xlsx`;
      saveAs(data, fileName);
  };

  const handleImportExcel = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const wsname = workbook.SheetNames[0];
          const ws = workbook.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          // Process Data
          const newMap = { ...attendanceMap };
          let updatedCount = 0;
          let errorCount = 0;

          data.forEach(row => {
              const regNo = row['Register No'];
              const status = row['Status'];
              const reason = row['Reason'];

              // Basic validation
              if (regNo && STUDENT_DATA.find(s => s.id === regNo)) {
                  if (['Present', 'Absent', 'On-Duty'].includes(status)) {
                       newMap[regNo] = { status, reason: reason || '' };
                       updatedCount++;
                  }
              } else {
                  errorCount++;
              }
          });

          setAttendanceMap(newMap);
          setMsg({ text: `Imported ${updatedCount} records. ${errorCount > 0 ? `(${errorCount} skipped/invalid)` : ''}`, type: 'success' });
          
          // Clear input
          e.target.value = '';
      };
      reader.readAsBinaryString(file);
  };


  // Filtered List
  const filteredStudents = STUDENT_DATA.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.id.includes(searchTerm)
  );

  const absents = STUDENT_DATA.filter(s => attendanceMap[s.id]?.status === 'Absent');
  const onDuties = STUDENT_DATA.filter(s => attendanceMap[s.id]?.status === 'On-Duty');

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {selectedSlot && (
                    <button onClick={() => setSelectedSlot(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                        <ArrowLeft size={24} />
                    </button>
                )}
                <div>
                     <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                         {selectedSlot ? 'Mark Attendance' : 'Select Period'}
                     </h2>
                     <div style={{ opacity: 0.7 }}>
                         {userRole === 'Admin' ? 'Administrator' : (userRole === 'Teacher' ? `Teacher (${user.subject_code})` : `Class Rep (Level ${userLevel})`)} • {date}
                     </div>
                </div>
            </div>
            
            {!selectedSlot && (
                <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Calendar size={18} />
                    <input 
                        type="date" 
                        value={date}
                        max={userRole === 'Teacher' ? getLocalISOString(new Date()) : undefined}
                        onChange={(e) => setDate(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: 'inherit', fontFamily: 'inherit', fontSize: '1rem' }}
                    />
                </div>
            )}
        </div>

        {/* VIEW 1: PERIOD SELECTOR */}
        {!selectedSlot && (
            <div className="glass-panel" style={{ padding: '1rem' }}>
                {loading ? <p>Loading Schedule...</p> : (
                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                        {schedule.length > 0 ? schedule.map((slot, idx) => {
                            const periodId = `${slot.code}_${slot.time}`;
                            const isAttendanceTaken = attendanceTakenPeriods.has(periodId);
                            
                            return (
                            <div 
                                key={idx} 
                                onClick={() => handleSlotSelect(slot)}
                                className="glass-panel"
                                style={{ 
                                    padding: '1.5rem', cursor: 'pointer',
                                    background: isAttendanceTaken ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255,255,255,0.05)',
                                    border: isAttendanceTaken ? '1px solid rgba(46, 213, 115, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                    transition: 'transform 0.2s, background 0.2s',
                                    position: 'relative'
                                }}
                            >
                                {isAttendanceTaken && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '8px', 
                                        right: '8px', 
                                        background: '#2ed573', 
                                        borderRadius: '50%', 
                                        width: '24px', 
                                        height: '24px',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center'
                                    }}>
                                        <Check size={14} color="white" />
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', opacity: 0.7 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={14} /> {slot.time}</span>
                                    <span>{slot.code}</span>
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                    {slot.type === 'Lab' ? `${slot.code} (Lab)` : (slot.name || slot.code)}
                                </div>
                            </div>
                            );
                        }) : (
                            <p style={{ opacity: 0.6 }}>No periods found for this date (Holiday or Sunday).</p>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* VIEW 2: STUDENT LIST */}
        {selectedSlot && (
            <>
                {/* Header Info with Subject Name */}
                <div style={{ marginBottom: '1rem', opacity: 0.8, fontSize: '1.1rem' }}>
                    Taking attendance for: <b style={{ color: 'var(--accent)' }}>{selectedSlot.name || selectedSlot.code}</b> ({selectedSlot.time})
                </div>

                <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     {/* Search & Actions */}
                     <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                         <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                             <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                             <input 
                                type="text" 
                                placeholder="Search Student..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ 
                                    width: '100%', padding: '10px 10px 10px 40px', 
                                    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', 
                                    background: 'rgba(255,255,255,0.05)', color: 'white' 
                                }}
                             />
                         </div>
                         
                         <div style={{ display: 'flex', gap: '0.5rem' }}>
                             {/* EXPORT */}
                             <button
                                onClick={handleExportExcel}
                                className="btn-secondary"
                                style={{ 
                                    padding: '0 1rem', borderRadius: '8px', 
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)',
                                    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'
                                }}
                                title="Export to Excel"
                             >
                                 <Download size={18} /> Export
                             </button>

                             {/* IMPORT */}
                             <label 
                                className="btn-secondary"
                                style={{ 
                                    padding: '0 1rem', borderRadius: '8px', 
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)',
                                    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'
                                }}
                                title="Import from Excel"
                             >
                                 <Upload size={18} /> Import
                                 <input 
                                     type="file" 
                                     accept=".xlsx, .xls, .csv" 
                                     onChange={handleImportExcel}
                                     style={{ display: 'none' }}
                                 />
                             </label>

                             {/* DELETE (Admin Only) */}
                             {userRole === 'Admin' && (
                                 <button 
                                    onClick={handleDeleteAll}
                                    style={{ 
                                        padding: '0 1rem', borderRadius: '8px', border: '1px solid #ff4757', 
                                        background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '5px'
                                    }}
                                    title="Delete all records for this period"
                                 >
                                     <Trash2 size={18} />
                                 </button>
                             )}

                             {/* PRESETS BUTTON */}
                             <button
                                onClick={() => setShowPresetManager(true)}
                                className="btn-secondary"
                                style={{ 
                                    padding: '0 1rem', borderRadius: '8px', 
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)',
                                    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'
                                }}
                                title="Manage OD Presets"
                             >
                                 <List size={18} /> Manage Presets
                             </button>
                         </div>
                         </div>
                     
                     {msg.text && (
                         <div style={{ 
                             padding: '10px', borderRadius: '8px', 
                             background: msg.type === 'error' ? 'rgba(255, 71, 87, 0.1)' : 'rgba(46, 213, 115, 0.1)',
                             color: msg.type === 'error' ? '#ff4757' : '#2ed573'
                         }}>
                             {msg.text}
                         </div>
                     )}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>Loading data...</div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {filteredStudents.map(student => {
                            const status = attendanceMap[student.id]?.status || 'Present';
                            
                            return (
                                <div key={student.id} className="glass-panel" style={{ 
                                    padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    borderLeft: status === 'Absent' ? '4px solid #ff4757' : (status === 'On-Duty' ? '4px solid #ffa502' : '4px solid #2ed573')
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{student.name}</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{student.id}</div>
                                        {status === 'On-Duty' && attendanceMap[student.id]?.reason && (
                                            <div style={{ fontSize: '0.8rem', color: '#ffa502', marginTop: '2px' }}>
                                                OD: {attendanceMap[student.id].reason}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button 
                                            onClick={() => handleStatusChange(student.id, 'Present')}
                                            style={{ 
                                                width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #2ed573',
                                                background: status === 'Present' ? '#2ed573' : 'transparent',
                                                color: status === 'Present' ? 'white' : '#2ed573',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            <Check size={20} />
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleStatusChange(student.id, 'On-Duty')}
                                            style={{ 
                                                width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #ffa502',
                                                background: status === 'On-Duty' ? '#ffa502' : 'transparent',
                                                color: status === 'On-Duty' ? 'white' : '#ffa502',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            <AlertCircle size={20} />
                                        </button>

                                        <button 
                                            onClick={() => handleStatusChange(student.id, 'Absent')}
                                            style={{ 
                                                width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #ff4757',
                                                background: status === 'Absent' ? '#ff4757' : 'transparent',
                                                color: status === 'Absent' ? 'white' : '#ff4757',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* BOTTOM SUMMARY & SAVE */}
                {/* BOTTOM SUMMARY & SAVE */}
                <div style={{ 
                    position: 'relative', // Changed from sticky to relative/static
                    background: 'var(--bg-primary)', 
                    borderTop: '1px solid var(--glass-border)',
                    padding: '1rem', 
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
                    marginTop: '2rem' 
                }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
                            {absents.length > 0 && (
                                <div>
                                    <span style={{ color: '#ff4757', fontWeight: 'bold' }}>Absentees ({absents.length}):</span>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.8, whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: '400px' }}>
                                        {absents.map(s => s.name).join(', ')}
                                    </div>
                                </div>
                            )}
                            {onDuties.length > 0 && (
                                <div>
                                    <span style={{ color: '#ffa502', fontWeight: 'bold' }}>On-Duty ({onDuties.length}):</span>
                                     <div style={{ fontSize: '0.8rem', opacity: 0.8, maxWidth: '300px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                        {onDuties.map(s => s.name).join(', ')}
                                    </div>
                                </div>
                            )}
                            {absents.length === 0 && onDuties.length === 0 && <span style={{ opacity: 0.6 }}>All Present</span>}
                        </div>

                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="btn-primary" 
                            style={{ padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                             {saving ? 'Saving...' : <><Save size={20} /> Save Attendance</>}
                        </button>
                    </div>
                </div>
            </>
        )}

        {/* PRESET MANAGER MODAL */}
        {showPresetManager && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
                 <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', background: '#1e1e1e' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: '#ffffff' }}>Manage OD Presets</h3>
                        <button onClick={() => setShowPresetManager(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                     </div>
                     
                     <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                         <input 
                            type="text" 
                            placeholder="Add new preset..." 
                            value={newPreset}
                            onChange={e => setNewPreset(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addPreset()}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                         />
                         <button onClick={addPreset} className="btn-primary" style={{ padding: '0 1rem' }}><Plus size={20} /></button>
                     </div>

                     <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                         {odPresets.map((preset, idx) => (
                             <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                 <span style={{ color: '#ffffff' }}>{preset}</span>
                                 <button onClick={() => deletePreset(preset)} style={{ background: 'transparent', border: 'none', color: '#ff4757', cursor: 'pointer' }}><Trash2 size={18} /></button>
                             </div>
                         ))}
                         {odPresets.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center' }}>No presets added.</p>}
                     </div>
                 </div>
            </div>
        )}

        {/* MODAL */}
        {modalOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                 <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2rem', background: '#1e1e1e' }}>
                     <h3 style={{ marginBottom: '1rem', color: '#ffffff' }}>Enter On-Duty Reason</h3>
                     
                     {/* Quick Select Chips */}
                     {odPresets.length > 0 && (
                         <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                             {odPresets.map(preset => (
                                 <button 
                                    key={preset}
                                    onClick={() => setReasonInput(preset)}
                                    style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: '16px', 
                                        background: reasonInput === preset ? 'rgba(255, 165, 2, 0.3)' : 'rgba(255,255,255,0.1)', 
                                        border: reasonInput === preset ? '1px solid #ffa502' : '1px solid rgba(255,255,255,0.1)',
                                        color: reasonInput === preset ? '#ffa502' : '#ffffff',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                 >
                                     <Tag size={12} /> {preset}
                                 </button>
                             ))}
                         </div>
                     )}

                     <textarea 
                        value={reasonInput}
                        onChange={e => setReasonInput(e.target.value)}
                        placeholder="e.g. Sports Meet, Medical, Symposium"
                        rows={3}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', marginBottom: '1rem' }}
                     />
                     <div style={{ display: 'flex', gap: '1rem' }}>
                         <button onClick={saveReason} className="btn-primary" style={{ flex: 1 }}>Confirm</button>
                         <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                     </div>
                 </div>
            </div>
        )}
    </div>
  );
};

export default MockAttendance;
