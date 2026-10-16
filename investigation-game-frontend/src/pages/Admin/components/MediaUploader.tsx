import { forwardRef } from 'react';
import toast from 'react-hot-toast';
import { AdminFileInput } from './AdminUI';
import { validateImageSize, validateAudioSize } from '../utils/validators';
import adminForms from '../forms/Shared/AdminForms.module.css';

interface MediaUploaderProps {
  label: string;
  hint?: string;
  accept: 'image/*' | 'audio/*';
  previewUrl?: string | null;
  maxSizeMB?: number;
  onChange: (file: File | null) => void;
}

const MediaUploader = forwardRef<HTMLInputElement, MediaUploaderProps>(({
  label, hint, accept, previewUrl, maxSizeMB, onChange
}, ref) => {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { onChange(null); return; }

    const error = accept === 'image/*' ? validateImageSize(file, maxSizeMB) : validateAudioSize(file);

    if (!error) {
      onChange(file);
    } else {
      toast.error(error);
      onChange(null);
      e.target.value = ''; 
    }
  };

  return (
    <div className={adminForms['media-uploader-group']}>
      <AdminFileInput
        label={label}
        hint={hint}
        accept={accept}
        ref={ref}
        onChange={handleFileChange}
      />
      
      {/* Abstracted Preview Handlers */}
      {previewUrl && accept === 'image/*' && (
        <img
          src={previewUrl}
          alt="Upload Preview"
          className={adminForms['media-uploader-preview']}
        />
      )}
      {previewUrl && accept === 'audio/*' && (
        <audio
          controls
          src={previewUrl}
          className={adminForms['media-uploader-audio']}
        />
      )}
    </div>
  );
});

MediaUploader.displayName = 'MediaUploader';
export default MediaUploader;