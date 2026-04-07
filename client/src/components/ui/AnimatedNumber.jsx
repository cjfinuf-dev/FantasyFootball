import { useState, useEffect, useRef } from 'react';

export default function AnimatedNumber({ value, duration = 400, decimals = 1, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = typeof value === 'number' ? value : parseFloat(value) || 0;
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
