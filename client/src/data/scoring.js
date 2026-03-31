export const SCORING_PRESETS = {
  standard: { id:'standard', name:'Standard', desc:'Traditional scoring with no reception points. Favors RBs and high-volume passers.', badge:'Most Popular', badgeColor:'var(--success-green)', passing:{yards:0.04,td:4,int:-2,twoPt:2,sacked:0}, rushing:{yards:0.1,td:6,twoPt:2,fumbleLost:-2}, receiving:{yards:0.1,td:6,receptions:0,twoPt:2}, kicking:{fg0_29:3,fg30_39:3,fg40_49:4,fg50plus:5,pat:1,missedFg0_29:-3,missedFg30_39:-2,missedFg40_49:-1,missedFg50plus:0,missedPat:-1}, dst:{sack:1,int:2,fumbleRec:2,defTd:6,stTd:6,safety:2,blockedKick:2,ptsAllow0:10,ptsAllow1_6:7,ptsAllow7_13:4,ptsAllow14_20:1,ptsAllow21_27:0,ptsAllow28_34:-4,ptsAllow35plus:-10}, bonuses:{rush100:0,rec100:0,pass300:0,rush200:0,rec200:0,pass400:0,td40plus:0,td50plus:0} },
  ppr: { id:'ppr', name:'PPR', desc:'Points Per Reception. Each catch is worth 1 point. Boosts WRs and pass-catching RBs.', badge:'Popular', badgeColor:'var(--info-blue)', passing:{yards:0.04,td:4,int:-2,twoPt:2,sacked:0}, rushing:{yards:0.1,td:6,twoPt:2,fumbleLost:-2}, receiving:{yards:0.1,td:6,receptions:1,twoPt:2}, kicking:{fg0_29:3,fg30_39:3,fg40_49:4,fg50plus:5,pat:1,missedFg0_29:-3,missedFg30_39:-2,missedFg40_49:-1,missedFg50plus:0,missedPat:-1}, dst:{sack:1,int:2,fumbleRec:2,defTd:6,stTd:6,safety:2,blockedKick:2,ptsAllow0:10,ptsAllow1_6:7,ptsAllow7_13:4,ptsAllow14_20:1,ptsAllow21_27:0,ptsAllow28_34:-4,ptsAllow35plus:-10}, bonuses:{rush100:0,rec100:0,pass300:0,rush200:0,rec200:0,pass400:0,td40plus:0,td50plus:0} },
  halfPpr: { id:'halfPpr', name:'Half PPR', desc:'Half-point per reception. A balanced middle ground between Standard and full PPR.', badge:'Balanced', badgeColor:'var(--copper)', passing:{yards:0.04,td:4,int:-2,twoPt:2,sacked:0}, rushing:{yards:0.1,td:6,twoPt:2,fumbleLost:-2}, receiving:{yards:0.1,td:6,receptions:0.5,twoPt:2}, kicking:{fg0_29:3,fg30_39:3,fg40_49:4,fg50plus:5,pat:1,missedFg0_29:-3,missedFg30_39:-2,missedFg40_49:-1,missedFg50plus:0,missedPat:-1}, dst:{sack:1,int:2,fumbleRec:2,defTd:6,stTd:6,safety:2,blockedKick:2,ptsAllow0:10,ptsAllow1_6:7,ptsAllow7_13:4,ptsAllow14_20:1,ptsAllow21_27:0,ptsAllow28_34:-4,ptsAllow35plus:-10}, bonuses:{rush100:0,rec100:0,pass300:0,rush200:0,rec200:0,pass400:0,td40plus:0,td50plus:0} },
  sixPtPassTd: { id:'sixPtPassTd', name:'6-Pt Pass TD', desc:'Passing TDs worth 6 pts instead of 4. Elevates QB value significantly.', badge:'QB Premium', badgeColor:'var(--pos-qb)', passing:{yards:0.04,td:6,int:-2,twoPt:2,sacked:0}, rushing:{yards:0.1,td:6,twoPt:2,fumbleLost:-2}, receiving:{yards:0.1,td:6,receptions:0,twoPt:2}, kicking:{fg0_29:3,fg30_39:3,fg40_49:4,fg50plus:5,pat:1,missedFg0_29:-3,missedFg30_39:-2,missedFg40_49:-1,missedFg50plus:0,missedPat:-1}, dst:{sack:1,int:2,fumbleRec:2,defTd:6,stTd:6,safety:2,blockedKick:2,ptsAllow0:10,ptsAllow1_6:7,ptsAllow7_13:4,ptsAllow14_20:1,ptsAllow21_27:0,ptsAllow28_34:-4,ptsAllow35plus:-10}, bonuses:{rush100:0,rec100:0,pass300:0,rush200:0,rec200:0,pass400:0,td40plus:0,td50plus:0} },
  tePremium: { id:'tePremium', name:'TE Premium', desc:'Full PPR with an extra 0.5 pts per TE reception. Makes TEs a premium draft target.', badge:'TE Boost', badgeColor:'var(--pos-te)', passing:{yards:0.04,td:4,int:-2,twoPt:2,sacked:0}, rushing:{yards:0.1,td:6,twoPt:2,fumbleLost:-2}, receiving:{yards:0.1,td:6,receptions:1,twoPt:2,teBonus:0.5}, kicking:{fg0_29:3,fg30_39:3,fg40_49:4,fg50plus:5,pat:1,missedFg0_29:-3,missedFg30_39:-2,missedFg40_49:-1,missedFg50plus:0,missedPat:-1}, dst:{sack:1,int:2,fumbleRec:2,defTd:6,stTd:6,safety:2,blockedKick:2,ptsAllow0:10,ptsAllow1_6:7,ptsAllow7_13:4,ptsAllow14_20:1,ptsAllow21_27:0,ptsAllow28_34:-4,ptsAllow35plus:-10}, bonuses:{rush100:0,rec100:0,pass300:0,rush200:0,rec200:0,pass400:0,td40plus:0,td50plus:0} },
  idp: { id:'idp', name:'IDP', desc:'Individual Defensive Players replace team D/ST. Adds DL, LB, and DB roster slots.', badge:'Advanced', badgeColor:'var(--purple)', passing:{yards:0.04,td:4,int:-2,twoPt:2,sacked:0}, rushing:{yards:0.1,td:6,twoPt:2,fumbleLost:-2}, receiving:{yards:0.1,td:6,receptions:1,twoPt:2}, kicking:{fg0_29:3,fg30_39:3,fg40_49:4,fg50plus:5,pat:1,missedFg0_29:-3,missedFg30_39:-2,missedFg40_49:-1,missedFg50plus:0,missedPat:-1}, dst:{sack:1,int:2,fumbleRec:2,defTd:6,stTd:6,safety:2,blockedKick:2,ptsAllow0:10,ptsAllow1_6:7,ptsAllow7_13:4,ptsAllow14_20:1,ptsAllow21_27:0,ptsAllow28_34:-4,ptsAllow35plus:-10}, idp:{soloTackle:1.5,assistTackle:1,tackleForLoss:1,qbHit:1,sack:5,int:6,forcedFumble:4,fumbleRec:4,defTd:6,safety:2,passDeflected:1.5}, bonuses:{rush100:0,rec100:0,pass300:0,rush200:0,rec200:0,pass400:0,td40plus:0,td50plus:0} },
};

