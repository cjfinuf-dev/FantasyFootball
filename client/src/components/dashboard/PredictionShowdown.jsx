import { useMemo, useState, useRef, useEffect } from 'react';
import { getPredictionStats } from '../../data/predictionTracker';
import { TOTAL_WEEKS } from '../../data/seasonConfig';
import AnimatedNumber from '../ui/AnimatedNumber';
import HexBrand from '../ui/HexBrand';

// ─── SVG Accuracy Race Chart ───

function AccuracyRace({ cumulative }) {
  const svgRef = useRef(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDrawn(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const W = 560, H = 180, PAD_X = 36, PAD_Y = 20;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;
  const minY = 55, maxY = 90;
  const yRange = maxY - minY;

  const toX = (i) => PAD_X + (i / (cumulative.length - 1)) * chartW;
  const toY = (pct) => PAD_Y + (1 - (pct - minY) / yRange) * chartH;

  const hexPoints = cumulative.map((w, i) => `${toX(i)},${toY(w.hexPct)}`).join(' ');
  const projPoints = cumulative.map((w, i) => `${toX(i)},${toY(w.projPct)}`).join(' ');

  // Grid lines at 60%, 70%, 80%
  const gridLines = [60, 70, 80].filter(v => v >= minY && v <= maxY);

  return (
    <div className="ff-oracle-section ff-oracle-race">
      <div className="ff-oracle-section-header">
        <h3>Accuracy Race</h3>
        <span className="ff-oracle-section-meta">Cumulative accuracy over {cumulative.length} weeks</span>
      </div>
      <div className="ff-oracle-chart-wrap">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="ff-oracle-chart">
          {/* Grid */}
          {gridLines.map(v => (
            <g key={v}>
              <line x1={PAD_X} y1={toY(v)} x2={W - PAD_X} y2={toY(v)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
              <text x={PAD_X - 6} y={toY(v) + 3} textAnchor="end" className="ff-oracle-chart-label">{v}%</text>
            </g>
          ))}

          {/* Week labels */}
          {cumulative.map((w, i) => (
            <text key={w.week} x={toX(i)} y={H - 4} textAnchor="middle" className="ff-oracle-chart-label">W{w.week}</text>
          ))}

          {/* Area fills */}
          <polygon
            points={`${toX(0)},${toY(minY)} ${hexPoints} ${toX(cumulative.length - 1)},${toY(minY)}`}
            fill="var(--hex-purple)" opacity="0.06"
            className={drawn ? 'ff-oracle-area-reveal' : ''}
          />
          <polygon
            points={`${toX(0)},${toY(minY)} ${projPoints} ${toX(cumulative.length - 1)},${toY(minY)}`}
            fill="var(--win)" opacity="0.04"
            className={drawn ? 'ff-oracle-area-reveal' : ''}
          />

          {/* Lines */}
          <polyline
            points={hexPoints}
            fill="none" stroke="var(--hex-purple)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`ff-oracle-line${drawn ? ' ff-oracle-line--drawn' : ''}`}
            pathLength="1"
          />
          <polyline
            points={projPoints}
            fill="none" stroke="var(--win)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3"
            className={`ff-oracle-line ff-oracle-line-proj${drawn ? ' ff-oracle-line--drawn' : ''}`}
            pathLength="1"
          />

          {/* Data points */}
          {drawn && cumulative.map((w, i) => (
            <g key={w.week}>
              <circle cx={toX(i)} cy={toY(w.hexPct)} r="3.5" fill="var(--hex-purple)" stroke="var(--bg-white)" strokeWidth="1.5"
                className="ff-oracle-dot-anim" style={{ animationDelay: `${600 + i * 80}ms` }} />
              <circle cx={toX(i)} cy={toY(w.projPct)} r="3" fill="var(--win)" stroke="var(--bg-white)" strokeWidth="1.5"
                className="ff-oracle-dot-anim" style={{ animationDelay: `${650 + i * 80}ms` }} />
            </g>
          ))}

          {/* End labels */}
          {drawn && (
            <>
              <text x={toX(cumulative.length - 1) + 8} y={toY(cumulative[cumulative.length - 1].hexPct) + 4}
                className="ff-oracle-chart-end-label" fill="var(--hex-purple-vivid)">
                {cumulative[cumulative.length - 1].hexPct.toFixed(1)}%
              </text>
              <text x={toX(cumulative.length - 1) + 8} y={toY(cumulative[cumulative.length - 1].projPct) + 4}
                className="ff-oracle-chart-end-label" fill="var(--win)">
                {cumulative[cumulative.length - 1].projPct.toFixed(1)}%
              </text>
            </>
          )}
        </svg>

        {/* Legend */}
        <div className="ff-oracle-legend">
          <span className="ff-oracle-legend-item">
            <span className="ff-oracle-legend-swatch" style={{ background: 'var(--hex-purple)' }} />
            Hex Score
          </span>
          <span className="ff-oracle-legend-item">
            <span className="ff-oracle-legend-swatch ff-oracle-legend-swatch--dashed" style={{ background: 'var(--win)' }} />
            Projected
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Week-by-Week Cards ───

function WeekCard({ data, index }) {
  const hexWon = data.hexCorrect > data.projCorrect;
  const projWon = data.projCorrect > data.hexCorrect;
  const winner = hexWon ? 'hex' : projWon ? 'proj' : 'tied';

  return (
    <div
      className={`ff-oracle-wcard ff-oracle-wcard--${winner}`}
      style={{ animationDelay: `${400 + index * 60}ms` }}
    >
      <div className="ff-oracle-wcard-header">
        <span className="ff-oracle-wcard-week">W{data.week}</span>
        {winner !== 'tied' && (
          <span className={`ff-oracle-wcard-badge ff-oracle-wcard-badge--${winner}`}>
            {hexWon ? '⬡' : '📈'}
          </span>
        )}
      </div>
      <div className="ff-oracle-wcard-scores">
        <div className="ff-oracle-wcard-score">
          <span className="ff-oracle-wcard-val" style={{ color: hexWon ? 'var(--hex-purple-vivid)' : 'var(--text-muted)' }}>
            {data.hexCorrect}/{data.total}
          </span>
          <span className="ff-oracle-wcard-label">Hex</span>
        </div>
        <div className="ff-oracle-wcard-score">
          <span className="ff-oracle-wcard-val" style={{ color: projWon ? 'var(--win)' : 'var(--text-muted)' }}>
            {data.projCorrect}/{data.total}
          </span>
          <span className="ff-oracle-wcard-label">Proj</span>
        </div>
      </div>
      {data.upsetCount > 0 && (
        <div className="ff-oracle-wcard-upset">
          {data.hexUpsets}/{data.upsetCount} upsets caught
        </div>
      )}
      <div className="ff-oracle-wcard-you">
        <span className={data.userHex === 'correct' ? 'ff-oracle-wcard-you--right' : 'ff-oracle-wcard-you--wrong'}>
          {data.userHex === 'correct' ? '✓' : '✗'}
        </span>
        <span className={data.userProj === 'correct' ? 'ff-oracle-wcard-you--right' : 'ff-oracle-wcard-you--wrong'}>
          {data.userProj === 'correct' ? '✓' : '✗'}
        </span>
      </div>
    </div>
  );
}

// ─── Stat Card ───

function StatCard({ title, icon, children, delay = 0 }) {
  return (
    <div className="ff-oracle-stat-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="ff-oracle-stat-card-header">
        {icon}
        <span>{title}</span>
      </div>
      <div className="ff-oracle-stat-card-body">
        {children}
      </div>
    </div>
  );
}

// ─── Circular Progress Ring ───

function ProgressRing({ pct, color, size = 64, strokeWidth = 5 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} className="ff-oracle-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="ff-oracle-ring-fill" style={{ '--ring-circ': circ }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="ff-oracle-ring-text" fill={color}>
        {pct.toFixed(0)}%
      </text>
    </svg>
  );
}

// ─── Bar Comparison ───

function DualBar({ hexVal, projVal, maxVal, label }) {
  return (
    <div className="ff-oracle-dualbar">
      <div className="ff-oracle-dualbar-label">{label}</div>
      <div className="ff-oracle-dualbar-track">
        <div className="ff-oracle-dualbar-fill" style={{ width: `${(hexVal / maxVal) * 100}%`, background: 'var(--hex-purple)' }} />
      </div>
      <div className="ff-oracle-dualbar-track">
        <div className="ff-oracle-dualbar-fill" style={{ width: `${(projVal / maxVal) * 100}%`, background: 'var(--win)' }} />
      </div>
      <div className="ff-oracle-dualbar-vals">
        <span style={{ color: 'var(--hex-purple)' }}>{hexVal}</span>
        <span style={{ color: 'var(--win)' }}>{projVal}</span>
      </div>
    </div>
  );
}

// ─── Main Oracle Page ───

export default function PredictionShowdown() {
  const stats = useMemo(() => getPredictionStats(), []);
  const hexLeading = stats.leader === 'hex';
  const projLeading = stats.leader === 'proj';
  const leaderColor = hexLeading ? 'var(--hex-purple-vivid)' : projLeading ? 'var(--win)' : 'var(--text-muted)';

  return (
    <div className="ff-oracle-page">

      {/* ═══ HERO ═══ */}
      <div className="ff-oracle-hero">
        <div className="ff-oracle-hero-bg" aria-hidden="true" />
        <div className="ff-oracle-hero-content">
          <div className="ff-oracle-hero-eyebrow">
            <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" width="14" height="15">
              <path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/>
            </svg>
            Season {new Date().getFullYear()} — {stats.weeksPlayed} of {TOTAL_WEEKS} Weeks
          </div>
          <h1 className="ff-oracle-hero-title">The Oracle</h1>
          <p className="ff-oracle-hero-sub">Two prediction methods. One season of truth.</p>

          {/* Duel Cards */}
          <div className="ff-oracle-hero-duel">
            <div className={`ff-oracle-hero-method${hexLeading ? ' ff-oracle-hero-method--leader' : ''}`}>
              <div className="ff-oracle-hero-method-label" style={{ color: 'var(--hex-purple)' }}>
                <svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.2" width="14" height="15"><path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/></svg>
                Hex Score
              </div>
              <div className="ff-oracle-hero-pct ff-mono tabular-nums" style={{ color: 'var(--hex-purple-vivid)' }}>
                <AnimatedNumber value={stats.hexPct} decimals={1} suffix="%" duration={1000} />
              </div>
              <div className="ff-oracle-hero-record ff-mono tabular-nums">{stats.hexTotal} / {stats.totalMatchups} correct</div>
              {hexLeading && <div className="ff-oracle-hero-crown">Leading</div>}
            </div>

            <div className="ff-oracle-hero-vs">
              <span>VS</span>
            </div>

            <div className={`ff-oracle-hero-method${projLeading ? ' ff-oracle-hero-method--leader ff-oracle-hero-method--proj-leader' : ''}`}>
              <div className="ff-oracle-hero-method-label" style={{ color: 'var(--win)' }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="14" height="14"><polyline points="2,14 6,8 10,11 14,4 18,7" /></svg>
                Projected Pts
              </div>
              <div className="ff-oracle-hero-pct ff-mono tabular-nums" style={{ color: 'var(--win)' }}>
                <AnimatedNumber value={stats.projPct} decimals={1} suffix="%" duration={1000} />
              </div>
              <div className="ff-oracle-hero-record ff-mono tabular-nums">{stats.projTotal} / {stats.totalMatchups} correct</div>
              {projLeading && <div className="ff-oracle-hero-crown ff-oracle-hero-crown--proj">Leading</div>}
            </div>
          </div>

          {/* Gap indicator */}
          <div className="ff-oracle-hero-gap">
            <div className="ff-oracle-hero-gap-track">
              <div className="ff-oracle-hero-gap-hex" style={{ width: `${stats.hexPct}%` }} />
              <div className="ff-oracle-hero-gap-proj" style={{ width: `${stats.projPct}%` }} />
            </div>
            <div className="ff-oracle-hero-gap-text" style={{ color: leaderColor }}>
              {stats.leader === 'tied' ? 'Dead even' : `${hexLeading ? 'Hex' : 'Proj'} leads by ${stats.gap} ${stats.gap === 1 ? 'pick' : 'picks'}`}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ACCURACY RACE CHART ═══ */}
      <AccuracyRace cumulative={stats.cumulative} />

      {/* ═══ WEEK-BY-WEEK GRID ═══ */}
      <div className="ff-oracle-section">
        <div className="ff-oracle-section-header">
          <h3>Week by Week</h3>
          <span className="ff-oracle-section-meta">
            Hex won {stats.cumulative.filter(w => w.hexCorrect > w.projCorrect).length} weeks,
            Proj won {stats.cumulative.filter(w => w.projCorrect > w.hexCorrect).length}
          </span>
        </div>
        <div className="ff-oracle-week-grid">
          {stats.cumulative.map((w, i) => (
            <WeekCard key={w.week} data={w} index={i} />
          ))}
        </div>
      </div>

      {/* ═══ INSIGHT CARDS GRID ═══ */}
      <div className="ff-oracle-insights">

        {/* Upset Detection */}
        <StatCard
          title="Upset Detection"
          delay={600}
          icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="16" height="16"><path d="M10 2v6l4 2"/><circle cx="10" cy="10" r="8"/></svg>}
        >
          <div className="ff-oracle-insight-row">
            <ProgressRing pct={stats.hexUpsetPct} color="var(--hex-purple)" />
            <div>
              <div className="ff-oracle-insight-big" style={{ color: 'var(--hex-purple-vivid)' }}>
                {stats.hexUpsetsCaught} / {stats.totalUpsets}
              </div>
              <div className="ff-oracle-insight-label">Hex caught</div>
            </div>
          </div>
          <div className="ff-oracle-insight-row">
            <ProgressRing pct={stats.projUpsetPct} color="var(--win)" />
            <div>
              <div className="ff-oracle-insight-big" style={{ color: 'var(--win)' }}>
                {stats.projUpsetsCaught} / {stats.totalUpsets}
              </div>
              <div className="ff-oracle-insight-label">Proj caught</div>
            </div>
          </div>
          <div className="ff-oracle-insight-note">
            Upsets = lower-ranked team winning. Hex's 8-factor model catches roster quality shifts that projections miss.
          </div>
        </StatCard>

        {/* Confidence Calibration */}
        <StatCard
          title="When Confident"
          delay={700}
          icon={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="16" height="16"><path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3-4.9-2.6-4.9 2.6.9-5.3-4-3.9 5.5-.8z"/></svg>}
        >
          <div className="ff-oracle-calib-row">
            <div className="ff-oracle-calib-method">
              <span className="ff-oracle-calib-pct ff-mono" style={{ color: 'var(--hex-purple-vivid)' }}>
                <AnimatedNumber value={stats.hexCalibration} decimals={0} suffix="%" duration={600} />
              </span>
              <span className="ff-oracle-calib-label">Hex accuracy when &gt;65% confident</span>
              <span className="ff-oracle-calib-detail ff-mono">{stats.hexHighConfCorrect}/{stats.hexHighConfTotal} picks</span>
            </div>
            <div className="ff-oracle-calib-method">
              <span className="ff-oracle-calib-pct ff-mono" style={{ color: 'var(--win)' }}>
                <AnimatedNumber value={stats.projCalibration} decimals={0} suffix="%" duration={600} />
              </span>
              <span className="ff-oracle-calib-label">Proj accuracy when &gt;65% confident</span>
              <span className="ff-oracle-calib-detail ff-mono">{stats.projHighConfCorrect}/{stats.projHighConfTotal} picks</span>
            </div>
          </div>
          <div className="ff-oracle-insight-note">
            Calibration = when a method is sure, how often is it right? Higher = more trustworthy confidence signals.
          </div>
        </StatCard>

        {/* Your Season */}
        <StatCard
          title="Your Matchups"
          delay={800}
          icon={<svg viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" width="16" height="17"><path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/><circle cx="7" cy="6" r="1.5"/><path d="M4.5 11a2.5 2.5 0 015 0"/></svg>}
        >
          <div className="ff-oracle-your-duel">
            <div className="ff-oracle-your-side">
              <div className="ff-oracle-your-pct ff-mono tabular-nums" style={{ color: 'var(--hex-purple-vivid)' }}>
                <AnimatedNumber value={stats.userHexPct} decimals={0} suffix="%" duration={600} />
              </div>
              <div className="ff-oracle-your-record ff-mono">{stats.userHexCorrect}/{stats.userTotal}</div>
              <div className="ff-oracle-your-label">Hex</div>
            </div>
            <div className="ff-oracle-your-divider" />
            <div className="ff-oracle-your-side">
              <div className="ff-oracle-your-pct ff-mono tabular-nums" style={{ color: 'var(--win)' }}>
                <AnimatedNumber value={stats.userProjPct} decimals={0} suffix="%" duration={600} />
              </div>
              <div className="ff-oracle-your-record ff-mono">{stats.userProjCorrect}/{stats.userTotal}</div>
              <div className="ff-oracle-your-label">Proj</div>
            </div>
          </div>
          <div className="ff-oracle-your-timeline">
            {stats.cumulative.map(w => (
              <div key={w.week} className="ff-oracle-your-week">
                <span className="ff-oracle-your-wk">W{w.week}</span>
                <span className={`ff-oracle-your-pip${w.userHex === 'correct' ? ' ff-oracle-your-pip--hex' : ''}`} />
                <span className={`ff-oracle-your-pip${w.userProj === 'correct' ? ' ff-oracle-your-pip--proj' : ''}`} />
              </div>
            ))}
          </div>
          <div className="ff-oracle-insight-note">
            How each method performed predicting <em>your</em> matchups specifically.
          </div>
        </StatCard>
      </div>

      {/* ═══ PHILOSOPHY ═══ */}
      <div className="ff-oracle-section ff-oracle-philosophy">
        <div className="ff-oracle-section-header">
          <h3>Why Two Methods?</h3>
        </div>
        <div className="ff-oracle-phil-grid">
          <div className="ff-oracle-phil-card ff-oracle-phil-hex">
            <div className="ff-oracle-phil-icon">
              <svg viewBox="0 0 14 15.5" fill="none" stroke="var(--hex-purple)" strokeWidth="1.4" width="28" height="30">
                <path d="M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z"/>
              </svg>
            </div>
            <h4>Hex Score</h4>
            <p>Evaluates <strong>roster quality</strong> through 8 dimensions: production, scarcity, consistency, situation, health, durability, context, and age curve. Captures talent shifts that weekly projections can't see.</p>
          </div>
          <div className="ff-oracle-phil-card ff-oracle-phil-proj">
            <div className="ff-oracle-phil-icon">
              <svg viewBox="0 0 20 20" fill="none" stroke="var(--win)" strokeWidth="1.5" strokeLinecap="round" width="28" height="28">
                <polyline points="2,14 6,8 10,11 14,4 18,7" />
              </svg>
            </div>
            <h4>Projected Points</h4>
            <p>Predicts <strong>this week's output</strong> using matchup data, opponent defense rankings, weather, and recent snap counts. Optimized for short-term scoring accuracy.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="ff-oracle-page-footer">
        Tracked by <HexBrand word="Metrics" icon={true} /> — updated weekly after results finalize
      </div>
    </div>
  );
}
