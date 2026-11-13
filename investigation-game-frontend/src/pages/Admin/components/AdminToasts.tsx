import { notificationIcons } from '@/components/notificationIcons';
import { Toaster, ToastBar } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import PopupNotice from '@/components/PopupNotice';

export default function AdminToasts() {
  const { i18n } = useTranslation();
  return <Toaster position={i18n.dir() === 'rtl' ? 'bottom-left' : 'bottom-right'}>
    {toast => <ToastBar toast={toast} style={{ background: 'transparent', padding: 0, boxShadow: 'none', maxWidth: 'min(25rem, calc(100vw - 2rem))' }}>
      {({ message }) => (
        <PopupNotice icon={toast.icon ?? notificationIcons[toast.type === 'blank' || toast.type === 'custom' ? 'information' : toast.type]} tone={toast.type === 'success' || toast.type === 'error' ? toast.type : undefined}>
          {message}
        </PopupNotice>
      )}
    </ToastBar>}
  </Toaster>;
}
