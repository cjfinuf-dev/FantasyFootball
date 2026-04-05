/**
 * Player Archetypes ó Generated from 2025 NFL season stats
 */

export const ARCHETYPES = {
  'dual-threat-elite': { fantasyPremium: 1.12, floorBoost: 0.12, pprAdjust: 0, description: 'Elite rushing QB' },
  'dual-threat':       { fantasyPremium: 1.08, floorBoost: 0.08, pprAdjust: 0, description: 'Mobile QB with rushing upside' },
  'pocket-elite':      { fantasyPremium: 1.02, floorBoost: 0.04, pprAdjust: 0, description: 'Elite passer, limited rushing' },
  'pocket-passer':     { fantasyPremium: 1.00, floorBoost: 0.02, pprAdjust: 0, description: 'Standard pocket QB' },
  'game-manager':      { fantasyPremium: 0.92, floorBoost: 0.01, pprAdjust: 0, description: 'Conservative, low-ceiling QB' },
  'bell-cow':          { fantasyPremium: 1.10, floorBoost: 0.10, pprAdjust: 0.03, description: 'Workhorse 3-down back' },
  'elite-pass-catch':  { fantasyPremium: 1.06, floorBoost: 0.08, pprAdjust: 0.08, description: 'High-volume receiving back' },
  'power-back':        { fantasyPremium: 1.04, floorBoost: 0.06, pprAdjust: 0, description: 'Goal-line/early-down thumper' },
  'committee':         { fantasyPremium: 0.90, floorBoost: 0.02, pprAdjust: 0.02, description: 'Timeshare back' },
  'backup':            { fantasyPremium: 0.82, floorBoost: 0.01, pprAdjust: 0, description: 'Handcuff/depth piece' },
  'alpha-wr':          { fantasyPremium: 1.08, floorBoost: 0.08, pprAdjust: 0.06, description: 'Team WR1, 25%+ target share' },
  'target-hog':        { fantasyPremium: 1.04, floorBoost: 0.06, pprAdjust: 0.10, description: 'High-volume possession receiver' },
  'deep-threat':       { fantasyPremium: 1.02, floorBoost: 0.02, pprAdjust: 0.02, description: 'Boom/bust big-play receiver' },
  'slot-wr':           { fantasyPremium: 1.00, floorBoost: 0.04, pprAdjust: 0.06, description: 'Consistent short/intermediate target' },
  'wr2-wr3':           { fantasyPremium: 0.94, floorBoost: 0.02, pprAdjust: 0.03, description: 'Secondary option' },
  'elite-te':          { fantasyPremium: 1.08, floorBoost: 0.08, pprAdjust: 0.06, description: 'Top-5 TE, hyper-targeted' },
  'receiving-te':      { fantasyPremium: 1.00, floorBoost: 0.03, pprAdjust: 0.04, description: 'Pass-catching TE' },
  'blocking-te':       { fantasyPremium: 0.85, floorBoost: 0.01, pprAdjust: 0.01, description: 'Blocking-first TE' },
  'default':           { fantasyPremium: 1.00, floorBoost: 0.00, pprAdjust: 0, description: 'Standard' },
};

