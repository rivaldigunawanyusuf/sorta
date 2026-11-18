import { useCallback, useEffect, useRef, useState } from 'react';

export type WakeLockStatus = 'ACTIVE' | 'OFF' | 'UNSUPPORTED';

export function useWakeLock(defaultEnabled = true) {
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [desired, setDesired] = useState<boolean>(defaultEnabled);
  const [status, setStatus] = useState<WakeLockStatus>(
    isSupported ? (defaultEnabled ? 'ACTIVE' : 'OFF') : 'UNSUPPORTED',
  );
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!('wakeLock' in navigator) || !navigator.wakeLock) {
      setStatus('UNSUPPORTED');
      return;
    }
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setStatus('ACTIVE');
      sentinel.addEventListener('release', () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
          setStatus('OFF');
        }
      });
    } catch {
      // Browsers require document visibility or user gesture before granting wakeLock
      setStatus('OFF');
    }
  }, []);

  const release = useCallback(async () => {
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
      } catch {
        // Ignore already-released sentinel
      }
      sentinelRef.current = null;
    }
    setStatus(isSupported ? 'OFF' : 'UNSUPPORTED');
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;
    if (desired) {
      void acquire();
    } else {
      void release();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && desired) {
        void acquire();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      void release();
    };
  }, [desired, isSupported, acquire, release]);

  const toggle = useCallback(() => {
    setDesired((prev) => !prev);
  }, []);

  return {
    wakeLockEnabled: desired,
    wakeLockStatus: status,
    toggleWakeLock: toggle,
  };
}
