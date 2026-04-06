import { useState } from 'react';
import { getHeadshotUrl } from '../../data/espnIds';

const SIZE_MAP = {
  tiny: { w: 56, h: 42 },
  xs: { w: 96, h: 70 },
  sm: { w: 120, h: 88 },
  md: { w: 150, h: 110 },
  lg: { w: 200, h: 146 },
};

// ESPN uses slightly different abbreviations for some teams
const ESPN_TEAM_MAP = { WAS: 'wsh', LAR: 'lar', LAC: 'lac', LV: 'lv' };
export function getTeamLogoUrl(team) {
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

  // Try ESPN CDN first, then nflverse headshot URL as fallback
  let src = null;
  if (!failed) {
    if (espnId) {
      src = `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${espnId}.png&w=${dim.w * 3}&h=${dim.h * 3}`;
    } else if (name) {
      src = getHeadshotUrl(name);
    }
  }

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

  // Transparent headshot with team logo badge
  const showTeamBadge = team && size !== 'tiny';
  const badgeSize = size === 'lg' ? 28 : size === 'md' ? 22 : size === 'sm' ? 18 : 14;
  return (
    <div style={{ position: 'relative', width: dim.w, height: dim.h, flexShrink: 0 }}>
      <img
        src={src}
        alt={name || 'Player'}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{
          width: dim.w, height: dim.h,
          objectFit: 'contain',
        }}
      />
      {showTeamBadge && (
        <img
          src={getTeamLogoUrl(team)}
          alt=""
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: badgeSize, height: badgeSize,
            objectFit: 'contain',
            borderRadius: '50%',
            background: 'var(--bg-white)',
            border: '1px solid var(--border)',
          }}
          loading="lazy"
        />
      )}
    </div>
  );
}
