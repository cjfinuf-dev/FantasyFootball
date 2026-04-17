// Trade Finder
// ─────────────
// Scans every opposing roster for trade packages that are (a) favorable
// to the user AND (b) plausibly acceptable to the partner. Sorts by the
// geometric mean of those two signals.
//
// Clicking "Load" on a candidate lifts the proposal into TradeProposal
// via the `onLoad` callback: { partnerId, sendIds, receiveIds }.

import { useMemo, useState } from 'react';
import { PLAYERS } from '../../data/players';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { getHexScore, formatHex } from '../../utils/hexScore';
import { getEspnId } from '../../data/espnIds';
import { findTradeCandidates } from '../../utils/tradeMatchmaker';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import PosBadge from '../ui/PosBadge';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

function TickBar({ value, tone = 'accept', label }) {
  const width = Math.max(6, Math.min(100, Math.round((value || 0) * 100)));
  return (
    <div className="td-bar">
      <div className="td-bar__label">{label}</div>
      <div className="td-bar__track">
        <div className={`td-bar__fill td-bar__fill--${tone}`} style={{ width: width + '%' }} />
        <span className="td-bar__value tabular-nums">{width}</span>
      </div>
    </div>
  );
}

function PlayerCapsule({ playerId }) {
  const p = PLAYER_MAP[playerId];
  if (!p) return null;
  const hex = getHexScore(playerId);
  return (
    <div className="td-capsule">
      <PlayerHeadshot espnId={getEspnId(p.name)} name={p.name} size="xs" pos={p.pos} team={p.team} />
      <div className="td-capsule__info">
        <div className="td-capsule__name">{p.name}</div>
        <div className="td-capsule__meta">
          <PosBadge pos={p.pos} />
          <span className="td-capsule__team">{p.team}</span>
        </div>
      </div>
      <div className="td-capsule__hex tabular-nums">{formatHex(hex)}</div>
    </div>
  );
}

export default function TradeFinder({ rosters, history, scoringPreset = 'standard', onLoad }) {
  const [filter, setFilter] = useState('all'); // all | likely | upgrade
  const candidates = useMemo(
    () => findTradeCandidates({
      userTeamId: USER_TEAM_ID,
      rosters,
      teams: TEAMS,
      history,
      scoringPreset,
      limit: 18,
    }),
    [rosters, history, scoringPreset]
  );

  const filtered = useMemo(() => {
    if (filter === 'likely')  return candidates.filter(c => c.acceptance.score >= 55);
    if (filter === 'upgrade') return candidates.filter(c => c.userUpside >= 0.55);
    return candidates;
  }, [candidates, filter]);

  if (!rosters || Object.values(rosters).every(r => !r || r.length === 0)) {
    return (
      <div className="td-finder-empty">
        <div className="td-finder-empty__title">Scan complete — zero rosters.</div>
        <div className="td-finder-empty__desc">Complete the draft to surface trade candidates across the league.</div>
      </div>
    );
  }

  return (
    <div className="td-finder">
      <div className="td-finder__header">
        <div>
          <div className="td-finder__eyebrow">AUTOMATED DESK</div>
          <h3 className="td-finder__title">Trades worth proposing</h3>
          <p className="td-finder__sub">
            Ranked by <em>your</em> upside × <em>their</em> likelihood to accept. One-for-one openers across every roster in the league.
          </p>
        </div>
        <div className="td-finder__filters">
          {[
            { id: 'all', label: 'All' },
            { id: 'likely', label: 'Likely accept' },
            { id: 'upgrade', label: 'Biggest upgrades' },
          ].map(f => (
            <button
              key={f.id}
              className={`td-finder__filter${filter === f.id ? ' is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="td-finder-empty">
          <div className="td-finder-empty__title">Nothing matches that filter.</div>
          <div className="td-finder-empty__desc">Try widening the pool or loosening expectations.</div>
        </div>
      ) : (
        <ol className="td-finder__list">
          {filtered.map((c, i) => {
            const tone =
              c.acceptance.verdict === 'likely' ? 'accept' :
              c.acceptance.verdict === 'reach'   ? 'reach' :
              c.acceptance.verdict === 'longshot'? 'longshot' : 'insult';
            return (
              <li key={c.partner.id + '-' + c.sendIds.join(',') + '-' + c.receiveIds.join(',')}
                  className="td-candidate"
                  style={{ '--td-stagger': `${i * 45}ms` }}>
                <div className="td-candidate__rank tabular-nums">{String(i + 1).padStart(2, '0')}</div>

                <div className="td-candidate__body">
                  <div className="td-candidate__head">
                    <div className="td-candidate__partner">
                      <span className="td-candidate__abbr">{c.partner.abbr}</span>
                      <span className="td-candidate__name">{c.partner.name}</span>
                      <span className="td-candidate__record tabular-nums">{c.partner.wins}-{c.partner.losses}</span>
                    </div>
                    <span className={`td-candidate__verdict td-verdict--${tone}`}>
                      {c.acceptance.verdict === 'likely' ? 'Likely' :
                       c.acceptance.verdict === 'reach' ? 'Reach' :
                       c.acceptance.verdict === 'longshot' ? 'Longshot' : 'Insult'}
                      <span className="td-candidate__verdict-score tabular-nums">{c.acceptance.score}</span>
                    </span>
                  </div>

                  <div className="td-candidate__swap">
                    <div className="td-candidate__side td-candidate__side--send">
                      <div className="td-candidate__side-label">YOU SEND</div>
                      {c.sendIds.map(id => <PlayerCapsule key={id} playerId={id} />)}
                    </div>
                    <div className="td-candidate__arrow" aria-hidden="true">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <path d="M4 10H22M22 10L16 4M22 10L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M24 18H6M6 18L12 12M6 18L12 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                      </svg>
                    </div>
                    <div className="td-candidate__side td-candidate__side--receive">
                      <div className="td-candidate__side-label">YOU GET</div>
                      {c.receiveIds.map(id => <PlayerCapsule key={id} playerId={id} />)}
                    </div>
                  </div>

                  <div className="td-candidate__signals">
                    <TickBar value={c.userUpside} tone="accept" label="Your upside" />
                    <TickBar value={c.acceptance.likelihood} tone={tone} label="Acceptance" />
                  </div>

                  <div className="td-candidate__footer">
                    <div className="td-candidate__reasons">
                      {c.acceptance.reasons.slice(0, 2).map((r, idx) => (
                        <span key={idx} className="td-candidate__reason">{r}</span>
                      ))}
                    </div>
                    <button
                      className="td-candidate__load"
                      onClick={() => onLoad?.({
                        partnerId: c.partner.id,
                        sendIds: c.sendIds,
                        receiveIds: c.receiveIds,
                      })}
                    >
                      Load into proposal →
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
