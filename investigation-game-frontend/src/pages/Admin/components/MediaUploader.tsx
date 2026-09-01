import { forwardRef } from 'react';
import toast from 'react-hot-toast';
import { AdminFileInput } from './AdminUI';
import { validateImageSize, validateAudioSize } from '../utils/validators';

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
    <div className="media-uploader-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
          style={{ maxHeight: '100px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', alignSelf: 'flex-start' }} 
        />
      )}
      {previewUrl && accept === 'audio/*' && (
        <audio 
          controls 
          src={previewUrl} 
          style={{ height: '32px', width: '100%' }} 
        />
      )}
    </div>
  );
});

MediaUploader.displayName = 'MediaUploader';
export default MediaUploader;