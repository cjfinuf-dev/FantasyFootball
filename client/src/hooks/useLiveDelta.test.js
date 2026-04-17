import { describe, it, expect } from 'vitest';
import { classifyDelta, DELTA_MIN, DELTA_STRONG } from './useLiveDelta';

describe('classifyDelta', () => {
  it('returns null on first observation (prev is null)', () => {
    expect(classifyDelta(null, 12)).toBeNull();
  });

  it('returns null when current value is null', () => {
    expect(classifyDelta(10, null)).toBeNull();
  });

  it('returns null when both sides are null', () => {
    expect(classifyDelta(null, null)).toBeNull();
  });

  it('suppresses sub-threshold positive change (0.03)', () => {
    expect(classifyDelta(10, 10.03)).toBeNull();
  });

  it('suppresses sub-threshold negative change (-0.03)', () => {
    expect(classifyDelta(10, 9.97)).toBeNull();
  });

  it('classifies a +0.4 change as up tier', () => {
    const r = classifyDelta(10, 10.4);
    expect(r).not.toBeNull();
    expect(r.tier).toBe('up');
    expect(r.delta).toBeCloseTo(0.4, 5);
  });

  it('classifies a -2.0 change as down tier', () => {
    const r = classifyDelta(10, 8);
    expect(r).not.toBeNull();
    expect(r.tier).toBe('down');
    expect(r.delta).toBeCloseTo(-2, 5);
  });

  it('classifies a +6.0 (TD-range) change as strong tier', () => {
    const r = classifyDelta(12, 18);
    expect(r).not.toBeNull();
    expect(r.tier).toBe('strong');
    expect(r.delta).toBeCloseTo(6, 5);
  });

  it('classifies a large negative change (-4) as strong tier', () => {
    const r = classifyDelta(20, 16);
    expect(r).not.toBeNull();
    expect(r.tier).toBe('strong');
    expect(r.delta).toBeCloseTo(-4, 5);
  });

  it('a change exactly at DELTA_MIN is emitted', () => {
    const r = classifyDelta(10, 10 + DELTA_MIN);
    expect(r).not.toBeNull();
    expect(r.tier).toBe('up');
  });

  it('a change exactly at DELTA_STRONG is classified strong', () => {
    const r = classifyDelta(10, 10 + DELTA_STRONG);
    expect(r).not.toBeNull();
    expect(r.tier).toBe('strong');
  });

  it('rapid successive changes each produce a classification', () => {
    // Simulates what the hook does: ref is updated each call, so each call
    // sees the previous observed value.
    expect(classifyDelta(10, 10.5).tier).toBe('up');
    expect(classifyDelta(10.5, 11.0).tier).toBe('up');
    expect(classifyDelta(11.0, 17.0).tier).toBe('strong');
    expect(classifyDelta(17.0, 16.5).tier).toBe('down');
  });
});
