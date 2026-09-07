import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lightweight local feedback after grid quick-add (no global toast library).
 */
export function useQuickAddFeedback(message = 'تمت الإضافة للسلة') {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const notify = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { visible, message, notify };
}
