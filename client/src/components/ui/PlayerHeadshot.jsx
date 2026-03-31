import { useState } from 'react';

const SIZE_MAP = {
  xs: { w: 52, h: 38 },
  sm: { w: 64, h: 46 },
  md: { w: 80, h: 58 },
  lg: { w: 110, h: 80 },
};

// ESPN uses slightly different abbreviations for some teams
const ESPN_TEAM_MAP = { WAS: 'wsh', LAR: 'lar', LAC: 'lac', LV: 'lv' };
function getTeamLogoUrl(team) {
  const abbr = (team || '').toLowerCase();
  const mapped = ESPN_TEAM_MAP[team] || abbr;
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${mapped}.png`;
}

export default function PlayerHeadshot({ espnId, name, size = 'sm', pos, team }) {
  const [failed, setFailed] = useState(false);
  const dim = SIZE_MAP[size] || SIZE_MAP.sm;

  // DEF/ST: show team logo instead of player headshot
  if (pos === 'DEF' && team) {
    return (
      <img
        src={getTeamLogoUrl(team)}
        alt={name || team}
        loading="lazy"
        style={{
          width: dim.w, height: dim.h,
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
    );
  }

  // ESPN headshots have transparent backgrounds natively
  const src = espnId && !failed
    ? `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${espnId}.png&w=${dim.w * 3}&h=${dim.h * 3}`
    : null;

  const posColors = {
    QB: '#3b82f6', RB: '#22c55e', WR: '#f59e0b', TE: '#ef4444', K: '#a855f7', DEF: '#64748b',
  };

  // Fallback: position initial on subtle tinted background
  if (!src) {
    return (
      <div style={{
        width: dim.w, height: dim.h, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${posColors[pos] || '#64748b'}12, ${posColors[pos] || '#64748b'}25)`,
        color: posColors[pos] || '#64748b',
        fontSize: dim.w * 0.3, fontWeight: 700, letterSpacing: '0.02em',
      }}>
        {pos || (name ? name.charAt(0) : '?')}
      </div>
    );
  }

  // Transparent headshot — no box, no border, no background
  return (
    <img
      src={src}
      alt={name || 'Player'}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{
        width: dim.w, height: dim.h,
        objectFit: 'contain',
        flexShrink: 0,
      }}
    />
  );
}
