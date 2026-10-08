import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, TrendingUp, Target, BookOpen, AlertCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractTextFromPDF, parseSemesterResult, getGradePoint } from '../utils/pdfProcessor';
import { saveSemesterData, fetchSemesters, calculateCGPA, fetchStudentGoals, saveStudentGoals, calculateRequiredSGPA, getFeasibility, deleteSemester } from '../utils/semesterUtils';

const SemesterPerformance = ({ user }) => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    // State
    const [semesters, setSemesters] = useState([]);
    const [cgpa, setCgpa] = useState(0);
    const [totalCredits, setTotalCredits] = useState(0);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [debugText, setDebugText] = useState(null); 
    const [editingData, setEditingData] = useState(null);
    
    // Goal State
    const [targetCGPA, setTargetCGPA] = useState('');
    const [targetSGPA, setTargetSGPA] = useState(''); 
    const [requiredSGPA, setRequiredSGPA] = useState(null);
    const [feasibility, setFeasibility] = useState(null);
    const [nextSemCredits, setNextSemCredits] = useState(24);
    const [totalDegreeCredits, setTotalDegreeCredits] = useState(165);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Semesters
            const semData = await fetchSemesters(user.id);
            setSemesters(semData);
            
            // Calculate Overall Stats
            const currentCGPA = calculateCGPA(semData);
            const credits = semData.reduce((sum, s) => sum + s.total_credits, 0);
            
            setCgpa(currentCGPA);
            setTotalCredits(credits);
            
            // Load Goals
            const goals = await fetchStudentGoals(user.id);
            if (goals) {
                setTargetCGPA(goals.target_cgpa || '');
                setTargetSGPA(goals.target_sgpa_next || '');
                
                // Trigger calculation if goals exist
                if (goals.target_cgpa) {
                     updateGoalProjection(goals.target_cgpa, currentCGPA, credits, nextSemCredits);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSemester = async (semId, semName) => {
        if (window.confirm(`Are you sure you want to delete ${semName}?`)) {
            setLoading(true);
            const result = await deleteSemester(semId);
            if (result.success) {
                loadData();
            } else {
                alert('Failed to delete: ' + result.error);
                setLoading(false);
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setDebugText(null); 
        try {
            // 1. Extract Text
            const text = await extractTextFromPDF(file);
            console.log("Raw Extracted Text:", text);
            setDebugText(text); // Always show if user wants to see it
            
            // 2. Parse Data
            let parsedData = parseSemesterResult(text);
            
            // Handle if single object returned (legacy fallback) or array
            // For now, we assume user uploads one sem at a time or we take the first one found?
            // The parser now returns an ARRAY if multiple sems found, logic needs to be robust.
            // But parseSemesterResult actually returns a single object OR array? 
            // My previous update to pdfProcessor returned subjects array, but let's check parseSemesterResult's return signature.
            // Actually, I refactored it to return { semester: ..., subjects: ... } OR an array of them?
            // Let's assume it returns one object for now based on the regex.
            
            // If it returns an array (multiple sems in one PDF), we might need to handle that.
            // For this specific confirm window, let's take the first one or iterate.
            
            const dataToEdit = Array.isArray(parsedData) ? parsedData[0] : parsedData;

            if (!dataToEdit || !dataToEdit.subjects || dataToEdit.subjects.length === 0) {
                 alert('Could not extract subjects automatically. Please check the "Raw Text Debug" section.');
                 setUploading(false);
                 return;
            }

            // 3. Open Modal Pattern
            setEditingData(dataToEdit);
            setUploading(false); // Stop loading, wait for user confirmation

        } catch (err) {
            console.error(err);
            alert('Error processing PDF: ' + err.message);
            setUploading(false);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    const handleSaveConfirmed = async () => {
        if (!editingData) return;
        
        try {
            // Recalculate stats based on edited data
            const totalCredits = editingData.subjects.reduce((sum, sub) => sum + parseFloat(sub.credits || 0), 0);
            
            // Re-calculate SGPA
            let totalPoints = 0;
            editingData.subjects.forEach(sub => {
                const gp = getGradePoint(sub.grade); // Use utility from semesterUtils/pdfProcessor
                totalPoints += gp * parseFloat(sub.credits || 0);
            });
            const calculatedSGPA = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;

            const finalData = {
                ...editingData,
                total_credits: totalCredits, // Ensure this matches DB schema
                sgpa: calculatedSGPA // Ensure this matches DB schema
            };

            const result = await saveSemesterData(user.id, finalData);
            
            if (result.success) {
                alert(`Successfully saved ${finalData.semester_name || finalData.semester}!`); // Use semester_name or semester
                setEditingData(null);
                loadData();
            } else {
                alert('Failed to save data: ' + result.error);
            }
        } catch (err) {
            alert('Error saving: ' + err.message);
        }
    };

    const handleSubjectChange = (index, field, value) => {
        const updatedSubjects = [...editingData.subjects];
        updatedSubjects[index] = { ...updatedSubjects[index], [field]: value };
        setEditingData({ ...editingData, subjects: updatedSubjects });
    };

    const handleDeleteSubject = (index) => {
        const updatedSubjects = editingData.subjects.filter((_, i) => i !== index);
        setEditingData({ ...editingData, subjects: updatedSubjects });
    };

    const updateGoalProjection = (target, currentCgpa, currentCreds, nextCreds) => {
        if (!target || target === 0) {
            setRequiredSGPA(null);
            setFeasibility(null);
            return;
        }
        const req = calculateRequiredSGPA(currentCgpa, currentCreds, parseFloat(target), nextCreds);
        setRequiredSGPA(req);
        setFeasibility(getFeasibility(req));
    };

    const handleGoalChange = (field, value) => {
        if (field === 'targetCGPA') {
            setTargetCGPA(value);
            updateGoalProjection(value, cgpa, totalCredits, nextSemCredits);
            saveStudentGoals(user.id, { target_cgpa: value, target_sgpa_next: targetSGPA });
        } else if (field === 'targetSGPA') {
            setTargetSGPA(value);
            saveStudentGoals(user.id, { target_cgpa: targetCGPA, target_sgpa_next: value });
        } else if (field === 'nextCredits') {
            setNextSemCredits(parseInt(value) || 24);
             updateGoalProjection(targetCGPA, cgpa, totalCredits, parseInt(value) || 24);
        }
    };

    // Manual Entry State
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualEntryType, setManualEntryType] = useState('single'); // 'single' or 'consolidated'
    const [manualData, setManualData] = useState({
        semester: 'Semester 1',
        sgpa: '',
        credits: '',
        consolidatedCgpa: '',
        upToSemester: '2'
    });

    const handleManualEntryChange = (field, value) => {
        setManualData({ ...manualData, [field]: value });
    };

    const handleSaveManual = async () => {
        setLoading(true);
        try {
            let dataToSave = {};
            
            if (manualEntryType === 'single') {
                if (!manualData.semester || !manualData.sgpa || !manualData.credits) {
                    alert('Please fill in all fields');
                    setLoading(false);
                    return;
                }
                dataToSave = {
                    semester: manualData.semester,
                    printedSGPA: parseFloat(manualData.sgpa),
                    totalCredits: parseFloat(manualData.credits),
                    subjects: [] // No subjects for manual entry
                };
            } else {
                if (!manualData.consolidatedCgpa || !manualData.credits || !manualData.upToSemester) {
                    alert('Please fill in all fields');
                    setLoading(false);
                    return;
                }
                dataToSave = {
                    semester: `Consolidated (Sem 1-${manualData.upToSemester})`,
                    printedSGPA: parseFloat(manualData.consolidatedCgpa), // Treating CGPA as SGPA for this record
                    totalCredits: parseFloat(manualData.credits),
                    subjects: []
                };
            }

            const result = await saveSemesterData(user.id, dataToSave);
            
            if (result.success) {
                alert('Saved successfully!');
                setShowManualModal(false);
                setManualData({
                    semester: 'Semester 1',
                    sgpa: '',
                    credits: '',
                    consolidatedCgpa: '',
                    upToSemester: '2'
                });
                loadData();
            } else {
                alert('Failed to save: ' + result.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
            {/* ... (Existing Header and Back Button) ... */}
            <button 
                onClick={() => navigate('/dashboard')} 
                className="glass-panel" 
                style={{ 
                    marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', 
                    padding: '0.8rem 1.2rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)'
                }}
            >
                <ArrowLeft size={20} /> Back to Dashboard
            </button>

            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Academic Performance</h1>
                <p style={{ opacity: 0.7 }}>Track your semesters and plan your goals</p>
            </header>

            <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                
                {/* SECTION 1: Current Performance */}
                <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={24} color="var(--accent)" /> Current Performance
                        </h2>
                        
                        <input 
                            type="file" 
                            accept="application/pdf"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                         <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setShowManualModal(true)}
                                className="glass-panel"
                                style={{ padding: '0.6rem 1.2rem', cursor: 'pointer', border: '1px solid var(--accent)', color: 'var(--accent)' }}
                            >
                                + Add Manually
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                         <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.8) 0%, rgba(67, 56, 202, 0.8) 100%)' }}>
                            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>Overall CGPA</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>{cgpa}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>Total Credits</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent)' }}>{totalCredits}</div>
                        </div>
                    </div>

                    {/* Semesters List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {semesters.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
                                <Upload size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <p>No semesters added yet. Upload a result PDF or add manually.</p>
                            </div>
                        ) : (
                            semesters.map(sem => (
                                <div key={sem.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{sem.semester_name}</h3>
                                        <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{sem.total_credits} Credits</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: sem.sgpa >= 8 ? '#2ed573' : (sem.sgpa >= 6 ? '#ffa502' : '#ff4757') }}>
                                                {sem.sgpa}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>SGPA</div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteSemester(sem.id, sem.semester_name)}
                                            style={{ 
                                                background: 'rgba(255, 71, 87, 0.1)', border: 'none', borderRadius: '8px', 
                                                padding: '0.5rem', cursor: 'pointer', color: '#ff4757' 
                                            }}
                                            title="Delete Semester"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* SECTION 2: Goal Projection (unchanged) */}
                <section>
                    <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Target size={24} color="#eb4d4b" /> Goal Projection
                    </h2>

                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Target Overall CGPA</label>
                            <input 
                                type="number" 
                                placeholder="e.g. 8.5" 
                                value={targetCGPA}
                                onChange={e => handleGoalChange('targetCGPA', e.target.value)}
                                step="0.01"
                                max="10"
                                style={{ 
                                    width: '100%', padding: '0.8rem', borderRadius: '8px', 
                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', 
                                    color: 'white', fontSize: '1.1rem' 
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                             <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', opacity: 0.6 }}>Target Next Sem SGPA</label>
                                <input 
                                    type="number" 
                                    placeholder="e.g. 9.0" 
                                    value={targetSGPA}
                                    onChange={e => handleGoalChange('targetSGPA', e.target.value)}
                                    step="0.01"
                                    max="10"
                                    style={{ 
                                        width: '100%', padding: '0.6rem', borderRadius: '8px', 
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', 
                                        color: 'white' 
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', opacity: 0.6 }}>Upcoming Sem Credits</label>
                                <input 
                                    type="number" 
                                    value={nextSemCredits}
                                    onChange={e => handleGoalChange('nextCredits', e.target.value)}
                                    style={{ 
                                        width: '100%', padding: '0.6rem', borderRadius: '8px', 
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', 
                                        color: 'white' 
                                    }}
                                />
                            </div>
                        </div>

                        {/* Projection Result */}

                        {/* Projection Result */}
                        {(requiredSGPA !== null || targetCGPA) && (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {/* 1. Next Semester Goal */}
                                <div style={{ 
                                    background: 'rgba(255,255,255,0.05)', 
                                    padding: '1.5rem', borderRadius: '12px', border: requiredSGPA ? `1px solid ${feasibility.color}44` : '1px solid rgba(255,255,255,0.1)' 
                                }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                                        Short Term: Next Semester Goal
                                    </h3>
                                    {/* ... existing next sem goal ... */}
                                    {requiredSGPA !== null ? (
                                        <>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>Required SGPA</div>
                                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: feasibility.color, marginBottom: '0.5rem' }}>
                                                {requiredSGPA}
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: feasibility.color }}>
                                                {feasibility.status === 'Impossible' ? <AlertCircle size={18} /> : <TrendingUp size={18} />}
                                                <span style={{ fontWeight: 'bold' }}>{feasibility.status}</span>
                                                {feasibility.status === 'Impossible' && <span style={{ fontSize: '0.8rem', opacity: 0.8 }}> (Max is 10.0)</span>}
                                            </div>
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.6 }}>Assuming {nextSemCredits} credits next sem</div>
                                        </>
                                    ) : <div style={{opacity: 0.5}}>Enter target details to see projection</div>}
                                </div>

                                {/* 2. Long Term / Degree Goal */}
                                {(() => {
                                    // Calculate Remaining Semesters
                                    let maxSem = 0;
                                    semesters.forEach(s => {
                                        const consMatch = s.semester_name.match(/-(\d+)\)/);
                                        if (consMatch && consMatch[1]) {
                                            const num = parseInt(consMatch[1]);
                                            if (num > maxSem) maxSem = num;
                                        } else {
                                            const match = s.semester_name.match(/Semester\s+(\d+)/i) || s.semester_name.match(/Sem\s+(\d+)/i) || s.semester_name.match(/(\d+)/);
                                            if (match && match[1]) {
                                                const num = parseInt(match[1]);
                                                if (num > maxSem) maxSem = num;
                                            }
                                        }
                                    });

                                    const totalSemesters = 8;
                                    const remainingSemesters = Math.max(0, totalSemesters - maxSem);
                                    
                                    // Calculation using Total Degree Credits
                                    const estimatedRemainingCredits = Math.max(0, totalDegreeCredits - totalCredits);
                                    
                                    if (remainingSemesters > 0 && targetCGPA && totalCredits > 0 && estimatedRemainingCredits > 0) {
                                        
                                        // Formula based on FIXED Total Degree Credits
                                        const targetPoints = parseFloat(targetCGPA) * totalDegreeCredits;
                                        const currentPoints = cgpa * totalCredits;
                                        const requiredPoints = targetPoints - currentPoints;
                                        
                                        // Required Average for the REMAINING credits
                                        let reqAvgSGPA = requiredPoints / estimatedRemainingCredits;
                                        reqAvgSGPA = parseFloat(reqAvgSGPA.toFixed(2));
                                        
                                        let longTermFeasibility = getFeasibility(reqAvgSGPA);

                                        return (
                                            <div style={{ 
                                                background: 'rgba(255,255,255,0.05)', 
                                                padding: '1.5rem', borderRadius: '12px', border: `1px solid ${longTermFeasibility.color}44` 
                                            }}>
                                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem'}}>
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                        Long Term: Degree Goal
                                                    </h3>
                                                    <div style={{textAlign: 'right'}}>
                                                        <label style={{fontSize: '0.7rem', opacity: 0.7, display: 'block'}}>Est. Total Credits</label>
                                                        <input 
                                                            type="number" 
                                                            value={totalDegreeCredits}
                                                            onChange={(e) => setTotalDegreeCredits(parseFloat(e.target.value) || 0)}
                                                            style={{
                                                                background: 'transparent', border: 'none', color: 'var(--accent)', 
                                                                fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'right', width: '60px'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '0.5rem'}}>
                                                    <div>
                                                        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.2rem' }}>Required Average SGPA</div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>for next {remainingSemesters} semesters</div>
                                                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>({estimatedRemainingCredits} credits remaining)</div>
                                                    </div>
                                                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: longTermFeasibility.color }}>
                                                        {reqAvgSGPA}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: longTermFeasibility.color }}>
                                                    {longTermFeasibility.status === 'Impossible' ? <AlertCircle size={18} /> : <TrendingUp size={18} />}
                                                    <span style={{ fontWeight: 'bold' }}>{longTermFeasibility.status}</span>
                                                    {longTermFeasibility.status === 'Impossible' && <span style={{ fontSize: '0.8rem', opacity: 0.8 }}> (Max is 10.0)</span>}
                                                </div>
                                                
                                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', lineHeight: '1.4', opacity: 0.7 }}>
                                                    To reach <strong>{targetCGPA}</strong> with a total of <strong>{totalDegreeCredits}</strong> credits, you need to maintain an average SGPA of <strong>{reqAvgSGPA}</strong> for the remaining credits.
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Debug Section */}
            {debugText && (
                <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #ff4757' }}>
                    <h3 style={{ color: '#ff4757', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={20} /> Parsing Failed - Raw Text Debug
                    </h3>
                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                        The system could not find subject patterns in the extracted text. This might be due to OCR errors or unexpected formatting.
                        Copy the text below to share with support.
                    </p>
                    <textarea 
                        readOnly 
                        value={debugText} 
                        style={{ 
                            width: '100%', height: '300px', 
                            background: 'rgba(0,0,0,0.3)', color: 'white', 
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', 
                            padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem' 
                        }} 
                    />
                </div>
            )}

            {/* Edit Modal (for PDF upload) */}
            {editingData && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="glass-panel" style={{ 
                        width: '90%', maxWidth: '800px', maxHeight: '90vh', 
                        overflowY: 'auto', padding: '2rem',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)'
                    }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Review Extracted Data</h2>
                        
                        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', fontWeight: 'bold', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div>Subject Code</div>
                                <div>Credits</div>
                                <div>Grade</div>
                                <div>Action</div>
                            </div>
                            
                            {editingData.subjects.map((sub, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                                    <input 
                                        value={sub.code}
                                        onChange={(e) => handleSubjectChange(index, 'code', e.target.value)}
                                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '4px', color: 'white' }}
                                    />
                                    <input 
                                        type="number"
                                        value={sub.credits}
                                        onChange={(e) => handleSubjectChange(index, 'credits', e.target.value)}
                                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '4px', color: 'white' }}
                                    />
                                    <select 
                                        value={sub.grade}
                                        onChange={(e) => handleSubjectChange(index, 'grade', e.target.value)}
                                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '4px', color: 'white' }}
                                    >
                                        {['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'RA', 'FA', 'AB'].map(g => (
                                            <option key={g} value={g} style={{color: 'black'}}>{g}</option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={() => handleDeleteSubject(index)}
                                        style={{ color: '#ff4757', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button 
                                onClick={() => setEditingData(null)}
                                className="glass-panel"
                                style={{ padding: '0.8rem 1.5rem', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveConfirmed}
                                className="btn-primary"
                                style={{ padding: '0.8rem 1.5rem' }}
                            >
                                Save Semester
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Entry Modal */}
            {showManualModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="glass-panel" style={{ 
                        width: '90%', maxWidth: '500px',
                        padding: '2rem',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                        color: 'white'
                    }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Add Performance Manually</h2>
                        
                        <div style={{ display: 'flex', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.2rem', borderRadius: '8px' }}>
                            <button 
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', background: manualEntryType === 'single' ? 'var(--accent)' : 'transparent', color: 'white', border: 'none', cursor: 'pointer' }}
                                onClick={() => setManualEntryType('single')}
                            >
                                Single Semester
                            </button>
                            <button 
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', background: manualEntryType === 'consolidated' ? 'var(--accent)' : 'transparent', color: 'white', border: 'none', cursor: 'pointer' }}
                                onClick={() => setManualEntryType('consolidated')}
                            >
                                Past Consolidated
                            </button>
                        </div>

                        {manualEntryType === 'single' ? (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Semester</label>
                                    <select 
                                        value={manualData.semester}
                                        onChange={(e) => handleManualEntryChange('semester', e.target.value)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    >
                                        {[1,2,3,4,5,6,7,8].map(i => <option key={i} value={`Semester ${i}`} style={{color:'black'}}>Semester {i}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>SGPA</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        placeholder="e.g. 8.5"
                                        value={manualData.sgpa}
                                        onChange={(e) => handleManualEntryChange('sgpa', e.target.value)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Total Credits</label>
                                    <input 
                                        type="number" 
                                        placeholder="e.g. 24"
                                        value={manualData.credits}
                                        onChange={(e) => handleManualEntryChange('credits', e.target.value)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Consolidated CGPA</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        placeholder="e.g. 8.0"
                                        value={manualData.consolidatedCgpa}
                                        onChange={(e) => handleManualEntryChange('consolidatedCgpa', e.target.value)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Up to Semester</label>
                                    <select 
                                        value={manualData.upToSemester}
                                        onChange={(e) => handleManualEntryChange('upToSemester', e.target.value)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    >
                                        {[1,2,3,4,5,6,7].map(i => <option key={i} value={i} style={{color:'black'}}>Semester {i}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', opacity: 0.8 }}>Total Credits Earned</label>
                                    <input 
                                        type="number" 
                                        placeholder="e.g. 85"
                                        value={manualData.credits}
                                        onChange={(e) => handleManualEntryChange('credits', e.target.value)}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button 
                                onClick={() => setShowManualModal(false)}
                                className="glass-panel"
                                style={{ padding: '0.8rem 1.5rem', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveManual}
                                className="btn-primary"
                                style={{ padding: '0.8rem 1.5rem' }}
                            >
                                Save Entry
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SemesterPerformance;
