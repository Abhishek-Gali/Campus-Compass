import React, { useState, useEffect } from 'react';
import { getContacts, addContact, deleteContact } from '../utils/contacts';
import { Search, Plus, Trash2, Copy, Phone, User, Check } from 'lucide-react';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const data = await getContacts();
    setContacts(data || []);
    setLoading(false);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;

    const added = await addContact(newContact.name, newContact.phone);
    if (added) {
      setContacts([added, ...contacts]);
      setNewContact({ name: '', phone: '' });
      setShowAddModal(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      const success = await deleteContact(id);
      if (success) {
        setContacts(contacts.filter(c => c.id !== id));
      }
    }
  };

  const handleCopy = (phone, id) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Contacts</h2>
            <p style={{ opacity: 0.7 }}>Manage important phone numbers</p>
        </div>
        <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
            <Plus size={20} /> Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Search size={20} style={{ opacity: 0.5 }} />
        <input 
            type="text" 
            placeholder="Search by name or number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: '1rem', width: '100%', outline: 'none' }}
        />
      </div>

      {/* Contacts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading contacts...</div>
      ) : filteredContacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
            <User size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No contacts found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filteredContacts.map(contact => (
                <div key={contact.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ 
                            width: '50px', height: '50px', borderRadius: '50%', 
                            background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent)'
                        }}>
                            {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{contact.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8, marginTop: '0.2rem', fontSize: '0.9rem' }}>
                                <Phone size={14} />
                                {contact.phone}
                            </div>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                            onClick={() => handleCopy(contact.phone, contact.id)}
                            title="Copy Number"
                            style={{ 
                                background: copiedId === contact.id ? '#2ed573' : 'rgba(255,255,255,0.1)', 
                                border: 'none', borderRadius: '8px', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: copiedId === contact.id ? 'white' : 'inherit', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {copiedId === contact.id ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                        <button 
                            onClick={() => handleDelete(contact.id)}
                            title="Delete"
                            style={{ 
                                background: 'rgba(255, 71, 87, 0.1)', border: 'none', borderRadius: '8px', 
                                width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#ff4757', cursor: 'pointer'
                            }}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Make FAB for Add on mobile too? No, header button is fine for now if responsive. */}

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '2rem', background: '#1e293b' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Add Contact</h3>
                <form onSubmit={handleAddSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Name</label>
                        <input 
                            type="text" 
                            required
                            className="glass-input"
                            value={newContact.name}
                            onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Phone Number</label>
                        <input 
                            type="tel" 
                            required
                            className="glass-input"
                            value={newContact.phone}
                            onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button 
                            type="button" 
                            onClick={() => setShowAddModal(false)}
                            style={{ padding: '0.8rem 1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn-primary"
                            style={{ padding: '0.8rem 1.5rem' }}
                        >
                            Save Contact
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
