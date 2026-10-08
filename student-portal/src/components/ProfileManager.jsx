import React, { useState, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Camera, Upload, X, Save, AlertCircle, Check } from 'lucide-react';

const ProfileManager = ({ user, onClose, onUpdateUser }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user.photo || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image must be less than 5MB.');
      return;
    }

    setError('');
    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
  };

  const sanitizeImage = (imageSrc) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Resize if too big (max 500x500 for avatar)
        let width = img.width;
        let height = img.height;
        const maxSize = 500;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas (sanitization step - strips metadata/scripts)
        ctx.drawImage(img, 0, 0, width, height);
        
        // Export as Blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas export failed'));
          }
        }, 'image/jpeg', 0.9);
      };
      img.onerror = (e) => reject(e);
      img.src = imageSrc;
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Sanitize Image
      const sanitizedBlob = await sanitizeImage(previewUrl);
      const fileName = `${user.id}-${Date.now()}.jpg`; // Unique name
      const filePath = `${user.id}/${fileName}`;

      // 2. List old files to delete
      const { data: listData } = await supabase.storage
        .from('avatars')
        .list(user.id);
      
      if (listData && listData.length > 0) {
        const filesToRemove = listData.map(x => `${user.id}/${x.name}`);
        await supabase.storage.from('avatars').remove(filesToRemove);
      }

      // 3. Upload new file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, sanitizedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 5. Update User Profile in DB
      const { error: dbError } = await supabase
        .from('users')
        .update({ photo: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 6. Update local state
      onUpdateUser({ ...user, photo: publicUrl });
      setSuccess('Profile photo updated successfully!');
      setTimeout(onClose, 1500);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal glass-panel">
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        
        <h2>Update Profile Photo</h2>
        
        <div className="preview-area">
          <div className="avatar-large" style={{ 
            backgroundImage: previewUrl ? `url(${previewUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            {!previewUrl && user.id.slice(-2)}
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            hidden 
          />
          
          <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>
            <Camera size={20} /> Select Photo
          </button>
        </div>

        {/* Hidden Canvas for processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="success-msg"><Check size={16} /> {success}</div>}

        <div className="actions">
          <button className="btn-primary" onClick={handleUpload} disabled={uploading || !selectedFile}>
            {uploading ? 'Processing...' : (
                <> <Save size={20} /> Save Photo </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;
