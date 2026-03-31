/**
 * Injury Profile Dataset — Synthetic but realistic injury histories
 *
 * Each profile contains:
 *   gamesPlayed3yr: games played over last 3 seasons (max 51)
 *   injuries3yr: number of separate injury events over 3 seasons
 *   avgSeverity: average severity per injury (1=minor/0-1 games, 2=moderate/2-4 games, 3=severe/5+ games)
 *   missedGames3yr: total games missed over 3 seasons
 *
 * Position baselines (NFL averages):
 *   QB: ~46/51 games, low injury rate
 *   RB: ~38/51 games, highest injury rate
 *   WR: ~42/51 games, moderate
 *   TE: ~40/51 games, moderate-high
 *   K:  ~50/51 games, very low
 *   DEF: N/A (team unit)
 *
 * Players with known injury histories are manually adjusted.
 */

export const INJURY_PROFILES = {
  // ===== QUARTERBACKS =====
  p1:  { gamesPlayed3yr: 49, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Mahomes — iron man
  p2:  { gamesPlayed3yr: 50, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 1 },  // Josh Allen — durable
  p3:  { gamesPlayed3yr: 47, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 4 },  // Lamar — running QB risk
  p4:  { gamesPlayed3yr: 44, injuries3yr: 3, avgSeverity: 1.7, missedGames3yr: 7 },  // Hurts — rushing injuries
  p5:  { gamesPlayed3yr: 38, injuries3yr: 3, avgSeverity: 2.7, missedGames3yr: 13 }, // Burrow — wrist, calf, knee
  p6:  { gamesPlayed3yr: 30, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 1 },  // Stroud — rookie sample
  p46: { gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 11 }, // Dak — hamstring, fracture
  p49: { gamesPlayed3yr: 17, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 0 },  // Jayden Daniels — rookie
  p50: { gamesPlayed3yr: 48, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Baker
  p51: { gamesPlayed3yr: 49, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Goff — durable
  p52: { gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Bo Nix — rookie
  p53: { gamesPlayed3yr: 45, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Darnold
  p54: { gamesPlayed3yr: 35, injuries3yr: 3, avgSeverity: 2.7, missedGames3yr: 16 }, // Kyler — ACL, hamstring
  p55: { gamesPlayed3yr: 43, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 8 },  // Herbert — ribs, finger
  p56: { gamesPlayed3yr: 46, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 5 },  // Purdy — oblique, elbow
  p57: { gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 13 }, // Jordan Love — MCL, shoulder
  p58: { gamesPlayed3yr: 34, injuries3yr: 4, avgSeverity: 2.5, missedGames3yr: 17 }, // Tua — concussions
  p59: { gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Caleb Williams — rookie
  p60: { gamesPlayed3yr: 47, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Geno
  p61: { gamesPlayed3yr: 21, injuries3yr: 2, avgSeverity: 3.0, missedGames3yr: 30 }, // Rodgers — Achilles
  p62: { gamesPlayed3yr: 42, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 9 },  // Stafford — thumb, neck
  p63: { gamesPlayed3yr: 39, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 12 }, // Trevor Lawrence — concussions, shoulder
  p64: { gamesPlayed3yr: 36, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 10 }, // Russ Wilson — various
  p65: { gamesPlayed3yr: 41, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 10 }, // Carr — shoulder
  p221: { gamesPlayed3yr: 14, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 }, // Drake Maye — rookie
  p222: { gamesPlayed3yr: 22, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 12 }, // Anthony Richardson — shoulder, concussion
  p223: { gamesPlayed3yr: 28, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 }, // Bryce Young — benched more than hurt
  p225: { gamesPlayed3yr: 28, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 10 }, // Will Levis — various
  p226: { gamesPlayed3yr: 12, injuries3yr: 2, avgSeverity: 3.0, missedGames3yr: 22 }, // Watson — Achilles + suspension
  p227: { gamesPlayed3yr: 30, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 14 }, // Daniel Jones — ACL, neck
  p228: { gamesPlayed3yr: 8,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Penix — rookie
  p229: { gamesPlayed3yr: 20, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 }, // Brissett
  p230: { gamesPlayed3yr: 18, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 }, // Minshew
  p231: { gamesPlayed3yr: 15, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Mason Rudolph
  p232: { gamesPlayed3yr: 20, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 }, // Jameis
  p233: { gamesPlayed3yr: 34, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 }, // Justin Fields — running risk
  p234: { gamesPlayed3yr: 12, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 }, // Tyler Huntley
  p235: { gamesPlayed3yr: 4,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Tanner McKee
  p236: { gamesPlayed3yr: 6,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Kyle Allen
  p237: { gamesPlayed3yr: 8,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Teddy Bridgewater
  p238: { gamesPlayed3yr: 12, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 }, // Jake Browning
  p239: { gamesPlayed3yr: 18, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Sam Howell
  p240: { gamesPlayed3yr: 10, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Desmond Ridder
  p241: { gamesPlayed3yr: 20, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 }, // Mac Jones
  p242: { gamesPlayed3yr: 10, injuries3yr: 1, avgSeverity: 1.5, missedGames3yr: 4 }, // Mariota
  p243: { gamesPlayed3yr: 10, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Davis Mills
  p244: { gamesPlayed3yr: 8,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Spencer Rattler
  p245: { gamesPlayed3yr: 6,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Malik Willis
  p246: { gamesPlayed3yr: 15, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 }, // Drew Lock
  p247: { gamesPlayed3yr: 4,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Stidham
  p248: { gamesPlayed3yr: 24, injuries3yr: 1, avgSeverity: 1.5, missedGames3yr: 4 }, // Kenny Pickett
  p249: { gamesPlayed3yr: 10, injuries3yr: 1, avgSeverity: 1.5, missedGames3yr: 4 }, // Trey Lance
  p250: { gamesPlayed3yr: 8,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Tommy DeVito
  p251: { gamesPlayed3yr: 6,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Nick Mullens
  p252: { gamesPlayed3yr: 10, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Trubisky
  p253: { gamesPlayed3yr: 0,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Shedeur Sanders — draft class
  p254: { gamesPlayed3yr: 0,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Cam Ward — draft class
  p255: { gamesPlayed3yr: 0,  injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 }, // Jaxson Dart — draft class

  // ===== RUNNING BACKS =====
  p9:  { gamesPlayed3yr: 49, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Bijan Robinson — iron man
  p10: { gamesPlayed3yr: 40, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 11 }, // Saquon — ankle, ACL history
  p13: { gamesPlayed3yr: 49, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Derrick Henry — iron man for RB
  p11: { gamesPlayed3yr: 33, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 1 },  // Gibbs — limited sample, healthy
  p39: { gamesPlayed3yr: 44, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // (unused placeholder)
  p8:  { gamesPlayed3yr: 38, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 13 }, // Breece Hall — ACL, knee
  p7:  { gamesPlayed3yr: 30, injuries3yr: 5, avgSeverity: 2.4, missedGames3yr: 21 }, // CMC — hamstring, calf, ankle chronic
  p12: { gamesPlayed3yr: 36, injuries3yr: 3, avgSeverity: 2.3, missedGames3yr: 15 }, // Jonathan Taylor — ankle, knee
  p45: { gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Kyren Williams — ankle
  p42: { gamesPlayed3yr: 36, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 15 }, // Isiah Pacheco — fractured fibula
  p66: { gamesPlayed3yr: 44, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // Josh Jacobs
  p67: { gamesPlayed3yr: 47, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // James Cook — durable
  p68: { gamesPlayed3yr: 40, injuries3yr: 3, avgSeverity: 1.7, missedGames3yr: 11 }, // Joe Mixon — ankle, concussion
  p14: { gamesPlayed3yr: 37, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 14 }, // Travis Etienne — foot, hamstring
  p69: { gamesPlayed3yr: 38, injuries3yr: 3, avgSeverity: 1.7, missedGames3yr: 13 }, // James Conner — knee, ribs
  p70: { gamesPlayed3yr: 28, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Chase Brown — limited sample
  p71: { gamesPlayed3yr: 17, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 0 },  // Bucky Irving — rookie
  p72: { gamesPlayed3yr: 42, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 9 },  // Alvin Kamara
  p73: { gamesPlayed3yr: 43, injuries3yr: 2, avgSeverity: 1.0, missedGames3yr: 5 },  // Chuba Hubbard
  p74: { gamesPlayed3yr: 38, injuries3yr: 3, avgSeverity: 1.7, missedGames3yr: 13 }, // Aaron Jones — hamstring, knee
  p75: { gamesPlayed3yr: 38, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 13 }, // David Montgomery — knee
  p76: { gamesPlayed3yr: 48, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Najee Harris — durable
  p77: { gamesPlayed3yr: 45, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // (placeholder)
  p78: { gamesPlayed3yr: 34, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 17 }, // Mostert — knee, various
  p79: { gamesPlayed3yr: 36, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 15 }, // Kenneth Walker — oblique, ankle
  p80: { gamesPlayed3yr: 44, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // Tony Pollard
  p81: { gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Rhamondre Stevenson
  p82: { gamesPlayed3yr: 27, injuries3yr: 2, avgSeverity: 3.0, missedGames3yr: 24 }, // Nick Chubb — devastating knee
  p83: { gamesPlayed3yr: 45, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Rachaad White
  p84: { gamesPlayed3yr: 35, injuries3yr: 3, avgSeverity: 2.3, missedGames3yr: 16 }, // Javonte Williams — ACL
  p85: { gamesPlayed3yr: 30, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 6 },  // Zamir White
  p86: { gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Jerome Ford
  p87: { gamesPlayed3yr: 42, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Zack Moss
  p88: { gamesPlayed3yr: 43, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Brian Robinson Jr.
  p89: { gamesPlayed3yr: 39, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 9 },  // Jaylen Warren — hamstring
  p90: { gamesPlayed3yr: 45, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Tyler Allgeier
  p91: { gamesPlayed3yr: 35, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 12 }, // AJ Dillon — neck
  p92: { gamesPlayed3yr: 46, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Devin Singletary
  p93: { gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // Gus Edwards
  p94: { gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 1.0, missedGames3yr: 5 },  // Rico Dowdle
  p95: { gamesPlayed3yr: 10, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Trey Benson — rookie
  p96: { gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Kareem Hunt
  p97: { gamesPlayed3yr: 43, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Antonio Gibson
  p98: { gamesPlayed3yr: 32, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 10 }, // Tyjae Spears — MCL
  p99: { gamesPlayed3yr: 10, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Jaylen Wright — rookie
  p100:{ gamesPlayed3yr: 36, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 9 },  // Dameon Pierce
  p101:{ gamesPlayed3yr: 30, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Roschon Johnson
  p102:{ gamesPlayed3yr: 40, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Samaje Perine
  p103:{ gamesPlayed3yr: 30, injuries3yr: 3, avgSeverity: 1.7, missedGames3yr: 12 }, // Chase Edmonds
  p104:{ gamesPlayed3yr: 25, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Emari Demercado
  p105:{ gamesPlayed3yr: 28, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Ty Chandler
  p106:{ gamesPlayed3yr: 30, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Craig Reynolds
  p107:{ gamesPlayed3yr: 35, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Khalil Herbert
  p108:{ gamesPlayed3yr: 22, injuries3yr: 3, avgSeverity: 2.3, missedGames3yr: 16 }, // Clyde Edwards-Helaire — PTSD, knee
  p109:{ gamesPlayed3yr: 45, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Justice Hill
  p110:{ gamesPlayed3yr: 28, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Jaleel McLaughlin
  p111:{ gamesPlayed3yr: 15, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Israel Abanikanda
  p112:{ gamesPlayed3yr: 12, injuries3yr: 1, avgSeverity: 3.0, missedGames3yr: 14 }, // Keaton Mitchell — ACL
  p113:{ gamesPlayed3yr: 30, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // (placeholder)
  p114:{ gamesPlayed3yr: 25, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Pierre Strong Jr.
  p272:{ gamesPlayed3yr: 30, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 15 }, // J.K. Dobbins — ACL, Achilles
  p273:{ gamesPlayed3yr: 12, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Blake Corum — rookie
  p274:{ gamesPlayed3yr: 0,  injuries3yr: 1, avgSeverity: 3.0, missedGames3yr: 17 }, // Jonathon Brooks — ACL before debut
  p281:{ gamesPlayed3yr: 12, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Isaac Guerendo
  p282:{ gamesPlayed3yr: 10, injuries3yr: 1, avgSeverity: 1.5, missedGames3yr: 4 },  // MarShawn Lloyd
  p283:{ gamesPlayed3yr: 14, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Ray Davis

  // ===== WIDE RECEIVERS =====
  p15: { gamesPlayed3yr: 46, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 5 },  // Tyreek Hill — durable
  p16: { gamesPlayed3yr: 46, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 5 },  // CeeDee Lamb
  p17: { gamesPlayed3yr: 44, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // (placeholder)
  p18: { gamesPlayed3yr: 48, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Amon-Ra St. Brown — iron man
  p115:{ gamesPlayed3yr: 37, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 14 }, // Justin Jefferson — hamstring
  p40: { gamesPlayed3yr: 30, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 14 }, // Puka Nacua — PCL, knee
  p19: { gamesPlayed3yr: 44, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // Davante Adams
  p20: { gamesPlayed3yr: 36, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 15 }, // AJ Brown — knee, hamstring
  p116:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Brian Thomas Jr. — rookie
  p117:{ gamesPlayed3yr: 47, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Terry McLaurin — durable
  p118:{ gamesPlayed3yr: 47, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Drake London
  p119:{ gamesPlayed3yr: 44, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // Mike Evans — hamstring
  p120:{ gamesPlayed3yr: 17, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 0 },  // Malik Nabers — concussion
  p43: { gamesPlayed3yr: 38, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 13 }, // Deebo Samuel — shoulder, ankle
  p21: { gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 11 }, // Stefon Diggs — ACL
  p22: { gamesPlayed3yr: 46, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 5 },  // DK Metcalf
  p23: { gamesPlayed3yr: 36, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 15 }, // Chris Olave — concussions
  p24: { gamesPlayed3yr: 47, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Garrett Wilson — durable
  p41: { gamesPlayed3yr: 30, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 6 },  // Jordan Addison — ankle
  p121:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Ladd McConkey — rookie
  p122:{ gamesPlayed3yr: 34, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Jameson Williams — suspension
  p123:{ gamesPlayed3yr: 47, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Courtland Sutton — durable
  p124:{ gamesPlayed3yr: 30, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Jaxon Smith-Njigba
  p125:{ gamesPlayed3yr: 36, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 15 }, // Tee Higgins — hamstring, ribs
  p126:{ gamesPlayed3yr: 44, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 5 },  // Jerry Jeudy
  p127:{ gamesPlayed3yr: 34, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 14 }, // Nico Collins — hamstring
  p128:{ gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // George Pickens — hamstring
  p129:{ gamesPlayed3yr: 30, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 12 }, // Rashee Rice — ACL
  p130:{ gamesPlayed3yr: 44, injuries3yr: 2, avgSeverity: 1.0, missedGames3yr: 5 },  // DeVonta Smith — concussion
  p131:{ gamesPlayed3yr: 42, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // Keenan Allen — hamstring
  p132:{ gamesPlayed3yr: 30, injuries3yr: 4, avgSeverity: 2.0, missedGames3yr: 21 }, // Cooper Kupp — hamstring, ankle chronic
  p133:{ gamesPlayed3yr: 46, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Michael Pittman Jr.
  p134:{ gamesPlayed3yr: 44, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Diontae Johnson
  p135:{ gamesPlayed3yr: 44, injuries3yr: 2, avgSeverity: 1.0, missedGames3yr: 5 },  // Tyler Lockett
  p136:{ gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 13 }, // Christian Kirk — collarbone
  p137:{ gamesPlayed3yr: 42, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // Calvin Ridley
  p138:{ gamesPlayed3yr: 45, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // DJ Moore
  p139:{ gamesPlayed3yr: 34, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 14 }, // Brandon Aiyuk — ACL
  p140:{ gamesPlayed3yr: 30, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Zay Flowers — knee
  p141:{ gamesPlayed3yr: 35, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Rashod Bateman
  p142:{ gamesPlayed3yr: 30, injuries3yr: 2, avgSeverity: 1.0, missedGames3yr: 5 },  // Romeo Doubs
  p143:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Jayden Reed
  p144:{ gamesPlayed3yr: 20, injuries3yr: 2, avgSeverity: 2.5, missedGames3yr: 12 }, // Tank Dell — ACL, collarbone
  p145:{ gamesPlayed3yr: 30, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Quentin Johnston
  p146:{ gamesPlayed3yr: 22, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Josh Downs — concussion
  p147:{ gamesPlayed3yr: 25, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Dontayvion Wicks
  p149:{ gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Curtis Samuel
  p150:{ gamesPlayed3yr: 25, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 15 }, // Kadarius Toney — hamstring, knee
  p151:{ gamesPlayed3yr: 17, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 0 },  // Marvin Harrison Jr. — rookie
  p152:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Xavier Worthy — rookie
  p153:{ gamesPlayed3yr: 17, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Rome Odunze — rookie
  p154:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Adonai Mitchell — rookie
  p155:{ gamesPlayed3yr: 42, injuries3yr: 2, avgSeverity: 1.0, missedGames3yr: 5 },  // Jakobi Meyers
  p156:{ gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Adam Thielen — hamstring
  p157:{ gamesPlayed3yr: 35, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Josh Palmer
  p158:{ gamesPlayed3yr: 44, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Demarcus Robinson
  p159:{ gamesPlayed3yr: 42, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Darnell Mooney
  p160:{ gamesPlayed3yr: 40, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Allen Lazard
  p161:{ gamesPlayed3yr: 42, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Elijah Moore
  p268:{ gamesPlayed3yr: 35, injuries3yr: 3, avgSeverity: 2.3, missedGames3yr: 16 }, // Chris Godwin — ACL, ankle
  p269:{ gamesPlayed3yr: 28, injuries3yr: 3, avgSeverity: 2.3, missedGames3yr: 16 }, // Marquise Brown — shoulder, foot
  p270:{ gamesPlayed3yr: 44, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Darius Slayton
  p271:{ gamesPlayed3yr: 10, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Troy Franklin — rookie
  p284:{ gamesPlayed3yr: 30, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Rashid Shaheed — meniscus
  p285:{ gamesPlayed3yr: 42, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Khalil Shakir

  // ===== TIGHT ENDS =====
  p25: { gamesPlayed3yr: 47, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Travis Kelce — iron man
  p26: { gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Sam LaPorta — healthy rookie
  p27: { gamesPlayed3yr: 35, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 16 }, // Mark Andrews — knee, shoulder
  p28: { gamesPlayed3yr: 28, injuries3yr: 2, avgSeverity: 3.0, missedGames3yr: 23 }, // TJ Hockenson — ACL x2
  p29: { gamesPlayed3yr: 40, injuries3yr: 3, avgSeverity: 1.7, missedGames3yr: 11 }, // George Kittle — groin, hamstring
  p30: { gamesPlayed3yr: 37, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 14 }, // Dallas Goedert — shoulder, knee
  p44: { gamesPlayed3yr: 48, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Trey McBride — durable
  p47: { gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Evan Engram — hamstring
  p162:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Brock Bowers — healthy rookie
  p163:{ gamesPlayed3yr: 42, injuries3yr: 2, avgSeverity: 1.0, missedGames3yr: 5 },  // Jonnu Smith
  p164:{ gamesPlayed3yr: 28, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Tucker Kraft
  p165:{ gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // Zach Ertz
  p166:{ gamesPlayed3yr: 42, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 7 },  // Pat Freiermuth — concussions
  p167:{ gamesPlayed3yr: 34, injuries3yr: 3, avgSeverity: 2.0, missedGames3yr: 17 }, // Kyle Pitts — knee
  p168:{ gamesPlayed3yr: 40, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Isaiah Likely
  p169:{ gamesPlayed3yr: 42, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Cade Otton
  p170:{ gamesPlayed3yr: 36, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 12 }, // David Njoku — knee, ankle
  p171:{ gamesPlayed3yr: 46, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Hunter Henry — durable
  p172:{ gamesPlayed3yr: 28, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 6 },  // Dalton Kincaid — knee
  p173:{ gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Jake Ferguson — concussion
  p174:{ gamesPlayed3yr: 46, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Cole Kmet — durable
  p175:{ gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Chigoziem Okonkwo
  p176:{ gamesPlayed3yr: 22, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 10 }, // Luke Musgrave — neck
  p177:{ gamesPlayed3yr: 22, injuries3yr: 1, avgSeverity: 1.5, missedGames3yr: 5 },  // Michael Mayer
  p275:{ gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Dalton Schultz
  p276:{ gamesPlayed3yr: 34, injuries3yr: 2, avgSeverity: 2.0, missedGames3yr: 12 }, // Noah Fant — knee
  p277:{ gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Dawson Knox
  p278:{ gamesPlayed3yr: 44, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Tyler Conklin
  p279:{ gamesPlayed3yr: 40, injuries3yr: 2, avgSeverity: 1.0, missedGames3yr: 5 },  // Mike Gesicki
  p280:{ gamesPlayed3yr: 30, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Colby Parkinson

  // ===== KICKERS (low injury risk) =====
  p48: { gamesPlayed3yr: 50, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 1 },  // Brandon Aubrey
  p31: { gamesPlayed3yr: 49, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 2 },  // Justin Tucker
  p32: { gamesPlayed3yr: 46, injuries3yr: 1, avgSeverity: 1.5, missedGames3yr: 5 },  // Harrison Butker — knee
  p33: { gamesPlayed3yr: 50, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 1 },  // Jake Elliott
  p34: { gamesPlayed3yr: 50, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 1 },  // Tyler Bass
  p178:{ gamesPlayed3yr: 48, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Younghoe Koo
  p180:{ gamesPlayed3yr: 48, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Jason Sanders
  p181:{ gamesPlayed3yr: 50, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 1 },  // Chris Boswell
  p182:{ gamesPlayed3yr: 50, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 1 },  // Cameron Dicker
  p183:{ gamesPlayed3yr: 49, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 2 },  // Matt Gay
  p184:{ gamesPlayed3yr: 49, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 2 },  // Jason Myers
  p185:{ gamesPlayed3yr: 30, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Blake Grupe
  p186:{ gamesPlayed3yr: 42, injuries3yr: 1, avgSeverity: 2.0, missedGames3yr: 9 },  // Evan McPherson — groin
  p187:{ gamesPlayed3yr: 46, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Greg Zuerlein
  p188:{ gamesPlayed3yr: 49, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 2 },  // Daniel Carlson
  p189:{ gamesPlayed3yr: 48, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Dustin Hopkins
  p190:{ gamesPlayed3yr: 38, injuries3yr: 2, avgSeverity: 1.5, missedGames3yr: 8 },  // Graham Gano — hamstring
  p191:{ gamesPlayed3yr: 48, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 3 },  // Wil Lutz
  p192:{ gamesPlayed3yr: 48, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 3 },  // Cairo Santos
  p256:{ gamesPlayed3yr: 30, injuries3yr: 1, avgSeverity: 2.0, missedGames3yr: 8 },  // Jake Moody — ankle
  p257:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Jake Bates — rookie
  p258:{ gamesPlayed3yr: 30, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Chase McLaughlin
  p259:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Will Reichard — rookie
  p260:{ gamesPlayed3yr: 12, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Brayden Narveson
  p261:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Cam Little — rookie
  p262:{ gamesPlayed3yr: 44, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Matt Prater
  p263:{ gamesPlayed3yr: 36, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Zane Gonzalez
  p264:{ gamesPlayed3yr: 48, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 3 },  // Nick Folk
  p265:{ gamesPlayed3yr: 17, injuries3yr: 0, avgSeverity: 0,   missedGames3yr: 0 },  // Joshua Karty — rookie
  p266:{ gamesPlayed3yr: 28, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 3 },  // Chad Ryland
  p267:{ gamesPlayed3yr: 44, injuries3yr: 1, avgSeverity: 1.0, missedGames3yr: 4 },  // Eddy Pineiro

  // ===== DEFENSES (team units — use average availability) =====
  p35: { gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p36: { gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p37: { gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p38: { gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p193:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p194:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p195:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p196:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p197:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p198:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p199:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p200:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p201:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p202:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p203:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p204:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p205:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p206:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p207:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p208:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p209:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p210:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p211:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p212:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p213:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p214:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p215:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p216:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p217:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p218:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p219:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
  p220:{ gamesPlayed3yr: 51, injuries3yr: 0, avgSeverity: 0, missedGames3yr: 0 },
};

/**
 * Compute a durability score from an injury profile.
 * Returns 0-1 where 1 = perfect durability.
 *
 * Components:
 *   - Availability rate (gamesPlayed / maxGames) — weight 0.50
 *   - Injury frequency penalty (injuries per season) — weight 0.25
 *   - Severity penalty (avg severity of injuries) — weight 0.25
 */
export function computeDurability(playerId) {
  const profile = INJURY_PROFILES[playerId];
  if (!profile) return 0.85; // Unknown players get slightly below average

  const maxGames = 51; // 17 games x 3 seasons

  // Availability: what % of possible games did they play?
  const availRate = profile.gamesPlayed3yr / maxGames;

  // Frequency: injuries per season (0 = perfect, 3+ = very bad)
  const injPerSeason = profile.injuries3yr / 3;
  const freqScore = Math.max(0, 1 - (injPerSeason * 0.3)); // 0 inj/yr = 1.0, 3.3 inj/yr = 0.0

  // Severity: average injury severity (0 = no injuries, 3 = catastrophic)
  const sevScore = profile.injuries3yr > 0
    ? Math.max(0, 1 - (profile.avgSeverity * 0.3)) // sev 1 = 0.7, sev 2 = 0.4, sev 3 = 0.1
    : 1.0;

  return (availRate * 0.50) + (freqScore * 0.25) + (sevScore * 0.25);
}
