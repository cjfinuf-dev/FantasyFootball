// Acceptance Meter
// ──────────────────
// Animated gauge + verdict readout for a proposed trade.
// Reads the `estimateAcceptance()` shape from tradeMatchmaker.js.
// Meant to live inside cards on the Trade Desk — not full-bleed.
//
// The needle position interpolates smoothly on mount / prop change via a
// CSS transition on `transform: rotate()`. Reduced motion respected by the
// global CSS @media rule.

import { useMemo } from 'react';

const VERDICT_META = {
  likely:   { label: 'LIKELY ACCEPT', tone: 'tone-accept' },
  reach:    { label: 'A REACH',       tone: 'tone-reach' },
  longshot: { label: 'LONGSHOT',      tone: 'tone-longshot' },
  insult:   { label: 'INSULTING',     tone: 'tone-insult' },
  empty:    { label: 'PENDING',       tone: 'tone-empty' },
};

export default function AcceptanceMeter({
  result,               // from estimateAcceptance()
  headline = 'ACCEPTANCE PROBABILITY',
  size = 'md',          // 'sm' | 'md' | 'lg'
  showReasons = true,
}) {
  const empty = !result || result.verdict === 'empty';
  const score = empty ? 0 : (result.score || 0);
  const meta = VERDICT_META[result?.verdict] || VERDICT_META.empty;

  // Needle rotation: -90deg at 0, +90deg at 100, linear between.
  const rotation = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, score));
    return -90 + (clamped / 100) * 180;
  }, [score]);

  return (
    <div className={`td-gauge td-gauge--${size} ${meta.tone}${empty ? ' td-gauge--empty' : ''}`}>
      <div className="td-gauge__label">{headline}</div>
      <div className="td-gauge__face">
        <svg viewBox="0 0 220 128" preserveAspectRatio="xMidYMid meet" aria-hidden="true" className="td-gauge__svg">
          {/* Arc background */}
          <path d="M 18 118 A 92 92 0 0 1 202 118" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="18" strokeLinecap="butt" />
          {/* Zone ticks (4 colored arcs) */}
          <path d="M 18 118 A 92 92 0 0 1 63 36" fill="none" stroke="var(--td-danger)" strokeWidth="2" strokeOpacity="0.55" />
          <path d="M 63 36 A 92 92 0 0 1 110 26" fill="none" stroke="var(--td-warn)" strokeWidth="2" strokeOpacity="0.55" />
          <path d="M 110 26 A 92 92 0 0 1 157 36" fill="none" stroke="var(--td-hex)" strokeWidth="2" strokeOpacity="0.55" />
          <path d="M 157 36 A 92 92 0 0 1 202 118" fill="none" stroke="var(--td-accept)" strokeWidth="2" strokeOpacity="0.7" />

          {/* Tick marks every 10% */}
          {Array.from({ length: 11 }, (_, i) => {
            const angle = -90 + (i / 10) * 180;
            const rad = (angle * Math.PI) / 180;
            const r1 = 95, r2 = i % 5 === 0 ? 83 : 89;
            const x1 = 110 + r1 * Math.sin(rad);
            const y1 = 118 - r1 * Math.cos(rad);
            const x2 = 110 + r2 * Math.sin(rad);
            const y2 = 118 - r2 * Math.cos(rad);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="currentColor" strokeOpacity={i % 5 === 0 ? 0.45 : 0.22} strokeWidth={i % 5 === 0 ? 1.5 : 1} />
            );
          })}

          {/* Needle */}
          <g
            style={{
              transformOrigin: '110px 118px',
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 780ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <line x1="110" y1="118" x2="110" y2="34" stroke="var(--td-needle)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="110" cy="34" r="4" fill="var(--td-needle)" />
          </g>

          {/* Hub */}
          <circle cx="110" cy="118" r="9" fill="var(--td-ink)" stroke="var(--td-needle)" strokeWidth="2" />
        </svg>
        <div className="td-gauge__readout">
          <div className="td-gauge__score tabular-nums">{empty ? '—' : score}</div>
          <div className="td-gauge__verdict">{meta.label}</div>
        </div>
      </div>

      {!empty && showReasons && result?.reasons?.length > 0 && (
        <ul className="td-gauge__reasons">
          {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {!empty && result?.friendliness && result.friendliness.sample >= 3 && (
        <div className="td-gauge__friend">
          <span className="td-gauge__friend-label">TRADE FRIENDLINESS</span>
          <div className="td-gauge__friend-bar">
            <div className="td-gauge__friend-fill" style={{ width: `${result.friendliness.score}%` }} />
          </div>
          <span className="td-gauge__friend-score tabular-nums">{Math.round(result.friendliness.score)}</span>
        </div>
      )}
    </div>
  );
}
