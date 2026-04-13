/**
 * Injury Severity Constants — Position-Aware Injury Impact Model
 *
 * Two exported structures:
 *   INJURY_TYPES — classification with base severity, recovery timeline, recurrence risk
 *   POSITION_VULNERABILITY — per-position multiplier on each injury type
 *   POSITION_SEVERITY_CAP — max durability hit by position (physical positions absorb more)
 */

// ─── Tier 5: Catastrophic (1.0) ───
// ─── Tier 4: Severe (0.80) ───
// ─── Tier 3: Moderate (0.60) ───
// ─── Tier 2: Minor (0.40) ───
// ─── Tier 1: Minimal (0.20) ───

export const INJURY_TYPES = {
  acl:             { severity: 1.0,  recoveryWeeks: 36, recurrenceRate: 0.18, label: 'ACL Tear' },
  achilles:        { severity: 1.0,  recoveryWeeks: 40, recurrenceRate: 0.12, label: 'Achilles Rupture' },
  patellar:        { severity: 1.0,  recoveryWeeks: 44, recurrenceRate: 0.10, label: 'Patellar Tendon' },

  lisfranc:        { severity: 0.80, recoveryWeeks: 28, recurrenceRate: 0.20, label: 'Lisfranc' },
  labrum:          { severity: 0.80, recoveryWeeks: 24, recurrenceRate: 0.15, label: 'Shoulder (Labrum)' },
  neck:            { severity: 0.80, recoveryWeeks: 20, recurrenceRate: 0.08, label: 'Neck (Structural)' },

  hamstring:       { severity: 0.60, recoveryWeeks: 6,  recurrenceRate: 0.35, label: 'Hamstring' },
  high_ankle:      { severity: 0.60, recoveryWeeks: 8,  recurrenceRate: 0.22, label: 'High Ankle Sprain' },
  meniscus:        { severity: 0.60, recoveryWeeks: 10, recurrenceRate: 0.18, label: 'Meniscus' },
  mcl:             { severity: 0.60, recoveryWeeks: 8,  recurrenceRate: 0.14, label: 'MCL Sprain' },
  concussion:      { severity: 0.60, recoveryWeeks: 3,  recurrenceRate: 0.30, label: 'Concussion' },
  foot:            { severity: 0.60, recoveryWeeks: 8,  recurrenceRate: 0.25, label: 'Foot' },
  back:            { severity: 0.60, recoveryWeeks: 6,  recurrenceRate: 0.28, label: 'Back' },

  low_ankle:       { severity: 0.40, recoveryWeeks: 3,  recurrenceRate: 0.20, label: 'Low Ankle Sprain' },
  calf:            { severity: 0.40, recoveryWeeks: 4,  recurrenceRate: 0.30, label: 'Calf' },
  quad:            { severity: 0.40, recoveryWeeks: 4,  recurrenceRate: 0.22, label: 'Quad' },
  groin:           { severity: 0.40, recoveryWeeks: 4,  recurrenceRate: 0.25, label: 'Groin' },
  ribs:            { severity: 0.40, recoveryWeeks: 4,  recurrenceRate: 0.10, label: 'Ribs' },
  elbow:           { severity: 0.40, recoveryWeeks: 4,  recurrenceRate: 0.15, label: 'Elbow' },
  wrist_hand:      { severity: 0.40, recoveryWeeks: 3,  recurrenceRate: 0.12, label: 'Wrist/Hand' },

  bruise:          { severity: 0.20, recoveryWeeks: 1,  recurrenceRate: 0.05, label: 'Bruise' },
  illness:         { severity: 0.20, recoveryWeeks: 1,  recurrenceRate: 0.05, label: 'Illness' },
  rest:            { severity: 0.20, recoveryWeeks: 0,  recurrenceRate: 0.00, label: 'Rest/DNP' },

  unknown:         { severity: 0.50, recoveryWeeks: 6,  recurrenceRate: 0.15, label: 'Unknown' },
};

/**
 * Position vulnerability multipliers — how much each injury type impacts each position.
 *
 * Core principle: RBs are most vulnerable overall (highest physical toll, shortest careers).
 * QBs are least vulnerable (protected, fewer hits), but throwing-arm injuries are amplified.
 *
 * _default is the fallback for unclassified injury types at that position.
 */
export const POSITION_VULNERABILITY = {
  QB: {
    _default:    0.85,
    acl:         0.70,
    achilles:    0.65,
    patellar:    0.70,
    lisfranc:    0.70,
    hamstring:   0.60,
    high_ankle:  0.65,
    foot:        0.65,
    labrum:      1.40,  // throwing shoulder
    elbow:       1.30,  // throwing arm
    neck:        1.10,
    concussion:  1.05,
    back:        0.90,
    wrist_hand:  1.15,  // grip/accuracy
  },
  RB: {
    _default:    1.10,
    acl:         1.40,
    achilles:    1.35,
    patellar:    1.35,
    lisfranc:    1.40,
    hamstring:   1.25,
    high_ankle:  1.20,
    meniscus:    1.15,
    mcl:         1.10,
    foot:        1.20,
    calf:        1.15,
    quad:        1.10,
    groin:       1.05,
    back:        1.00,
    concussion:  0.95,
    labrum:      0.80,
    elbow:       0.75,
  },
  WR: {
    _default:    1.00,
    acl:         1.15,
    achilles:    1.20,
    patellar:    1.10,
    hamstring:   1.30,
    high_ankle:  1.10,
    lisfranc:    1.15,
    foot:        1.15,
    calf:        1.10,
    meniscus:    1.00,
    mcl:         0.95,
    concussion:  1.00,
    labrum:      0.90,
    elbow:       0.80,
    back:        0.90,
  },
  TE: {
    _default:    1.05,
    acl:         1.10,
    achilles:    1.10,
    patellar:    1.05,
    hamstring:   1.10,
    high_ankle:  1.05,
    lisfranc:    1.10,
    meniscus:    1.05,
    mcl:         1.00,
    foot:        1.05,
    labrum:      1.00,
    concussion:  1.00,
    back:        1.00,
    elbow:       0.90,
  },
};

/**
 * Position-aware severity cap — more physical positions can absorb a higher ceiling.
 * Prevents catastrophic injuries from zeroing out durability, while preserving
 * position differentiation at all severity levels.
 */
export const POSITION_SEVERITY_CAP = {
  QB:  0.45,
  RB:  0.65,
  WR:  0.55,
  TE:  0.55,
};
