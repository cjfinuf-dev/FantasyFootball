import { getPlayerArchetype } from '../../data/playerArchetypes';

const BADGE_CONFIG = {
  // QB
  'dual-threat-elite': { label: 'Dual Threat', short: 'DT', colorVar: '--arch-dt-elite' },
  'dual-threat':       { label: 'Mobile',      short: 'MOB', colorVar: '--arch-dt' },
  'pocket-elite':      { label: 'Pocket Elite', short: 'PE', colorVar: '--arch-pocket-elite' },
  'pocket-passer':     { label: 'Pocket',       short: 'PP', colorVar: '--arch-pocket' },
  'game-manager':      { label: 'Manager',      short: 'GM', colorVar: '--arch-manager' },

  // RB
  'bell-cow':          { label: 'Bell Cow',     short: 'BC', colorVar: '--arch-bellcow' },
  'elite-pass-catch':  { label: 'Pass Catch',   short: 'PC', colorVar: '--arch-passcatch' },
  'power-back':        { label: 'Power',        short: 'PWR', colorVar: '--arch-power' },
  'committee':         { label: 'Committee',    short: 'COM', colorVar: '--arch-committee' },
  'backup':            { label: 'Backup',       short: 'BU', colorVar: '--arch-backup' },

  // WR
  'alpha-wr':          { label: 'Alpha',        short: 'A', colorVar: '--arch-alpha' },
  'target-hog':        { label: 'Target Hog',   short: 'TH', colorVar: '--arch-targethog' },
  'deep-threat':       { label: 'Deep Threat',  short: 'DT', colorVar: '--arch-deep' },
  'slot-wr':           { label: 'Slot',         short: 'SL', colorVar: '--arch-slot' },
  'wr2-wr3':           { label: 'Depth',        short: 'WR3', colorVar: '--arch-depth-wr' },

  // TE
  'elite-te':          { label: 'Elite TE',     short: 'ETE', colorVar: '--arch-elite-te' },
  'receiving-te':      { label: 'Receiving',    short: 'REC', colorVar: '--arch-rec-te' },
  'blocking-te':       { label: 'Blocker',      short: 'BLK', colorVar: '--arch-block-te' },

  'default':           { label: '',             short: '', colorVar: '' },
};

export default function ArchetypeBadge({ playerId, pos, size = 'sm' }) {
  const archetype = getPlayerArchetype(playerId, pos);
  const config = BADGE_CONFIG[archetype.key];
  if (!config || !config.label) return null;

  const cls = `arch-badge arch-badge-${size} arch-${archetype.key}`;

  return (
    <span className={cls} title={archetype.description}>
      {size === 'xs' ? config.short : config.label}
    </span>
  );
}
