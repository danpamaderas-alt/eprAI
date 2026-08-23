import { useEffect, useState } from 'react';
import { isStorageRef } from '../utils/designImageRef';
import { resolveImageSrc } from '../utils/designStorage';

/**
 * Resuelve una referencia de imagen (https, data: o path de storage)
 * a un src mostrable. Los paths se firman async; el resto pasa derecho.
 */
export const useImageSrc = (ref: string | null | undefined): string | null => {
  const [src, setSrc] = useState<string | null>(() =>
    ref && !isStorageRef(ref) ? ref : null,
  );

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!ref) {
        if (alive) setSrc(null);
        return;
      }
      if (!isStorageRef(ref)) {
        if (alive) setSrc(ref);
        return;
      }
      try {
        const resolved = await resolveImageSrc(ref);
        if (alive) setSrc(resolved);
      } catch {
        if (alive) setSrc(null);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [ref]);

  return src;
};
