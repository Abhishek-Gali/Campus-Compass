
        {/* TEACHERS TAB */}
        {activeTab === 'teachers' && (
            <div>
                 <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                     <h3 style={{ marginBottom: '1.5rem' }}>Create Teacher Account</h3>
                     <form onSubmit={handleCreateTeacher} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                         <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Teacher Name</label>
                            <input 
                                type="text" 
                                placeholder="Subject Name (e.g. Cryptography)" 
                                value={newTeacher.name}
                                onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}
                                required 
                                style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }} 
                            />
                         </div>
                         <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Teacher ID</label>
                            <input 
                                type="text" 
                                placeholder="ID (e.g. TCHR_21CSE10)" 
                                value={newTeacher.id}
                                onChange={e => setNewTeacher({...newTeacher, id: e.target.value})}
                                required 
                                style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }} 
                            />
                         </div>
                         <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Subject Code</label>
                            <input 
                                type="text" 
                                placeholder="Subject Code (e.g. 21CSE10)" 
                                value={newTeacher.subjectCode}
                                onChange={e => setNewTeacher({...newTeacher, subjectCode: e.target.value})}
                                required 
                                style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }} 
                            />
                         </div>
                         <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
                            <input 
                                type="text" 
                                placeholder="Set Password" 
                                value={newTeacher.password}
                                onChange={e => setNewTeacher({...newTeacher, password: e.target.value})}
                                required 
                                style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%'  }} 
                            />
                         </div>
                         <button type="submit" className="btn-primary" style={{ height: '42px' }}>
                            <Plus size={16} style={{ marginRight: '5px' }} /> Create Teacher
                         </button>
                     </form>
                     {msg && <p style={{ color: '#2ed573', marginTop: '1rem' }}>{msg}</p>}
                 </div>

                 <h3 style={{ marginBottom: '1rem' }}>Current Teachers</h3>
                 
                 {loadingTeachers ? <p>Loading...</p> : (
                     <div style={{ display: 'grid', gap: '1rem' }}>
                        {teachers.map(teacher => (
                            <div key={teacher.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ 
                                        width: 40, height: 40, borderRadius: '50%', 
                                        background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', color: 'black', fontSize: '0.8rem'
                                    }}>
                                        L{teacher.access_level}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{teacher.name}</div>
                                        <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>{teacher.id} • {SUBJECTS[teacher.subject_code]?.name || teacher.subject_code}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => openTeacherPasswordModal(teacher)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Key size={14} /> Password
                                    </button>
                                    <button onClick={() => handleDeleteTeacher(teacher.id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#ff4757', color: 'white', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {teachers.length === 0 && <p style={{ opacity: 0.5 }}>No teachers created yet.</p>}
                     </div>
                 )}
            </div>
        )}
        
        {/* Teacher Password Management Modal */}
        {teacherPasswordModal && selectedTeacherForPassword && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                <div className="glass-panel" style={{ width: '400px', maxWidth: '90%', padding: '2rem', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Change Teacher Password</h3>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedTeacherForPassword.name}</div>
                        <div style={{ opacity: 0.6 }}>{selectedTeacherForPassword.id}</div>
                        <div style={{ opacity: 0.6, fontSize: '0.85rem', marginTop: '0.25rem' }}>{SUBJECTS[selectedTeacherForPassword.subject_code]?.name || selectedTeacherForPassword.subject_code}</div>
                    </div>
                    
                    <form onSubmit={handleTeacherPasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.8 }}>New Password</label>
                            <input 
                                type="text" 
                                value={newTeacherPassword}
                                onChange={e => setNewTeacherPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
                                style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'inherit', width: '100%' }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Update Password</button>
                            <button type="button" onClick={() => setTeacherPasswordModal(false)} style={{ flex: 1, padding: '0 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'inherit', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
