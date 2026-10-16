import { useEffect, useState } from 'react';

/**
 * Creates an object URL for a `File`/`Blob` and revokes it when the value
 * changes or the component unmounts. Replaces ad-hoc `URL.createObjectURL`
 * calls in JSX, which leak a new URL on every render until the tab is closed.
 */
export function useObjectUrl(value: Blob | File | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = value ? URL.createObjectURL(value) : null;
    // An object URL is an external resource: it has to be allocated inside the
    // effect that owns its lifetime, and no render-phase equivalent can also
    // revoke the previous URL.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [value]);

  return url;
}
