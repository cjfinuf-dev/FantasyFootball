/**
 * Calculate fantasy points from raw ESPN box score stats using a scoring preset.
 *
 * @param {object} rawStats — { passing, rushing, receiving, kicking, dst }
 * @param {object} preset  — A SCORING_PRESETS entry (e.g. SCORING_PRESETS.ppr)
 * @param {string} playerPos — 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF'
 * @returns {number} Fantasy points rounded to 1 decimal
 */
export function calcFantasyPoints(rawStats, preset, playerPos) {
  if (!rawStats || !preset) return 0;
  let pts = 0;

  // ─── Passing ───
  const pass = rawStats.passing;
  if (pass && preset.passing) {
    const p = preset.passing;
    pts += (pass.yards || 0) * (p.yards || 0);
    pts += (pass.td || 0) * (p.td || 0);
    pts += (pass.int || 0) * (p.int || 0);
    pts += (pass.twoPt || 0) * (p.twoPt || 0);
    pts += (pass.sacked || 0) * (p.sacked || 0);
  }

  // ─── Rushing ───
  const rush = rawStats.rushing;
  if (rush && preset.rushing) {
    const r = preset.rushing;
    pts += (rush.yards || 0) * (r.yards || 0);
    pts += (rush.td || 0) * (r.td || 0);
    pts += (rush.twoPt || 0) * (r.twoPt || 0);
    pts += (rush.fumbleLost || 0) * (r.fumbleLost || 0);
  }

  // ─── Receiving ───
  const rec = rawStats.receiving;
  if (rec && preset.receiving) {
    const rv = preset.receiving;
    pts += (rec.yards || 0) * (rv.yards || 0);
    pts += (rec.td || 0) * (rv.td || 0);
    pts += (rec.receptions || 0) * (rv.receptions || 0);
    pts += (rec.twoPt || 0) * (rv.twoPt || 0);
    // TE bonus
    if (playerPos === 'TE' && rv.teBonus) {
      pts += (rec.receptions || 0) * rv.teBonus;
    }
  }

  // ─── Kicking ───
  const kick = rawStats.kicking;
  if (kick && preset.kicking) {
    const k = preset.kicking;
    // Bucket fgMade distances
    for (const dist of (kick.fgMade || [])) {
      if (dist < 30) pts += k.fg0_29 || 0;
      else if (dist < 40) pts += k.fg30_39 || 0;
      else if (dist < 50) pts += k.fg40_49 || 0;
      else pts += k.fg50plus || 0;
    }
    // Bucket fgMissed distances
    for (const dist of (kick.fgMissed || [])) {
      if (dist < 30) pts += k.missedFg0_29 || 0;
      else if (dist < 40) pts += k.missedFg30_39 || 0;
      else if (dist < 50) pts += k.missedFg40_49 || 0;
      else pts += k.missedFg50plus || 0;
    }
    pts += (kick.pat || 0) * (k.pat || 0);
    pts += (kick.missedPat || 0) * (k.missedPat || 0);
  }

  // ─── DST ───
  const dst = rawStats.dst;
  if (dst && preset.dst) {
    const d = preset.dst;
    pts += (dst.sack || 0) * (d.sack || 0);
    pts += (dst.int || 0) * (d.int || 0);
    pts += (dst.fumbleRec || 0) * (d.fumbleRec || 0);
    pts += (dst.defTd || 0) * (d.defTd || 0);
    pts += (dst.stTd || 0) * (d.stTd || 0);
    pts += (dst.safety || 0) * (d.safety || 0);
    pts += (dst.blockedKick || 0) * (d.blockedKick || 0);
    // Points allowed bracket
    const pa = dst.ptsAllowed ?? 0;
    if (pa === 0) pts += d.ptsAllow0 || 0;
    else if (pa <= 6) pts += d.ptsAllow1_6 || 0;
    else if (pa <= 13) pts += d.ptsAllow7_13 || 0;
    else if (pa <= 20) pts += d.ptsAllow14_20 || 0;
    else if (pa <= 27) pts += d.ptsAllow21_27 || 0;
    else if (pa <= 34) pts += d.ptsAllow28_34 || 0;
    else pts += d.ptsAllow35plus || 0;
  }

  // ─── Bonuses ───
  if (preset.bonuses) {
    const b = preset.bonuses;
    const rushYds = rawStats.rushing?.yards || 0;
    const recYds = rawStats.receiving?.yards || 0;
    const passYds = rawStats.passing?.yards || 0;

    if (b.rush100 && rushYds >= 100) pts += b.rush100;
    if (b.rush200 && rushYds >= 200) pts += b.rush200;
    if (b.rec100 && recYds >= 100) pts += b.rec100;
    if (b.rec200 && recYds >= 200) pts += b.rec200;
    if (b.pass300 && passYds >= 300) pts += b.pass300;
    if (b.pass400 && passYds >= 400) pts += b.pass400;
  }

  return Math.round(pts * 10) / 10;
}
