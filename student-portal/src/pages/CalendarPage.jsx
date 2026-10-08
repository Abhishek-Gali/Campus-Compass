import React, { useState, useEffect } from 'react';
import { getScheduleForDate, prefetchMonthData, SUBJECTS, getLocalISOString } from '../utils/schedule';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const CalendarPage = () => {
    const [viewDate, setViewDate] = useState(new Date(2026, 0, 1));
    const [selectedDate, setSelectedDate] = useState(null);
    const [hoveredDate, setHoveredDate] = useState(null);
    const [schedules, setSchedules] = useState({});
    const [loading, setLoading] = useState(true);

    const getMonthData = (year, month) => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        
        for(let i=0; i<firstDay.getDay(); i++) days.push(null);
        for(let i=1; i<=lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const days = getMonthData(viewDate.getFullYear(), viewDate.getMonth());
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // Fetch Data Effect
    useEffect(() => {
        const loadMonthData = async () => {
            setLoading(true);
            try {
                // Prefetch DB data for efficiency
                await prefetchMonthData(viewDate.getFullYear(), viewDate.getMonth());

                // Generate schedule objects
                const newSchedules = {};
                const validDays = days.filter(d => d !== null);
                
                await Promise.all(validDays.map(async (date) => {
                    const dateStr = getLocalISOString(date);
                    const sched = await getScheduleForDate(date);
                    newSchedules[dateStr] = sched;
                }));
                
                setSchedules(newSchedules);
            } catch (err) {
                console.error("Failed to load calendar data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadMonthData();
    }, [viewDate]); // Removed 'days' dependency to avoid infinite loop (since days is derived from viewDate)

    const renderHoverTooltip = (schedule) => {
        if (!schedule || schedule.type === 'Holiday') return null;
        
        const subjects = schedule.schedule
            .filter(slot => slot.code && !["Break", "Lunch"].includes(slot.code))
            .map(slot => SUBJECTS[slot.code]?.name || slot.code)
            .filter((v, i, a) => a.indexOf(v) === i); // unique

        return (
            <div style={{ 
                position: 'absolute', 
                bottom: '120%', 
                left: '50%', 
                transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #e0f7fa 0%, #e1f5fe 100%)', 
                backdropFilter: 'blur(12px)',
                padding: '1.25rem', 
                borderRadius: '16px',
                whiteSpace: 'nowrap',
                zIndex: 10,
                boxShadow: '0 10px 40px -10px rgba(1, 87, 155, 0.15)',
                border: '1px solid #b3e5fc',
                minWidth: '180px'
            }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '900', letterSpacing: '0.5px', color: '#01579b', marginBottom: '0.5rem', textTransform: 'uppercase', borderBottom: '2px solid #81d4fa', paddingBottom: '0.25rem' }}>
                    {schedule.note || 'SCHEDULE'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {subjects.map((subj, i) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: '#0277bd', fontWeight: '700' }}>• {subj}</div>
                    ))}
                </div>
            </div>
        );
    };

    const renderDetailModal = () => {
        if (!selectedDate) return null;
        
        const dateStr = getLocalISOString(selectedDate);
        // Use the preloaded schedule from state or fallback to null (should be loaded for current view logic, but careful if modal persists across month changes - theoretically viewDate change closes nothing but we usually view current month)
        // However, if we click, we have selectedDate.
        const schedule = schedules[dateStr];
        // Note: If schedule is missing (e.g. edge case), handle gracefully.

        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div className="glass-panel" style={{ maxWidth: '900px', width: '90%', maxHeight: '85vh', overflow: 'auto', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', padding: '1rem', marginLeft: '-2rem', marginRight: '-2rem', marginTop: '-2rem', borderRadius: '12px 12px 0 0' }}>
                        <div>
                            <h2 style={{ margin: 0, color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
                            {schedule?.note && <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.9rem', opacity: 0.7, color: 'white' }}>{schedule.note}</p>}
                        </div>
                        <button onClick={() => setSelectedDate(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: 'white', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={24} />
                        </button>
                    </div>

                    {!schedule ? (
                         <div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>
                    ) : schedule.type === 'Holiday' ? (
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                            <h3 style={{ color: '#ff4757', fontSize: '1.5rem' }}>{schedule.name}</h3>
                            <p style={{ opacity: 0.6, marginTop: '0.5rem' }}>No classes scheduled</p>
                        </div>
                    ) : schedule.schedule ? (
                        <div>
                            <h3 style={{ marginBottom: '1rem' }}>Full Timetable</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {schedule.schedule.map((slot, idx) => {
                                    if (["Break", "Lunch"].includes(slot.code)) {
                                        return (
                                            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', fontStyle: 'italic', opacity: 0.5 }}>
                                                {slot.code} • {slot.time}
                                            </div>
                                        );
                                    }

                                    const subj = SUBJECTS[slot.code];
                                    if (!subj) return null;

                                    return (
                                        <div key={idx} style={{ 
                                            background: `linear-gradient(135deg, ${subj.color}50 0%, ${subj.color}30 100%)`,
                                            padding: '1.25rem', 
                                            borderRadius: '12px',
                                            border: `1px solid ${subj.color}80`,
                                            transition: 'all 0.3s ease',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(5px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '900', fontSize: '1.3rem', marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '0.5px' }}>
                                                        {subj.name}
                                                    </div>
                                                    <div style={{ fontSize: '1rem', opacity: 1, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ color: '#334155', fontWeight: '800' }}>{slot.time}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '600' }}>
                                                        👤 {subj.faculty}
                                                    </div>
                                                </div>
                                                <div style={{ 
                                                    background: `${subj.color}80`, 
                                                    padding: '0.6rem 1.2rem', 
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '800',
                                                    color: '#0f172a',
                                                    border: '1px solid rgba(0,0,0,0.1)'
                                                }}>
                                                    {slot.code}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                            No schedule available
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in">
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--accent) 0%, #667eea 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Academic Calendar
            </h2>
            
            <div className="glass-panel" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.6) 0%, rgba(49, 46, 129, 0.7) 100%)', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <button 
                        onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1))} 
                        className="btn-primary"
                        style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)' }}
                    >
                        <ChevronLeft size={20} /> Prev
                    </button>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', background: 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 10px rgba(56,189,248,0.3)' }}>
                        {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                    </h3>
                    <button 
                        onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1))} 
                        className="btn-primary"
                        style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.1)' }}
                    >
                        Next <ChevronRight size={20} />
                    </button>
                </div>

                <div className="calendar-grid">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                        <div key={d} style={{ 
                            textAlign: 'center', 
                            fontWeight: 'bold', 
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: '#e0e7ff'
                        }}>
                            {d.slice(0, 3)}
                        </div>
                    ))}
                    
                    {days.map((date, idx) => {
                        if(!date) return <div key={`empty-${idx}`} style={{ minHeight: '100px' }}></div>;
                        
                        const dateStr = getLocalISOString(date);
                        const schedule = schedules[dateStr]; // Use pre-calculated schedule
                        const isHoliday = schedule?.type === 'Holiday';
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isHovered = hoveredDate?.getTime() === date.getTime();

                        return (
                            <div 
                                key={idx}
                                onClick={() => setSelectedDate(date)}
                                onMouseEnter={() => setHoveredDate(date)}
                                onMouseLeave={() => setHoveredDate(null)}
                                style={{
                                    minHeight: '100px',
                                    background: isHoliday ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.2) 0%, rgba(244, 63, 94, 0.1) 100%)' : 
                                                isToday ? 'linear-gradient(135deg, var(--accent) 0%, #667eea 100%)' :
                                                'rgba(56, 189, 248, 0.08)', // Blue tint instead of grey
                                    borderRadius: '12px',
                                    padding: '0.75rem',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    border: isToday ? '2px solid var(--accent)' : '1px solid rgba(129, 140, 248, 0.15)',
                                    transform: isHovered ? 'translateY(-5px) scale(1.02)' : 'translateY(0)',
                                    boxShadow: isHovered ? '0 8px 20px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                                    opacity: loading ? 0.5 : 1
                                }}
                            >
                                <div style={{ 
                                    fontWeight: 'bold', 
                                    fontSize: '1.2rem',
                                    color: isToday ? '#fff' : '#e0f2fe',
                                    marginBottom: '0.3rem'
                                }}>
                                    {date.getDate()}
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                                    {loading ? (
                                        <span>...</span>
                                    ) : isHoliday ? (
                                        <span style={{ color: '#fb7185', fontWeight: 'bold' }}>🎉 {schedule?.name || 'Holiday'}</span>
                                    ) : schedule?.schedule?.length > 0 ? (
                                        <span style={{ color: '#4ade80' }}>● Classes</span>
                                    ) : ''}
                                </div>
                                
                                {isHovered && !isHoliday && !loading && renderHoverTooltip(schedule)}
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', display: 'flex', gap: '1.5rem', justifyContent: 'center', fontSize: '0.9rem', color: '#0f172a', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 20, height: 20, background: 'linear-gradient(135deg, var(--accent) 0%, #667eea 100%)', borderRadius: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}></div>
                        Today
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 20, height: 20, background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.8) 0%, rgba(244, 63, 94, 0.6) 100%)', borderRadius: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}></div>
                        Holiday
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#16a34a', fontSize: '1.2rem' }}>●</span> Classes Scheduled
                    </div>
                </div>
            </div>

            {renderDetailModal()}
        </div>
    );
};

export default CalendarPage;
