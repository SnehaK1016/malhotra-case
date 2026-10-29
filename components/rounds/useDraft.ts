'use client';
import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';
// Seeded by the authenticated round payload; no separate fetch can overwrite fresh typing.
export function useDraft<T>(round: number, key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial);
  const first = useRef(true);
  const pending = useRef<T>(initial);
  const dirty = useRef(false);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    pending.current = value; dirty.current = true;
    const send = (keepalive = false) => fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ round, key, value: pending.current }), keepalive }).then(r => { if (r.ok) dirty.current = false; }).catch(() => {});
    const id = setTimeout(() => { void send(); }, 350);
    const flush = () => { if (dirty.current) void send(true); };
    window.addEventListener('pagehide', flush);
    return () => { clearTimeout(id); window.removeEventListener('pagehide', flush); };
  }, [value, round, key]);
  return [value, setValue];
}