export const LEAGUE_TYPES = [
  { id:'redraft', name:'Redraft', icon:null, desc:'All players return to the pool each season. Fresh draft every year.', tags:['Classic','Annual'] },
  { id:'keeper', name:'Keeper', icon:null, desc:'Keep 1-3 players from your roster each year. Balance between redraft and dynasty.', tags:['Hybrid'] },
  { id:'dynasty', name:'Dynasty', icon:null, desc:'Keep your entire roster indefinitely. Build a franchise over multiple seasons.', tags:['Long-term'] },
  { id:'bestBall', name:'Best Ball', icon:null, desc:'Draft only \u2014 no lineup management. Your best players auto-start each week.', tags:['Low Maintenance'] },
  { id:'guillotine', name:'Guillotine', icon:null, desc:'Lowest-scoring team eliminated each week. Last team standing wins.', tags:['Elimination'] },
  { id:'auction', name:'Auction / Salary Cap', icon:null, desc:'Bid on players with a salary budget instead of snake drafting. Strategic spending.', tags:['Auction'] },
  { id:'superflex', name:'SuperFlex', icon:null, desc:'An extra FLEX slot that allows QBs. Increases QB draft value substantially.', tags:['QB Premium'] },
  { id:'twoQb', name:'2QB', icon:null, desc:'Two required QB slots. Only viable in 8-10 team leagues due to 32 NFL starters.', tags:['QB Heavy'] },
  { id:'pointsOnly', name:'Points Only', icon:null, desc:'No head-to-head matchups. Winner determined by total cumulative points.', tags:['Total Points'] },
  { id:'idpLeague', name:'IDP League', icon:null, desc:'Individual defensive players replace team D/ST. Adds DL, LB, and DB starters.', tags:['Full Roster'] },
];

export const ROSTER_PRESETS = {
  standard: { QB:1, RB:2, WR:2, TE:1, FLEX:1, DST:1, K:1, BN:6, IR:1 },
  superflex: { QB:1, RB:2, WR:2, TE:1, FLEX:1, SFLEX:1, DST:1, K:1, BN:6, IR:1 },
  twoQb: { QB:2, RB:2, WR:2, TE:1, FLEX:1, DST:1, K:1, BN:6, IR:1 },
  bestBall: { QB:1, RB:2, WR:2, TE:1, FLEX:2, DST:1, K:1, BN:9, IR:0 },
  dynasty: { QB:1, RB:2, WR:2, TE:1, FLEX:1, DST:1, K:1, BN:15, IR:3, TAXI:3 },
  keeper: { QB:1, RB:2, WR:2, TE:1, FLEX:1, DST:1, K:1, BN:7, IR:2 },
  idp: { QB:1, RB:2, WR:2, TE:1, FLEX:1, K:1, DL:2, LB:2, DB:2, DP:1, BN:8, IR:2 },
};