const PLAYER_ARCHETYPES = {
  p1: 'dual-threat-elite', // Josh Allen
  p2: 'dual-threat', // Drake Maye
  p3: 'pocket-elite', // Matthew Stafford
  p4: 'dual-threat', // Patrick Mahomes
  p5: 'dual-threat', // Trevor Lawrence
  p6: 'pocket-elite', // Brock Purdy
  p7: 'dual-threat', // Jalen Hurts
  p8: 'dual-threat', // Caleb Williams
  p9: 'pocket-elite', // Dak Prescott
  p10: 'dual-threat', // Justin Herbert
  p11: 'dual-threat', // Bo Nix
  p12: 'pocket-passer', // Jared Goff
  p13: 'pocket-passer', // Daniel Jones
  p14: 'dual-threat', // Jaxson Dart
  p15: 'pocket-passer', // Joe Burrow
  p16: 'dual-threat', // Lamar Jackson
  p17: 'pocket-passer', // Jayden Daniels
  p18: 'pocket-passer', // Jacoby Brissett
  p19: 'dual-threat', // Baker Mayfield
  p20: 'dual-threat', // Justin Fields
  p21: 'pocket-passer', // Jordan Love
  p22: 'pocket-passer', // Kyler Murray
  p23: 'game-manager', // C.J. Stroud
  p24: 'game-manager', // Jameis Winston
  p25: 'game-manager', // Tyler Shough
  p26: 'game-manager', // Aaron Rodgers
  p27: 'game-manager', // Carson Wentz
  p28: 'game-manager', // Sam Darnold
  p29: 'game-manager', // Bryce Young
  p30: 'game-manager', // Michael Penix Jr.
  p31: 'game-manager', // Malik Willis
  p32: 'game-manager', // Marcus Mariota
  p33: 'bell-cow', // Christian McCaffrey
  p34: 'bell-cow', // Bijan Robinson
  p35: 'elite-pass-catch', // Jahmyr Gibbs
  p36: 'bell-cow', // Jonathan Taylor
  p37: 'elite-pass-catch', // De'Von Achane
  p38: 'power-back', // James Cook
  p39: 'elite-pass-catch', // Chase Brown
  p40: 'power-back', // Derrick Henry
  p41: 'elite-pass-catch', // Cam Skattebo
  p42: 'power-back', // Josh Jacobs
  p43: 'power-back', // Kyren Williams
  p44: 'bell-cow', // Javonte Williams
  p45: 'committee', // Omarion Hampton
  p46: 'bell-cow', // Travis Etienne
  p47: 'bell-cow', // Saquon Barkley
  p48: 'bell-cow', // Ashton Jeanty
  p49: 'committee', // D'Andre Swift
  p50: 'bell-cow', // Bucky Irving
  p51: 'committee', // Jaylen Warren
  p52: 'elite-pass-catch', // Kenneth Gainwell
  p53: 'bell-cow', // Breece Hall
  p54: 'committee', // Rhamondre Stevenson
  p55: 'committee', // Rico Dowdle
  p56: 'committee', // RJ Harvey
  p57: 'committee', // TreVeyon Henderson
  p58: 'power-back', // Quinshon Judkins
  p59: 'power-back', // J.K. Dobbins
  p60: 'committee', // Kenneth Walker III
  p61: 'committee', // Zach Charbonnet
  p62: 'committee', // James Conner
  p63: 'power-back', // Tony Pollard
  p64: 'committee', // Tyrone Tracy Jr.
  p65: 'committee', // Aaron Jones
  p66: 'committee', // David Montgomery
  p67: 'committee', // Audric Estim√©
  p68: 'committee', // Alvin Kamara
  p69: 'committee', // Kimani Vidal
  p70: 'committee', // Woody Marks
  p71: 'elite-pass-catch', // Trey Benson
  p72: 'committee', // Kareem Hunt
  p73: 'backup', // Tyjae Spears
  p74: 'committee', // Kyle Monangai
  p75: 'committee', // Chuba Hubbard
  p76: 'backup', // Rachaad White
  p77: 'committee', // Jacory Croskey-Merritt
  p78: 'committee', // Jordan Mason
  p79: 'backup', // Bam Knight
  p80: 'committee', // Chris Rodriguez Jr.
  p81: 'backup', // Michael Carter
  p82: 'committee', // Jawhar Jordan
  p83: 'committee', // Tyler Allgeier
  p84: 'committee', // Blake Corum
  p85: 'backup', // Miles Sanders
  p86: 'committee', // Isiah Pacheco
  p87: 'backup', // Devin Neal
  p88: 'backup', // Justice Hill
  p89: 'backup', // Devin Singletary
  p90: 'committee', // Nick Chubb
  p91: 'backup', // Ty Johnson
  p92: 'backup', // Bhayshul Tuten
  p93: 'backup', // Dylan Sampson
  p94: 'backup', // Emanuel Wilson
  p95: 'backup', // Sean Tucker
  p96: 'backup', // Jaylen Wright
  p97: 'backup', // Samaje Perine
  p98: 'backup', // Raheim Sanders
  p99: 'backup', // Emari Demercado
  p100: 'backup', // Kendre Miller
  p101: 'backup', // Antonio Gibson
  p102: 'backup', // Jeremy McNichols
  p103: 'backup', // Isaiah Davis
  p104: 'backup', // Jaret Patterson
  p105: 'backup', // Keaton Mitchell
  p106: 'backup', // Malik Davis
  p107: 'backup', // Jaydon Blue
  p108: 'backup', // Najee Harris
  p109: 'backup', // Jaleel McLaughlin
  p110: 'backup', // Braelon Allen
  p111: 'backup', // Ray Davis
  p112: 'backup', // Brian Robinson
  p113: 'alpha-wr', // Puka Nacua
  p114: 'alpha-wr', // Jaxon Smith-Njigba
  p115: 'alpha-wr', // Ja'Marr Chase
  p116: 'alpha-wr', // Amon-Ra St. Brown
  p117: 'deep-threat', // Rashee Rice
  p118: 'target-hog', // George Pickens
  p119: 'target-hog', // Drake London
  p120: 'alpha-wr', // Chris Olave
  p121: 'slot-wr', // Davante Adams
  p122: 'slot-wr', // CeeDee Lamb
  p123: 'target-hog', // Nico Collins
  p124: 'target-hog', // A.J. Brown
  p125: 'target-hog', // Zay Flowers
  p126: 'deep-threat', // Malik Nabers
  p127: 'deep-threat', // Garrett Wilson
  p128: 'slot-wr', // Tee Higgins
  p129: 'target-hog', // Wan'Dale Robinson
  p130: 'deep-threat', // Tyreek Hill
  p131: 'deep-threat', // Christian Watson
  p132: 'slot-wr', // Quentin Johnston
  p133: 'target-hog', // Michael Wilson
  p134: 'target-hog', // Courtland Sutton
  p135: 'slot-wr', // Jameson Williams
  p136: 'target-hog', // Tetairoa McMillan
  p137: 'slot-wr', // DK Metcalf
  p138: 'target-hog', // Stefon Diggs
  p139: 'slot-wr', // Alec Pierce
  p140: 'slot-wr', // Rome Odunze
  p141: 'target-hog', // Jaylen Waddle
  p142: 'target-hog', // Michael Pittman
  p143: 'target-hog', // Justin Jefferson
  p144: 'target-hog', // DeVonta Smith
  p145: 'target-hog', // Deebo Samuel Sr.
  p146: 'slot-wr', // Jauan Jennings
  p147: 'slot-wr', // Parker Washington
  p148: 'target-hog', // Emeka Egbuka
  p149: 'wr2-wr3', // Terry McLaurin
  p150: 'slot-wr', // Ladd McConkey
  p151: 'target-hog', // Jakobi Meyers
  p152: 'target-hog', // Keenan Allen
  p153: 'wr2-wr3', // Marvin Harrison Jr.
  p154: 'wr2-wr3', // Mike Evans
  p155: 'slot-wr', // Khalil Shakir
  p156: 'slot-wr', // Troy Franklin
  p157: 'slot-wr', // Romeo Doubs
  p158: 'slot-wr', // DJ Moore
  p159: 'slot-wr', // Brian Thomas Jr.
  p160: 'wr2-wr3', // Ricky Pearsall
  p161: 'slot-wr', // Jordan Addison
  p162: 'wr2-wr3', // Jayden Reed
  p163: 'slot-wr', // Tre Tucker
  p164: 'wr2-wr3', // Chris Godwin Jr.
  p165: 'wr2-wr3', // Travis Hunter
  p166: 'wr2-wr3', // Kayshon Boutte
  p167: 'slot-wr', // Rashid Shaheed
  p168: 'slot-wr', // Josh Downs
  p169: 'wr2-wr3', // Marquise Brown
  p170: 'wr2-wr3', // Theo Wease Jr.
  p171: 'wr2-wr3', // Keon Coleman
  p172: 'wr2-wr3', // Luther Burden III
  p173: 'wr2-wr3', // Jalen Coker
  p174: 'wr2-wr3', // Mack Hollins
  p175: 'wr2-wr3', // Tory Horton
  p176: 'wr2-wr3', // Xavier Worthy
  p177: 'wr2-wr3', // Ryan Flournoy
  p178: 'wr2-wr3', // Jayden Higgins
  p179: 'wr2-wr3', // Jalen McMillan
  p180: 'wr2-wr3', // Chimere Dike
  p181: 'wr2-wr3', // Devaughn Vele
  p182: 'slot-wr', // Cooper Kupp
  p183: 'slot-wr', // Elic Ayomanor
  p184: 'wr2-wr3', // Darius Slayton
  p185: 'target-hog', // Jerry Jeudy
  p186: 'wr2-wr3', // Malik Washington
  p187: 'wr2-wr3', // Calvin Ridley
  p188: 'wr2-wr3', // Tyquan Thornton
  p189: 'wr2-wr3', // Kendrick Bourne
  p190: 'wr2-wr3', // Kevin Austin Jr.
  p191: 'wr2-wr3', // Sterling Shepard
  p192: 'wr2-wr3', // Greg Dortch
  p193: 'elite-te', // Trey McBride
  p194: 'receiving-te', // George Kittle
  p195: 'receiving-te', // Tucker Kraft
  p196: 'receiving-te', // Brock Bowers
  p197: 'receiving-te', // Kyle Pitts
  p198: 'receiving-te', // Dallas Goedert
  p199: 'receiving-te', // Sam LaPorta
  p200: 'receiving-te', // Harold Fannin Jr.
  p201: 'receiving-te', // Travis Kelce
  p202: 'receiving-te', // Jake Ferguson
  p203: 'receiving-te', // Tyler Warren
  p204: 'receiving-te', // Juwan Johnson
  p205: 'receiving-te', // Hunter Henry
  p206: 'receiving-te', // Dalton Schultz
  p207: 'receiving-te', // Dalton Kincaid
  p208: 'receiving-te', // Colston Loveland
  p209: 'blocking-te', // Darren Waller
  p210: 'blocking-te', // Brenton Strange
  p211: 'receiving-te', // Zach Ertz
  p212: 'blocking-te', // Colby Parkinson
  p213: 'blocking-te', // Jake Tonges
  p214: 'receiving-te', // Oronde Gadsden II
  p215: 'receiving-te', // AJ Barner
  p216: 'receiving-te', // Theo Johnson
  p217: 'receiving-te', // Cade Otton
  p218: 'blocking-te', // David Njoku
  p219: 'receiving-te', // Mark Andrews
  p220: 'blocking-te', // Pat Freiermuth
  p221: 'receiving-te', // T.J. Hockenson
  p222: 'receiving-te', // Chig Okonkwo
  p223: 'blocking-te', // Tyler Higbee
  p224: 'blocking-te', // Greg Dulcich
  p225: 'receiving-te', // Mason Taylor
  p226: 'blocking-te', // Dawson Knox
  p227: 'receiving-te', // Evan Engram
  p228: 'blocking-te', // Mike Gesicki
  p229: 'default', // Ka'imi Fairbairn
  p230: 'default', // Jason Myers
  p231: 'default', // Spencer Shrader
  p232: 'default', // Brandon Aubrey
  p233: 'default', // Zane Gonzalez
  p234: 'default', // Ben Sauls
  p235: 'default', // Eddy Pineiro
  p236: 'default', // Cameron Dicker
  p237: 'default', // Charlie Smyth
  p238: 'default', // Cam Little
  p239: 'default', // Will Reichard
  p240: 'default', // Chase McLaughlin
  p241: 'default', // Harrison Mevis
  p242: 'default', // Jake Moody
  p243: 'default', // Chris Boswell
  p244: 'default', // Jake Bates
  p245: 'default', // Cairo Santos
  p246: 'default', // Harrison Butker
  p247: 'default', // Andy Borregales
  p248: 'default', // Tyler Loop
  p249: 'default', // Joey Slye
  p250: 'default', // Brandon McManus
  p251: 'default', // Blake Grupe
  p252: 'default', // Evan McPherson
  p253: 'default', // Nick Folk
  p254: 'default', // Wil Lutz
  p255: 'default', // Graham Gano
  p256: 'default', // Riley Patterson
  p257: 'default', // Matt Gay
  p258: 'default', // Chad Ryland
  p259: 'default', // Lucas Havrisik
  p260: 'default', // Matt Prater
};

export function getPlayerArchetype(playerId, pos) {
  const key = PLAYER_ARCHETYPES[playerId];
  if (key && ARCHETYPES[key]) return { ...ARCHETYPES[key], key };
  return { ...ARCHETYPES.default, key: "default" };
}