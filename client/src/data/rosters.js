import { PLAYERS } from './players';

export const TEAM_ROSTERS_SEED = {
  t1: [], t2: [], t3: [], t4: [], t5: [], t6: [],
  t7: [], t8: [], t9: [], t10: [], t11: [], t12: [],
};

export const PLAYER_VALUES = {};
PLAYERS.forEach(p => { PLAYER_VALUES[p.id] = (p.proj * 3 + p.avg * 2 + p.pts) / 6; });
const _maxVal = Math.max(...Object.values(PLAYER_VALUES));
Object.keys(PLAYER_VALUES).forEach(id => { PLAYER_VALUES[id] = Math.round((PLAYER_VALUES[id] / _maxVal) * 100); });

export const TRADES_SEED = [
  { id:'tr1', status:'pending', fromTeamId:'t3', toTeamId:'t1', offeringPlayerIds:['p8'], requestingPlayerIds:['p15'], message:'Breece is a stud, you need RB depth', proposedAt:Date.now()-3600000, expiresAt:Date.now()+82800000 },
  { id:'tr2', status:'pending', fromTeamId:'t1', toTeamId:'t6', offeringPlayerIds:['p12','p23'], requestingPlayerIds:['p9'], message:'Package deal for Bijan', proposedAt:Date.now()-7200000, expiresAt:Date.now()+169200000 },
  { id:'tr3', status:'pending', fromTeamId:'t5', toTeamId:'t1', offeringPlayerIds:['p26','p24'], requestingPlayerIds:['p25'], message:'LaPorta + Wilson for Kelce, fair value', proposedAt:Date.now()-1800000, expiresAt:Date.now()+43200000 },
];

export const TRADE_HISTORY_SEED = [
  { id:'th1', status:'completed', fromTeamId:'t4', toTeamId:'t3', offeringPlayerIds:['p12'], requestingPlayerIds:['p17'], message:'Need a WR1', proposedAt:Date.now()-604800000, resolvedAt:Date.now()-518400000 },
  { id:'th2', status:'rejected', fromTeamId:'t1', toTeamId:'t5', offeringPlayerIds:['p25'], requestingPlayerIds:['p39'], message:'', proposedAt:Date.now()-432000000, resolvedAt:Date.now()-345600000 },
  { id:'th3', status:'completed', fromTeamId:'t7', toTeamId:'t2', offeringPlayerIds:['p20'], requestingPlayerIds:['p16'], message:'AJ for CeeDee straight up', proposedAt:Date.now()-864000000, resolvedAt:Date.now()-777600000 },
];
