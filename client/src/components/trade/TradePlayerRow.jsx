import { PLAYERS } from '../../data/players';
import { getHexScore, getHexTier } from '../../utils/hexScore';
import { getEspnId } from '../../data/espnIds';
import PosBadge from '../ui/PosBadge';
import PlayerHeadshot from '../ui/PlayerHeadshot';
import ArchetypeBadge from '../ui/ArchetypeBadge';

const PLAYER_MAP = {};
PLAYERS.forEach(p => { PLAYER_MAP[p.id] = p; });

function hexIntensityClass(score) {
  if (score >= 85) return 'hex-val-elite';
  if (score >= 75) return 'hex-val-plus';
  if (score >= 60) return 'hex-val-starter';
  if (score >= 45) return 'hex-val-flex';
  if (score >= 35) return 'hex-val-bench';
  if (score >= 20) return 'hex-val-depth';
  return 'hex-val-waiver';
}

export function hexChipClass(score) {
  if (score >= 85) return 'hex-chip hex-chip-elite';
  if (score >= 75) return 'hex-chip hex-chip-plus';
  if (score >= 60) return 'hex-chip hex-chip-starter';
  if (score >= 45) return 'hex-chip hex-chip-flex';
  if (score >= 35) return 'hex-chip hex-chip-bench';
  if (score >= 20) return 'hex-chip hex-chip-depth';
  return 'hex-chip hex-chip-waiver';
}

export default function TradePlayerRow({ playerId, onClick, selected, showRemove, onRemove, scoringPreset }) {
  const player = PLAYER_MAP[playerId];
  if (!player) return null;

  const score = getHexScore(playerId, scoringPreset);

  return (
    <div
      className={`ff-tm-player-row${selected ? ' selected' : ''}`}
      onClick={() => onClick?.(playerId)}
    >
      <PlayerHeadshot espnId={getEspnId(player.name)} name={player.name} size="xs" pos={player.pos} team={player.team} />
      <PosBadge pos={player.pos} />
      <span className="p-name">{player.name}</span>
      <ArchetypeBadge playerId={playerId} pos={player.pos} size="xs" />
      <span className="p-nfl">{player.team}</span>
      <span className={`p-val ${hexIntensityClass(score)}`}>{score}</span>
      {showRemove && (
        <button className="remove-btn" onClick={e => { e.stopPropagation(); onRemove?.(playerId); }}>
          {'\u2715'}
        </button>
      )}
    </div>
  );
}
