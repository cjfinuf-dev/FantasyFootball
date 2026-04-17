import { useEffect, useRef, useState } from 'react';

export const DELTA_MIN = 0.05;
export const DELTA_STRONG = 3.0;

// Pure classifier — exported for unit testing. Returns null when the change
// is below the noise floor or when either side of the comparison is null.
export function classifyDelta(prev, current) {
  if (current == null || prev == null) return null;
  const diff = current - prev;
  if (Math.abs(diff) < DELTA_MIN) return null;
  const tier = Math.abs(diff) >= DELTA_STRONG ? 'strong' : diff > 0 ? 'up' : 'down';
  return { delta: diff, tier };
}

// Observes changes in `value` over time. First observation seeds the ref and
// emits nothing — a chip should only appear on the second-or-later update.
// Each meaningful change bumps `key` so consumers can remount an animation.
export function useLiveDelta(value) {
  const prevRef = useRef(null);
  const keyRef = useRef(0);
  const [state, setState] = useState({ delta: 0, key: 0, tier: 'none' });

  useEffect(() => {
    if (value == null) return;
    const prev = prevRef.current;
    prevRef.current = value;
    const classified = classifyDelta(prev, value);
    if (!classified) return;
    keyRef.current += 1;
    setState({ delta: classified.delta, key: keyRef.current, tier: classified.tier });
  }, [value]);

  return state;
}
