import React, { useState, useEffect, useRef } from 'react';
import { getScheduleForDate, SUBJECTS, subscribeToScheduleUpdates } from '../utils/schedule';
import { getAssignments } from '../utils/assignments';
import { getAttendanceData, calculatePercentage, getAttendanceStatus, getAttendanceInsight, importAttendanceFromScreenshot, updateAttendance, processAttendanceScreenshot, saveAttendanceData, calculateConductedClassesMap } from '../utils/attendance';
import { X, Upload, TrendingUp, TrendingDown, AlertCircle, Download } from 'lucide-react';
import { generateScheduleExcel } from '../utils/exportUtils';

const StudentDashboard = ({ user, onLogout }) => {
  // Simulate Date as Jan 10, 2026 for Demo purposes (since real time is 2026... wait, local time IS 2026!)
  // User metadata says 2026. Perfect.
  // Clock State (runs every second)
  const [currentTime, setCurrentTime] = useState(new Date()); 
  
  // Schedule Reference Date (only changes when day substantially changes, or for navigation if we add it later)
  // Initialized to same as currentTime but we won't update it every second.
  const [scheduleDate, setScheduleDate] = useState(new Date());

  const [schedule, setSchedule] = useState(null);
  const [showAssignments, setShowAssignments] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [conductedData, setConductedData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [uploadingOCR, setUploadingOCR] = useState(false);
  const [loading, setLoading] = useState(true); // Global loading state
  const fileInputRef = useRef(null);

  // Preview / OCR State
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState({});
  const [ocrRawResults, setOcrRawResults] = useState({});

  useEffect(() => {
    // Refresh clock every second
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Separate effect for fetching schedule - only runs when scheduleDate changes (not every second)
  useEffect(() => {
    const updateSchedule = async () => {
        const sched = await getScheduleForDate(scheduleDate);
        setSchedule(sched);
    };
    updateSchedule();

    // Subscribe to global schedule updates (from Panel edits)
    const unsubscribe = subscribeToScheduleUpdates(() => {
        console.log('Dashboard received schedule update notification. Refreshing...');
        updateSchedule();
    });

    return () => unsubscribe();
  }, [scheduleDate]);

  // Check if we entered a new day while app is open, to update scheduleDate?
  useEffect(() => {
      const now = currentTime;
      // If day changed compared to scheduleDate, update it
      if (now.getDate() !== scheduleDate.getDate() || now.getMonth() !== scheduleDate.getMonth()) {
          setScheduleDate(new Date(now));
      }
  }, [currentTime, scheduleDate]);

  useEffect(() => {
    // Load data
    const loadData = async () => {
      console.log('--- Starting Data Load ---');
      setLoading(true);
      try {
          // Load assignments
          console.log('Fetching assignments...');
          const assignmentData = await getAssignments();
          setAssignments(assignmentData);
          console.log('Assignments loaded');
          
          if (user && user.id) {
              // Load attendance data from Supabase
              console.log('Fetching attendance data (includes prefetch)...');
              const { attendance: attData, lastUpdated } = await getAttendanceData(user.id);
              console.log('Attendance data loaded:', attData, 'Last Update:', lastUpdated);
              setAttendanceData(attData);
              setLastUpdated(lastUpdated);
              
              console.log('Calculating conducted classes...');
              const condData = await calculateConductedClassesMap(new Date());
              console.log('Conducted classes loaded:', condData);
              setConductedData(condData);
          }
           console.log('--- Data Load Complete ---');
      } catch (e) {
          console.error('CRITICAL ERROR DURING DATA LOAD:', e);
          alert('Error loading data: ' + (e.message || e));
      } finally {
          setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Auto-Sync Effect
  useEffect(() => {
     // Sync every 60 seconds
     const syncInterval = setInterval(() => {
         console.log('Auto-syncing...');
         handleSync();
     }, 60000);

     // Function to handle visibility change (sync when user comes back to tab)
     const handleVisibilityChange = () => {
         if (document.visibilityState === 'visible') {
             console.log('Tab visible, syncing...');
             handleSync();
         }
     };

     document.addEventListener('visibilitychange', handleVisibilityChange);

     return () => {
         clearInterval(syncInterval);
         document.removeEventListener('visibilitychange', handleVisibilityChange);
     };
  }, [user]);

  if (loading) {
      return (
          <div style={{ height: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-primary)' }}>
              <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ 
                        width: '50px', height: '50px', border: '5px solid rgba(255,255,255,0.1)', 
                        borderLeftColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 1.5rem',
                        animation: 'spin 1s linear infinite' 
                    }}></div>
                    <h3>Loading Dashboard...</h3>
                    <button 
                        onClick={onLogout}
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Cancel / Logout
                    </button>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
          </div>
      );
  }

  const handleSync = async () => {
      if (!user || !user.id) return;
      try {
          const { attendance: attData, lastUpdated } = await getAttendanceData(user.id);
          setAttendanceData(attData);
          setLastUpdated(lastUpdated);
          
          const condData = await calculateConductedClassesMap(new Date());
          setConductedData(condData);
      } catch (e) {
          console.error('Sync failed:', e);
      }
  };

  const checkActiveSlot = (timeRange) => {
      // timeRange format: "08:30 - 09:20"
      if (!timeRange) return false;
      const [start, end] = timeRange.split(' - ');
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      
      const now = new Date();
      const startTime = new Date(now);
      startTime.setHours(startH, startM, 0);
      const endTime = new Date(now);
      endTime.setHours(endH, endM, 0);
      
      return now >= startTime && now < endTime;
  };

  const renderTimeline = () => {
    if(!schedule) return <div>Loading...</div>;
    if(schedule.type === 'Holiday') return (
        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '12px', color: '#ff4757' }}>
            <h2>Today is a Holiday</h2>
            <p>{schedule.name}</p>
        </div>
    );
    
    return (
        <>
        {/* Desktop Table View */}
        <div className="glass-panel desktop-only" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', width: '100px' }}>TIME</th>
                        {schedule.schedule.map((slot, idx) => {
                             if(["Break", "Lunch"].includes(slot.code)) return <th key={idx} style={{ padding: '0.5rem', width: '20px' }}></th>;
                             const isActive = checkActiveSlot(slot.time);
                             return (
                                 <th key={idx} style={{ 
                                     padding: '1rem', 
                                     textAlign: 'center', 
                                     color: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
                                     background: isActive ? '#4f46e5' : 'transparent'
                                 }}>
                                     {slot.time}
                                 </th>
                             );
                        })}
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold', borderRight: '1px solid rgba(255,255,255,0.05)' }}>Subject</td>
                        {schedule.schedule.map((slot, idx) => {
                             if(["Break", "Lunch"].includes(slot.code)) return <td key={idx} style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}></td>;
                             const subj = SUBJECTS[slot.code];
                             const isActive = checkActiveSlot(slot.time);
                             const subjName = subj ? subj.name : slot.code;
                             
                             return (
                                 <td key={idx} style={{ 
                                     padding: '1rem', 
                                     textAlign: 'center', 
                                     borderRight: '1px solid rgba(255,255,255,0.05)',
                                     background: subj && subj.color ? `${subj.color}40` : (isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent'),
                                     fontWeight: 'bold',
                                     color: subj && subj.color ? '#0f172a' : (isActive ? '#2ed573' : 'inherit'),
                                     minWidth: '140px'
                                 }}>
                                     {subjName}
                                 </td>
                             );
                        })}
                    </tr>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold', borderRight: '1px solid rgba(255,255,255,0.05)' }}>Code</td>
                        {schedule.schedule.map((slot, idx) => {
                             if(["Break", "Lunch"].includes(slot.code)) return <td key={idx} style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}></td>;
                             const isActive = checkActiveSlot(slot.time);
                             return (
                                 <td key={idx} style={{ 
                                     padding: '1rem', 
                                     textAlign: 'center', 
                                     borderRight: '1px solid rgba(255,255,255,0.05)',
                                     background: SUBJECTS[slot.code] && SUBJECTS[slot.code].color ? `${SUBJECTS[slot.code].color}CC` : (isActive ? 'rgba(46, 213, 115, 0.1)' : 'transparent'),
                                     fontSize: '0.95rem',
                                     fontFamily: 'monospace',
                                     fontWeight: 'bold',
                                     opacity: 1,
                                     color: SUBJECTS[slot.code] && SUBJECTS[slot.code].color ? '#1e293b' : 'inherit'
                                 }}>
                                     {slot.code}
                                 </td>
                             );
                        })}
                    </tr>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                         <td style={{ padding: '1rem', fontWeight: 'bold', borderRight: '1px solid rgba(255,255,255,0.05)' }}>Faculty</td>
                         {schedule.schedule.map((slot, idx) => {
                             const subj = SUBJECTS[slot.code];
                             const faculty = subj ? subj.faculty : "-";
                             const isActive = checkActiveSlot(slot.time);
                             
                             return (
                                 <td key={idx} style={{ 
                                     padding: '1rem', 
                                     textAlign: 'center', 
                                     borderRight: '1px solid rgba(255,255,255,0.05)',
                                     background: subj && subj.color ? `${subj.color}99` : (isActive ? 'rgba(46, 213, 115, 0.1)' : 'transparent'),
                                     fontSize: '0.95rem',
                                     whiteSpace: 'nowrap',
                                     fontStyle: 'italic',
                                     fontWeight: '600',
                                     color: subj && subj.color ? '#334155' : 'inherit'
                                 }}>
                                     {faculty}
                                 </td>
                             );
                        })}
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Mobile List View */}
        <div className="mobile-timeline mobile-only" style={{ marginBottom: '1.5rem' }}>
            {schedule.schedule.map((slot, idx) => {
                const subj = SUBJECTS[slot.code];
                const subjName = subj ? subj.name : (["Break", "Lunch"].includes(slot.code) ? slot.code : slot.code);
                const isActive = checkActiveSlot(slot.time);
                
                return (
                    <div key={idx} className={`class-card-mobile ${isActive ? 'active' : ''}`}>
                        {isActive && <div className="active-tag">ACTIVE</div>}
                        <div className="time-badge">
                            <div style={{ color: isActive ? '#2ed573' : 'white' }}>{slot.time.split('-')[0]}</div>
                            <div style={{ opacity: 0.5, fontSize: '0.6rem' }}>to {slot.time.split('-')[1]}</div>
                        </div>
                        <div className="subj-info">
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: (subj && subj.color && subjName !== slot.code) ? subj.color : 'white' }}>
                                {subjName}
                            </div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                {slot.code} {subj && subj.faculty ? `• ${subj.faculty}` : ''}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
        </>
    );
  };

  // ... inside component ...

  const handleScreenshotUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingOCR(true);
    try {
      // 1. Process OCR but don't save yet
      const parsedResults = await processAttendanceScreenshot(file);
      
      if (parsedResults && Object.keys(parsedResults).length > 0) {
        setOcrRawResults(parsedResults);
        setShowPreview(true);
      } else {
        alert('❌ No attendance data found in screenshot. Please try a clearer image.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`❌ Error processing screenshot: ${error.message || error}`);
    } finally {
      setUploadingOCR(false);
      // Clear inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.files = null;
      }
      event.target.value = '';
    }
  };

  const calculateInsight = (attended, conducted, totalSemester) => {
     // User Logic:
     // Real % = Attended / Conducted.
     // Target = 0.75 * TotalSemester.
     // Missed = Conducted - Attended.
     // Budget = (TotalSemester - Target) - Missed.
     
     const realPercent = conducted > 0 ? (attended / conducted) * 100 : 0;
     const targetThreshold = Math.ceil(0.75 * totalSemester);
     const missed = conducted - attended;
     const maxMissable = totalSemester - targetThreshold;
     const bunksLeft = maxMissable - missed;
     
     if (bunksLeft < 0) {
         // Already below target? Calculate recovery?
         // Revert to "Required" logic but relative to CURRENT pace or TOTAL?
         // User asked to ignore app logic.
         // If bunksLeft is negative, it means they missed more than allowed for the WHOLE semester.
         // They are in critical zone.
         return {
             type: 'critical',
             message: `⚠️ Critical! You have exceeded your leave budget by ${Math.abs(bunksLeft)} classes.`
         };
     } else {
         return {
             type: 'safe',
             classes: bunksLeft,
             message: `✅ You can safely miss ${bunksLeft} more classes this semester.`
         };
     }
  };

  const calculateRequiredClasses = (attended, total, targetPct = 80) => {
    // Formula: (attended + x) / (total + x) >= target/100
    // (A + x) >= 0.8(T + x)
    // A + x >= 0.8T + 0.8x
    // 0.2x >= 0.8T - A
    // x >= (0.8T - A) / 0.2
    
    // Simplification for 80%: x = (4 * Total - 5 * Attended)
    // If negative, they are already above target.
    
    const required = Math.ceil((targetPct/100 * total - attended) / (1 - targetPct/100));
    return required > 0 ? required : 0;
  };

  const handleConfirmUpload = async () => {
    // Deep copy to avoid mutation issues
    const currentData = JSON.parse(JSON.stringify(attendanceData));
    
    // Merge new results
    Object.keys(ocrRawResults).forEach(code => {
        if (currentData[code]) {
            currentData[code].attended = ocrRawResults[code].attended;
            // Optionally update total if it looks like we extracted a better one?
            // currentData[code].total = ocrRawResults[code].total; 
        } else {
             // Shouldn't happen if we only show matching subjects, but handle anyway
            currentData[code] = {
                attended: ocrRawResults[code].attended,
                total: ocrRawResults[code].total 
            };
        }
    });

    // Optimistic update? No, let's wait for cloud confirmation to ensure Sync is real.
    // Actually, user wants to see it immediately.
    // Let's try to save.
    const result = await saveAttendanceData(user.id, currentData);
    
    if (result && result.success) {
        setAttendanceData(currentData);
        // Manually update lastUpdated so "Last Synced" shows NOW
        setLastUpdated(new Date().toISOString());
        setShowPreview(false);
        setOcrRawResults({});
        alert('✅ Attendance Updated & Synced to Cloud!');
    } else {
        console.error('Save failed:', result);
        alert(`❌ Failed to save to cloud: ${result?.error || 'Unknown error'}\n\nTip: You might need to disable RLS in Supabase or check your internet.`);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.5rem' }}>Good {currentTime.getHours() < 12 ? 'Morning' : 'Afternoon'}, {user.name?.split(' ')[0] || 'Student'}!</h2>
        <p style={{ opacity: 0.9, fontSize: '1.2rem', marginTop: '0.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 
          <span style={{ margin: '0 10px', opacity: 0.5 }}>|</span> 
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', opacity: 0.9 }}>
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </p>
        <p style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '0.5rem', fontFamily: 'monospace' }}>
            ID: {user.id}
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Main Section: Timetable */}
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Today's Classes</h3>
                {user?.role === 'Admin' && (
                <button 
                    onClick={generateScheduleExcel}
                    title="Export Full Semester Schedule"
                    style={{ 
                        background: 'rgba(255,255,255,0.1)', 
                        border: '1px solid rgba(255,255,255,0.2)', 
                        borderRadius: '8px',
                        cursor: 'pointer', 
                        padding: '0.5rem 1rem', 
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: '600'
                    }}
                >
                    <Download size={16} /> Export Schedule
                </button>
                )}
            </div>
            {renderTimeline()}
        </div>

        {/* Right Section: Stats/Widgets */}
        <div className="stats-container">
            <div className="glass-panel" style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255, 255, 255, 0.9)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginBottom: '0.2rem', fontSize: '1rem', color: '#1e293b', fontWeight: '800' }}>Attendance</h3>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#059669' }}>
                  {(() => {
                    const subjects = Object.keys(attendanceData).filter(code => SUBJECTS[code]);
                    if (subjects.length === 0) return '0%';
                    
                    const totalAttended = subjects.reduce((sum, code) => sum + attendanceData[code].attended, 0);
                    // Use CONDUCTED for aggregate real percentage
                    const totalConductedSoFar = subjects.reduce((sum, code) => sum + (conductedData[code] || 0), 0);
                    
                    if (totalConductedSoFar === 0) return '0%';
                    return ((totalAttended / totalConductedSoFar) * 100).toFixed(1) + '%';
                  })()}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Real Aggregate (Based on Schedule)</p>
            </div>
            
            <div className="glass-panel" style={{ textAlign: 'center', padding: '1rem', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%)', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)' }}>
                <h3 style={{ marginBottom: '0.2rem', fontSize: '1rem', color: 'rgba(255,255,255,0.9)', fontWeight: '800' }}>📅 Classes Conducted</h3>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>
                  {(() => {
                    const subjects = Object.keys(conductedData).filter(code => SUBJECTS[code] && !["Break", "Lunch"].includes(code));
                    return subjects.reduce((sum, code) => sum + (conductedData[code] || 0), 0);
                  })()}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>Total periods till today</p>
            </div>
            
             <div 
                className="glass-panel" 
                onClick={() => setShowAssignments(true)}
                style={{ textAlign: 'center', padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s', background: 'rgba(255, 255, 255, 0.9)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
             >
                <h3 style={{ marginBottom: '0.2rem', fontSize: '1rem', color: '#1e293b', fontWeight: '800' }}>Assignments</h3>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#d97706' }}>{assignments.length}</div>
                <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700' }}>Click to view</p>
            </div>
        </div>
      </div>

      {/* Attendance Tracking Section - BELOW TIMETABLE */}
      {/* Attendance Tracking Section - BELOW TIMETABLE */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>Subject-wise Attendance</h3>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {lastUpdated ? (
                    <span>Last Synced: {new Date(lastUpdated).toLocaleString()}</span>
                ) : (
                    <span>Not synced with cloud</span>
                )}
                <button 
                    onClick={handleSync}
                    title="Force Sync"
                    style={{ 
                        background: 'rgba(255,255,255,0.1)', 
                        border: '1px solid rgba(255,255,255,0.2)', 
                        borderRadius: '6px',
                        cursor: 'pointer', 
                        padding: '4px 8px', 
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    🔄 Sync Now
                </button>
            </div>
          </div>
          <div>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*" 
              onChange={handleScreenshotUpload}
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingOCR}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
            >
              {uploadingOCR ? '⏳ Processing...' : <><Upload size={18} /> Import Screenshot</>}
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(30, 41, 59, 0.95)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', color: '#f8fafc' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.keys(attendanceData)
              .filter(code => SUBJECTS[code])
              .sort((a, b) => {
                const condA = conductedData[a] || 1;
                const condB = conductedData[b] || 1;
                const pctA = (attendanceData[a].attended / condA) * 100;
                const pctB = (attendanceData[b].attended / condB) * 100;
                return pctB - pctA;
              })
              .map(code => {
              const subj = SUBJECTS[code];
              const { attended, total } = attendanceData[code]; // 'total' here is SEMESTER TOTAL from calculateSemesterPeriods
              const conducted = conductedData[code] || 0;
              
              // Real Percentage Calculation
              const realPercentage = conducted === 0 ? 0 : ((attended / conducted) * 100).toFixed(1);
              
              // Insight uses (Attended, Conducted, TotalSemester)
              const status = getAttendanceStatus(realPercentage);
              const insight = getAttendanceInsight(attended, conducted, total);

              return (
                <div key={code} style={{ display: 'flex', flexDirection: 'column', marginBottom: '1rem' }}>
                    <div className="attendance-item">
                        <div className="subj-info">
                            <h4 style={{ color: '#f8fafc' }}>{subj.name}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                <span className="code" style={{ opacity: 0.7 }}>{code}</span>
                                <span style={{ 
                                    background: 'rgba(79, 70, 229, 0.3)', 
                                    color: '#a5b4fc', 
                                    padding: '2px 8px', 
                                    borderRadius: '12px', 
                                    fontSize: '0.7rem', 
                                    fontWeight: '700',
                                    border: '1px solid rgba(79, 70, 229, 0.5)'
                                }}>
                                    📅 {conducted} classes conducted
                                </span>
                            </div>
                        </div>
                        
                        <div className="progress-container">
                            <div className="progress-bar" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <div 
                                    className="progress-fill" 
                                    style={{ 
                                        width: `${Math.min(100, realPercentage)}%`,
                                        background: `linear-gradient(90deg, ${status.color} 0%, ${status.color}88 100%)`
                                    }}
                                >
                                    <span className="progress-text" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                        ({attended}/{conducted}) {realPercentage}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="status-badge" style={{ 
                            background: `${status.color}22`,
                            color: status.color,
                            border: `1px solid ${status.color}44`
                        }}>
                            <span className="percentage">{realPercentage}%</span>
                            <span className="label">{status.label}</span>
                        </div>

                        {realPercentage < 75 && (
                             <div className="warning-icon" title="Low Attendance Warning">
                                <AlertCircle size={20} color={status.color} />
                             </div>
                        )}
                    </div>
                      
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {/* Semester Total Progress */}
                        <div className="progress-details-offset">
                          <div style={{ fontSize: '0.75rem', opacity: 1, marginBottom: '0.3rem', fontWeight: '800', color: '#cbd5e1' }}>
                            Semester Total Progress
                          </div>
                          <div style={{ position: 'relative' }}>
                            <div style={{ 
                              width: '100%', 
                              height: '24px', 
                              background: 'rgba(255,255,255,0.1)', 
                              borderRadius: '6px',
                              overflow: 'hidden',
                              position: 'relative'
                            }}>
                              <div style={{
                                width: `${(attended / total) * 100}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, rgba(148, 163, 184, 0.5) 0%, rgba(148, 163, 184, 0.3) 100%)',
                                transition: 'width 0.5s ease',
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: '0.5rem',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: '#f1f5f9',
                                textShadow: 'none'
                              }}>
                                {attended}/{total}
                              </div>
                            </div>
                            <div style={{ 
                              position: 'absolute', 
                              right: '0.5rem', 
                              top: '50%', 
                              transform: 'translateY(-50%)', 
                              fontSize: '0.8rem',
                              fontWeight: '900',
                              color: '#f1f5f9'
                            }}>
                              {((attended / total) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      
                        {/* Smart Insight: Bunk Budget */}
                        <div className="progress-details-offset" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {insight.message}
                        </div>
                    </div>
                </div>
              );
            })}

            {Object.keys(attendanceData).length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', opacity: 0.8, fontWeight: '500' }}>
                <Upload size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No attendance data yet. Upload a screenshot to get started!</p>
              </div>
            )}
          </div>

          {Object.keys(attendanceData).length > 0 && (
            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', gap: '2rem', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.3rem', color: '#cbd5e1', fontWeight: 'bold' }}>Average Attendance</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                  {(() => {
                    const subjects = Object.keys(attendanceData).filter(code => SUBJECTS[code]);
                    if (subjects.length === 0) return "0.0";
                    const avg = subjects.reduce((sum, code) => {
                      const cond = conductedData[code] || 1;
                      const pct = (attendanceData[code].attended / cond) * 100;
                      return sum + pct;
                    }, 0) / subjects.length;
                    return avg.toFixed(1);
                  })()}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.3rem', color: '#cbd5e1', fontWeight: 'bold' }}>Subjects ≥80%</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2ed573' }}>
                  {Object.keys(attendanceData).filter(code => {
                    const cond = conductedData[code] || 1;
                    const pct = (attendanceData[code].attended / cond) * 100;
                    return pct >= 80 && SUBJECTS[code];
                  }).length} / {Object.keys(attendanceData).filter(code => SUBJECTS[code]).length}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Assignments Modal */}
      {showAssignments && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Assignments</h2>
              <button onClick={() => setShowAssignments(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <X size={24} />
              </button>
            </div>
            {assignments.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.6 }}>No assignments yet!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assignments.map(a => (
                  <div key={a.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.3rem' }}>{a.title}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--accent)' }}>{a.subject}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--accent)' }}>Given:</span> {new Date(a.givenDate).toLocaleDateString()} • <span style={{ color: '#ffa502' }}>Due:</span> {new Date(a.dueDate).toLocaleDateString()}
                    </div>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>{a.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    {/* Preview Modal */}
    {showPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="bg-[#1e1e1e] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10" style={{ background: '#1e1e1e', borderRadius: '1rem', width: '100%', maxWidth: '40rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="p-6 border-b border-white/10" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="text-xl font-bold" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Confirm Attendance Update</h2>
                    <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/10 rounded-lg" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <div style={{ background: 'rgba(255, 71, 87, 0.1)', borderBottom: '1px solid rgba(255, 71, 87, 0.3)', padding: '1rem', textAlign: 'center' }}>
                    <h3 style={{ color: '#ff4757', fontWeight: 'bold', fontSize: '1.2rem', margin: 0, textTransform: 'uppercase' }}>
                        ⚠️ THIS IS ALL SPECULATION AND IS NOT GUARANTEED
                    </h3>
                    <p style={{ color: '#ff4757', fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem' }}>
                        Please verify with your official college portal.
                    </p>
                </div>
                
                <div className="p-6" style={{ padding: '1.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ color: '#aaa', fontSize: '0.9rem', textAlign: 'left' }}>
                                <th style={{ padding: '0.5rem' }}>Subject</th>
                                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Old</th>
                                <th style={{ padding: '0.5rem', textAlign: 'center' }}>New</th>
                                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(attendanceData).sort().map(code => {
                                const subj = SUBJECTS[code];
                                // Skip if not a valid subject (e.g. somehow got garbage) or if it's Break/Lunch
                                if (!subj || subj.name === 'Break' || subj.name === 'Lunch') return null;

                                const oldData = attendanceData[code] || { attended: 0, total: 0 };
                                const newData = ocrRawResults[code];
                                
                                // Logic: If found in OCR, use it. Else, use old data (No Change)
                                const displayData = newData || oldData;
                                const isUpdated = !!newData;

                                const oldPct = calculatePercentage(oldData.attended, oldData.total);
                                const newPct = calculatePercentage(displayData.attended, displayData.total);
                                
                                return (
                                    <tr key={code} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isUpdated ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                        <td style={{ padding: '1rem 0.5rem' }}>
                                            <div style={{ fontWeight: 'bold', color: isUpdated ? 'white' : '#aaa' }}>{subj.name}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{code}</div>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center', opacity: 0.7 }}>
                                            {oldData.attended}/{oldData.total} <br/>
                                            <span style={{ fontSize: '0.8rem' }}>{oldPct}%</span>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: isUpdated ? '#2ed573' : '#aaa' }}>
                                            {displayData.attended}/{displayData.total} <br/>
                                            <span style={{ fontSize: '0.8rem' }}>{newPct}%</span>
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                            {isUpdated ? (
                                                parseFloat(newPct) > parseFloat(oldPct) ? <TrendingUp size={16} color="#2ed573" /> : 
                                                parseFloat(newPct) < parseFloat(oldPct) ? <TrendingDown size={16} color="#ff4757" /> :
                                                <span style={{color: '#aaa'}}>-</span>
                                            ) : (
                                                <span style={{fontSize: '0.8rem', opacity: 0.5}}>No Change</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-4" style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button 
                        onClick={() => setShowPreview(false)}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmUpload}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: '#2ed573', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                        Confirm & Update
                    </button>
                </div>
            </div>
        </div>
    )}
    </div>
  );
};

export default StudentDashboard;
