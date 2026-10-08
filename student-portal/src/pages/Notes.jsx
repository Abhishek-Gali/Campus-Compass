import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { SUBJECTS } from '../utils/schedule';
import { Folder, FileText, Download, ExternalLink, Plus, Trash2, X, Eye, UploadCloud, Link as LinkIcon } from 'lucide-react';

const Notes = ({ user, embedded = false }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewFile, setViewFile] = useState(null); // { url: '', type: '' }
  
  // Add Resource Form State
  const [newResource, setNewResource] = useState({
    title: '',
    subject_code: '',
    category: 'Notes',
    mega_link: '' 
  });

  // Role Checks
  const isStudent = !user.role || user.role === 'Student';
  const isAdmin = user.role === 'Admin';
  const isClassRep = user.role === 'ClassRep';
  const isTeacher = user.role === 'Teacher';
  const canAdd = isAdmin || isClassRep || isTeacher;
  const teacherSubject = isTeacher ? user.subject_code : null;

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('academic_resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resources:', error);
    } else {
      setResources(data || []);
    }
    setLoading(false);
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!canAdd) return;

    try {
        // Basic Validation
        if (!newResource.mega_link) {
            alert('Please enter a valid link');
            return;
        }

        const { error } = await supabase.from('academic_resources').insert([{
            title: newResource.title,
            subject_code: newResource.subject_code,
            category: newResource.category,
            mega_link: newResource.mega_link,
            uploaded_by: user.id
        }]);

        if (error) throw error;
        
        alert('✅ Resource Added!');
        setShowAddModal(false);
        setNewResource({ title: '', subject_code: '', category: 'Notes', mega_link: '' });
        fetchResources();

    } catch (err) {
        console.error(err);
        alert('Failed to add resource: ' + err.message);
    }
  };

  const handleDelete = async (id, uploaderId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    
    // Check ownership first
    if (isAdmin || user.id === uploaderId) {
         executeDelete(id);
         return;
    }

    // Check Hierarchy (Higher Rank can delete Lower Rank)
    if (user.role === 'ClassRep' && user.access_level) {
        try {
            // Fetch uploader's level
            const { data: uploader, error } = await supabase
                .from('users')
                .select('access_level')
                .eq('id', uploaderId)
                .single();
            
            if (error || !uploader) {
                alert('Could not verify uploader level.');
                return;
            }

            const myLevel = parseInt(user.access_level);
            const targetLevel = parseInt(uploader.access_level || 3); // Default to lowest if undefined

            if (myLevel < targetLevel) {
                 executeDelete(id);
            } else {
                 alert('You do not have permission to delete this file (Peer or Higher Level).');
            }
        } catch (err) {
            console.error(err);
            alert('Permission check failed');
        }
    } else {
        alert('You can only delete your own files.');
    }
  };

  const executeDelete = async (id) => {
     const { error } = await supabase.from('academic_resources').delete().eq('id', id);
     if (error) alert('Error deleting: ' + error.message);
     else fetchResources();
  };

  // Group resources by Subject
  const groupedResources = resources.reduce((acc, res) => {
    acc[res.subject_code] = acc[res.subject_code] || [];
    acc[res.subject_code].push(res);
    return acc;
  }, {});
  
  const getFileIcon = (category) => {
      switch(category) {
          case 'Notes': return <FileText size={16} color="var(--accent)" />;
          case 'Question Paper': return <Folder size={16} color="#ffa502" />;
          case 'Assignment': return <Folder size={16} color="#ff4757" />;
          default: return <FileText size={16} />;
      }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
        {!embedded && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem' }}>Notes & Resources</h2>
                {canAdd && (
                    <button 
                        onClick={() => {
                            // Pre-fill teacher's subject
                            if (isTeacher && teacherSubject) {
                                setNewResource({ title: '', subject_code: teacherSubject, category: 'Notes', mega_link: '' });
                            }
                            setShowAddModal(true);
                        }}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={20} /> Add Resource
                    </button>
                )}
            </div>
        )}

        {embedded && canAdd && (
             <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                    onClick={() => {
                        // Pre-fill teacher's subject
                        if (isTeacher && teacherSubject) {
                            setNewResource({ title: '', subject_code: teacherSubject, category: 'Notes', mega_link: '' });
                        }
                        setShowAddModal(true);
                    }}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={20} /> Add Resource
                </button>
             </div>
        )}

        {loading ? (
             <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 1rem', border: '4px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p>Loading Resources...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
             </div>
        ) : (
            <div className="notes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {Object.entries(SUBJECTS).map(([code, subj]) => {
                    if (subj.name === 'Break' || subj.name === 'Lunch') return null;
                    const items = groupedResources[code] || [];
                    
                    // Categorize items
                    const categorized = { 'Notes': [], 'Assignment': [], 'Question Paper': [], 'Lab Manual': [] };
                    items.forEach(item => {
                        if (categorized[item.category]) categorized[item.category].push(item);
                        else categorized['Notes'].push(item); // Fallback
                    });

                    return (
                        <div key={code} className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                            {/* Subject Header */}
                            <div style={{ 
                                padding: '1.5rem', 
                                background: `linear-gradient(135deg, ${subj.color || 'var(--accent)'}dd 0%, ${subj.color || 'var(--accent)'}44 100%)`,
                                color: 'white',
                                position: 'relative',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start'
                            }}>
                                <div>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{subj.name}</h3>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.2rem' }}>{code}</p>
                                </div>
                                {subj.drive_link && (
                                    <a 
                                        href={subj.drive_link} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        style={{ 
                                            background: 'rgba(255,255,255,0.2)', 
                                            padding: '0.5rem', 
                                            borderRadius: '50%', 
                                            color: 'white',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            backdropFilter: 'blur(5px)',
                                            transition: 'transform 0.2s'
                                        }}
                                        title="Open Class Drive Folder"
                                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <ExternalLink size={20} />
                                    </a>
                                )}
                            </div>

                            {/* Categories List */}
                            <div style={{ padding: '1rem', flex: 1 }}>
                                {Object.entries(categorized).map(([cat, catItems]) => {
                                    if (catItems.length === 0) return null;
                                    return (
                                        <div key={cat} style={{ marginBottom: '1.5rem' }}>
                                            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, marginBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.3rem' }}>
                                                {cat}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                {catItems.map(item => (
                                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                                        <div 
                                                            onClick={() => setViewFile(item)}
                                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, overflow: 'hidden' }}
                                                            title={item.title}
                                                        >
                                                            {getFileIcon(cat)}
                                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                            {(isAdmin || isClassRep || user.id === item.uploaded_by) && (
                                                                <button 
                                                                    onClick={() => handleDelete(item.id, item.uploaded_by)}
                                                                    style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', opacity: 0.7 }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {items.length === 0 && (
                                    <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>
                                        <p>No resources uploaded.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}

        {/* Add Resource Modal */}
        {showAddModal && (
            <div className="fixed inset-0" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: '#1e1e1e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3>Add New Resource</h3>
                        <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                    </div>
                    
                    <form onSubmit={handleAddResource} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Title</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Unit 1 Notes"
                                value={newResource.title}
                                onChange={e => setNewResource({...newResource, title: e.target.value})}
                                required
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Subject</label>
                                <select 
                                    value={newResource.subject_code}
                                    onChange={e => setNewResource({...newResource, subject_code: e.target.value})}
                                    required
                                    disabled={isTeacher}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', opacity: isTeacher ? 0.7 : 1 }}
                                >
                                    <option value="" style={{ color: '#333' }}>Select...</option>
                                    {Object.entries(SUBJECTS).map(([code, subj]) => (
                                        (subj.name !== 'Break' && subj.name !== 'Lunch') && <option key={code} value={code} style={{ color: '#333' }}>{subj.name}</option>
                                    ))}
                                </select>
                                {isTeacher && (
                                    <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.3rem' }}>
                                        You can only upload for {SUBJECTS[teacherSubject]?.name || teacherSubject}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Category</label>
                                <select 
                                    value={newResource.category}
                                    onChange={e => setNewResource({...newResource, category: e.target.value})}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                >
                                    <option style={{ color: '#333' }}>Notes</option>
                                    <option style={{ color: '#333' }}>Assignment</option>
                                    <option style={{ color: '#333' }}>Question Paper</option>
                                    <option style={{ color: '#333' }}>Lab Manual</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Google Drive Link</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input 
                                    type="url" 
                                    placeholder="https://drive.google.com/..."
                                    value={newResource.mega_link}
                                    onChange={e => setNewResource({...newResource, mega_link: e.target.value})}
                                    required
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                                />
                                <a 
                                    href="https://drive.google.com/" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn-primary" 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1rem', textDecoration: 'none', background: '#37a0ea' }}
                                    title="Open Drive to Upload"
                                >
                                    <UploadCloud size={20} />
                                </a>
                            </div>
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.3rem' }}>
                                1. Click cloud icon to upload on Drive <br/>
                                2. Paste the "Share" link here.
                            </p>
                        </div>

                        <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                            Add Resource
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* View File Modal */}
        {viewFile && (
             <div className="fixed inset-0" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
                 <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a' }}>
                     <div style={{ color: 'white', fontWeight: 'bold' }}>{viewFile.title}</div>
                     <div style={{ display: 'flex', gap: '1rem' }}>
                         <a href={viewFile.mega_link} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.9rem' }}>
                             <Download size={16} /> Open in Drive
                         </a>
                         <button onClick={() => setViewFile(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                     </div>
                 </div>
                 <div style={{ flex: 1, background: '#1e1e1e', overflow: 'hidden' }}>
                     {/* Google Drive Embed Logic */}
                     {viewFile.mega_link.includes('/folders/') ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc', textAlign: 'center', padding: '2rem' }}>
                            <div style={{ marginBottom: '1.5rem', opacity: 0.7 }}>
                                <Folder size={64} color="#37a0ea" />
                            </div>
                            <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Google Drive Folder</h3>
                            <p style={{ maxWidth: '400px', marginBottom: '2rem' }}>
                                This is a direct link to a folder. Please open it in a new tab to view contents.
                            </p>
                            <a 
                                href={viewFile.mega_link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn-primary" 
                                style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '1rem', background: '#37a0ea' }}
                            >
                                <ExternalLink size={20} /> Open Folder
                            </a>
                        </div>
                     ) : (
                        <iframe 
                            src={viewFile.mega_link.includes('drive.google.com') && viewFile.mega_link.includes('/view') ? viewFile.mega_link.replace('/view', '/preview') : viewFile.mega_link}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="File Viewer"
                        />
                     )}
                 </div>
             </div>
        )}
    </div>
  );
};

export default Notes;