export const ROSTER_SLOT_LABELS = {
  QB:'Quarterback', RB:'Running Back', WR:'Wide Receiver', TE:'Tight End',
  FLEX:'Flex (RB/WR/TE)', SFLEX:'SuperFlex (QB/RB/WR/TE)', DST:'Defense/ST', K:'Kicker',
  BN:'Bench', IR:'Injured Reserve', TAXI:'Taxi Squad',
  DL:'Defensive Line', LB:'Linebacker', DB:'Defensive Back', DP:'Def. Flex (DL/LB/DB)',
};

export const SCORING_FIELD_LABELS = {
  passing: { yards:{label:'Passing Yards',unit:'pt/yd'}, td:{label:'Passing TD',unit:'pts'}, int:{label:'Interception Thrown',unit:'pts'}, twoPt:{label:'2-Pt Conversion (Pass)',unit:'pts'}, sacked:{label:'Sacked',unit:'pts'} },
  rushing: { yards:{label:'Rushing Yards',unit:'pt/yd'}, td:{label:'Rushing TD',unit:'pts'}, twoPt:{label:'2-Pt Conversion (Rush)',unit:'pts'}, fumbleLost:{label:'Fumble Lost',unit:'pts'} },
  receiving: { yards:{label:'Receiving Yards',unit:'pt/yd'}, td:{label:'Receiving TD',unit:'pts'}, receptions:{label:'Reception',unit:'pts'}, twoPt:{label:'2-Pt Conversion (Rec)',unit:'pts'}, teBonus:{label:'TE Reception Bonus',unit:'pts'} },
  kicking: { fg0_29:{label:'FG Made 0-29 yds',unit:'pts'}, fg30_39:{label:'FG Made 30-39 yds',unit:'pts'}, fg40_49:{label:'FG Made 40-49 yds',unit:'pts'}, fg50plus:{label:'FG Made 50+ yds',unit:'pts'}, pat:{label:'PAT Made',unit:'pts'}, missedFg0_29:{label:'Missed FG 0-29 yds',unit:'pts'}, missedFg30_39:{label:'Missed FG 30-39 yds',unit:'pts'}, missedFg40_49:{label:'Missed FG 40-49 yds',unit:'pts'}, missedFg50plus:{label:'Missed FG 50+ yds',unit:'pts'}, missedPat:{label:'Missed PAT',unit:'pts'} },
  dst: { sack:{label:'Sack',unit:'pts'}, int:{label:'Interception',unit:'pts'}, fumbleRec:{label:'Fumble Recovery',unit:'pts'}, defTd:{label:'Defensive TD',unit:'pts'}, stTd:{label:'Special Teams TD',unit:'pts'}, safety:{label:'Safety',unit:'pts'}, blockedKick:{label:'Blocked Kick',unit:'pts'}, ptsAllow0:{label:'0 Points Allowed',unit:'pts'}, ptsAllow1_6:{label:'1-6 Points Allowed',unit:'pts'}, ptsAllow7_13:{label:'7-13 Points Allowed',unit:'pts'}, ptsAllow14_20:{label:'14-20 Points Allowed',unit:'pts'}, ptsAllow21_27:{label:'21-27 Points Allowed',unit:'pts'}, ptsAllow28_34:{label:'28-34 Points Allowed',unit:'pts'}, ptsAllow35plus:{label:'35+ Points Allowed',unit:'pts'} },
  idp: { soloTackle:{label:'Solo Tackle',unit:'pts'}, assistTackle:{label:'Assisted Tackle',unit:'pts'}, tackleForLoss:{label:'Tackle for Loss',unit:'pts'}, qbHit:{label:'QB Hit',unit:'pts'}, sack:{label:'Sack',unit:'pts'}, int:{label:'Interception',unit:'pts'}, forcedFumble:{label:'Forced Fumble',unit:'pts'}, fumbleRec:{label:'Fumble Recovery',unit:'pts'}, defTd:{label:'Defensive TD',unit:'pts'}, safety:{label:'Safety',unit:'pts'}, passDeflected:{label:'Pass Deflected',unit:'pts'} },
};

export const BONUS_LABELS = { rush100:'100+ Rushing Yards', rec100:'100+ Receiving Yards', pass300:'300+ Passing Yards', rush200:'200+ Rushing Yards', rec200:'200+ Receiving Yards', pass400:'400+ Passing Yards', td40plus:'40+ Yard TD', td50plus:'50+ Yard TD' };

export const CATEGORY_ICONS = { passing:null, rushing:null, receiving:null, kicking:null, dst:null, idp:null };
export const CATEGORY_COLORS = { passing:'var(--pos-qb)', rushing:'var(--pos-rb)', receiving:'var(--pos-wr)', kicking:'var(--pos-k)', dst:'var(--pos-def)', idp:'var(--purple)' };
