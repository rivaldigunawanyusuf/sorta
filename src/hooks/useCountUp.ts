import { useEffect, useRef, useState } from 'react';

export function useCountUp(targetValue: number, durationMs = 420): number {
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const currentRef = useRef<number>(targetValue);

  useEffect(() => {
    const startValue = currentRef.current;
    if (startValue === targetValue) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      currentRef.current = targetValue;
      setDisplayValue(targetValue);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(startValue + (targetValue - startValue) * eased);
      currentRef.current = next;
      setDisplayValue(next);

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [targetValue, durationMs]);

  return displayValue;
}
