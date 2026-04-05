export default function PlayerLink({ name, playerId, onPlayerClick }) {
  if (!onPlayerClick || !playerId) {
    return <span style={{ fontWeight: 600 }}>{name}</span>;
  }

  return (
    <button
      className="ff-player-link"
      onClick={e => { e.stopPropagation(); onPlayerClick(playerId); }}
    >
      {name}
    </button>
  );
}
