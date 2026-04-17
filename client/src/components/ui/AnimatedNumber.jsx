import { useState, useEffect, useRef } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function AnimatedNumber({ value, duration = 400, decimals = 1, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const to = typeof value === 'number' ? value : parseFloat(value) || 0;

    // Respect the same a11y contract the CSS @media rule advertises — don't
    // animate score tickers when the user asked for reduced motion.
    if (prefersReducedMotion()) {
      setDisplay(to);
      prevRef.current = to;
      return;
    }

    const from = prevRef.current;
    const start = performance.now();
    let raf;

    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(animate);
      else prevRef.current = to;
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}
