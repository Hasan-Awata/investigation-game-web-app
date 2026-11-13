import PopupAction from '@/components/PopupAction';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import PopupDialog from '@/components/PopupDialog';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './ConfirmContext';

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { adminT } = useAdminTranslation();
  const t = adminT.component.confirmDialog;
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  const confirm = useCallback<ConfirmFn>((input) => {
    resolver.current?.(false);
    setOptions(typeof input === 'string' ? { message: input } : input);
    return new Promise<boolean>(resolve => { resolver.current = resolve; });
  }, []);
  const settle = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setOptions(null);
  }, []);
  useEffect(() => () => { resolver.current?.(false); resolver.current = null; }, []);
  return <ConfirmContext.Provider value={confirm}>
    {children}
    {options && <PopupDialog title={options.title ?? t.defaultTitle} tone={options.danger ? 'error' : 'neutral'}
      safeFocus={options.danger} onDismiss={() => settle(false)}
      actions={<>
        <PopupAction onClick={() => settle(false)}>{options.cancelLabel ?? t.cancelBtn}</PopupAction>
        <PopupAction primary danger={options.danger} onClick={() => settle(true)}>{options.confirmLabel ?? t.confirmBtn}</PopupAction>
      </>}>
      <p>{options.message}</p>
    </PopupDialog>}
  </ConfirmContext.Provider>;
}
