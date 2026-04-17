// Partner Profile
// ────────────────
// Renders a compact scouting dossier on a selected trade partner:
// needs, surplus positions, and trade friendliness sourced from history.
// Appears inside the Propose flow once a partner is selected.

import { useMemo } from 'react';
import { scorePartnerNeeds, calcTradeFriendliness } from '../../utils/tradeMatchmaker';

const SEVERITY_TO_WIDTH = (s) => Math.max(8, Math.min(100, Math.round(s * 100)));

const FRIENDLINESS_COPY = {
  open: 'Opens to reasonable offers. Make a fair pitch.',
  neutral: 'Selective. Lead with value + need.',
  closed: 'Rarely accepts. Bring a slight overpay and a message.',
  unknown: 'No trade history yet — unknown disposition.',
};

export default function PartnerProfile({ partner, partnerRosterIds, history = [], scoringPreset = 'standard' }) {
  const { needs, surplus } = useMemo(
    () => scorePartnerNeeds(partnerRosterIds || [], scoringPreset),
    [partnerRosterIds, scoringPreset]
  );
  const friendliness = useMemo(
    () => calcTradeFriendliness(partner?.id, history),
    [partner?.id, history]
  );

  if (!partner) return null;

  const topNeeds = needs.slice(0, 3);
  const topSurplus = surplus.slice(0, 3);

  return (
    <div className="td-dossier">
      <div className="td-dossier__header">
        <div className="td-dossier__filing">
          <span className="td-dossier__tag">DOSSIER</span>
          <span className="td-dossier__id tabular-nums">№ {partner.abbr}</span>
        </div>
        <h3 className="td-dossier__title">{partner.name}</h3>
        <div className="td-dossier__sub">
          <span>{partner.owner}</span>
          <span className="td-dossier__dot">·</span>
          <span className="tabular-nums">{partner.wins}-{partner.losses}</span>
          <span className="td-dossier__dot">·</span>
          <span className="tabular-nums">Power {partner.power}</span>
        </div>
      </div>

      <div className="td-dossier__grid">
        <div className="td-dossier__col">
          <div className="td-dossier__col-label">POSITIONS OF NEED</div>
          {topNeeds.length === 0 ? (
            <div className="td-dossier__empty">Well-balanced roster. Sell quality, not position.</div>
          ) : (
            <ul className="td-dossier__list">
              {topNeeds.map(n => (
                <li key={n.pos} className="td-dossier__item">
                  <span className="td-dossier__pos td-dossier__pos--need">{n.pos}</span>
                  <div className="td-dossier__meter">
                    <div
                      className="td-dossier__meter-fill td-dossier__meter-fill--need"
                      style={{ width: SEVERITY_TO_WIDTH(n.severity) + '%' }}
                    />
                  </div>
                  <span className="td-dossier__meter-hex tabular-nums">
                    {n.startingAvgHex ? Math.round(n.startingAvgHex) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="td-dossier__col">
          <div className="td-dossier__col-label">POSITIONS OF SURPLUS</div>
          {topSurplus.length === 0 ? (
            <div className="td-dossier__empty">Thin bench everywhere. Don't expect easy giveaways.</div>
          ) : (
            <ul className="td-dossier__list">
              {topSurplus.map(s => (
                <li key={s.pos} className="td-dossier__item">
                  <span className="td-dossier__pos td-dossier__pos--surplus">{s.pos}</span>
                  <div className="td-dossier__meter">
                    <div
                      className="td-dossier__meter-fill td-dossier__meter-fill--surplus"
                      style={{ width: SEVERITY_TO_WIDTH(s.severity) + '%' }}
                    />
                  </div>
                  <span className="td-dossier__meter-hex tabular-nums">×{s.depth}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="td-dossier__friendliness">
        <div className="td-dossier__friendliness-label">
          <span>TRADE OPENNESS</span>
          <span className="td-dossier__friendliness-sample tabular-nums">
            {friendliness.sample} {friendliness.sample === 1 ? 'trade' : 'trades'}
          </span>
        </div>
        <div className="td-dossier__friendliness-track">
          <div
            className={`td-dossier__friendliness-fill td-dossier__friendliness-fill--${friendliness.verdict}`}
            style={{ width: friendliness.score + '%' }}
          />
          <span className="td-dossier__friendliness-score tabular-nums">{Math.round(friendliness.score)}</span>
        </div>
        <div className="td-dossier__friendliness-copy">
          {FRIENDLINESS_COPY[friendliness.verdict]}
        </div>
      </div>
    </div>
  );
}
