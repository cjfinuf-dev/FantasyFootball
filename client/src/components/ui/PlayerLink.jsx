// Clickable player name that navigates to the HexStats page
// Requires a `onPlayerClick` function in the component tree
export default function PlayerLink({ name, playerId, onPlayerClick }) {
  if (!onPlayerClick || !playerId) {
    return <span style={{ fontWeight: 600 }}>{name}</span>;
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); onPlayerClick(playerId); }}
      style={{
        background: 'none', border: 'none', padding: 0, margin: 0,
        fontWeight: 600, fontSize: 'inherit', fontFamily: 'inherit',
        color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
        textDecoration: 'none', lineHeight: 'inherit',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.textDecoration = 'underline'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.textDecoration = 'none'; }}
    >
      {name}
    </button>
  );
}
