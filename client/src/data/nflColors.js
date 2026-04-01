const LOGO_BASE = 'https://a.espncdn.com/i/teamlogos/nfl/500';

// ESPN uses slightly different abbreviations for some teams
const ESPN_ID_MAP = { was: 'wsh', lar: 'lar', lac: 'lac', lv: 'lv' };
const espnLogo = (id) => `${LOGO_BASE}/${ESPN_ID_MAP[id] || id}.png`;

export const NFL_TEAMS = [
  { id: 'none', name: 'None', primary: '#8B5CF6', secondary: '#FFFFFF', tertiary: '#A78BFA', logo: null },
  { id: 'sf', name: '49ers', primary: '#AA0000', secondary: '#B3995D', tertiary: '#000000', logo: espnLogo('sf') },
  { id: 'chi', name: 'Bears', primary: '#0B162A', secondary: '#C83803', tertiary: '#FFFFFF', logo: espnLogo('chi') },
  { id: 'cin', name: 'Bengals', primary: '#FB4F14', secondary: '#000000', tertiary: '#FFFFFF', logo: espnLogo('cin') },
  { id: 'buf', name: 'Bills', primary: '#00338D', secondary: '#C60C30', tertiary: '#FFFFFF', logo: espnLogo('buf') },
  { id: 'den', name: 'Broncos', primary: '#FB4F14', secondary: '#002244', tertiary: '#FFFFFF', logo: espnLogo('den') },
  { id: 'cle', name: 'Browns', primary: '#311D00', secondary: '#FF3C00', tertiary: '#FFFFFF', logo: espnLogo('cle') },
  { id: 'tb', name: 'Buccaneers', primary: '#D50A0A', secondary: '#FF7900', tertiary: '#34302B', logo: espnLogo('tb') },
  { id: 'ari', name: 'Cardinals', primary: '#97233F', secondary: '#FFB612', tertiary: '#000000', logo: espnLogo('ari') },
  { id: 'lac', name: 'Chargers', primary: '#0080C6', secondary: '#FFC20E', tertiary: '#FFFFFF', logo: espnLogo('lac') },
  { id: 'kc', name: 'Chiefs', primary: '#E31837', secondary: '#FFB81C', tertiary: '#FFFFFF', logo: espnLogo('kc') },
  { id: 'ind', name: 'Colts', primary: '#002C5F', secondary: '#A2AAAD', tertiary: '#FFFFFF', logo: espnLogo('ind') },
  { id: 'was', name: 'Commanders', primary: '#5A1414', secondary: '#FFB612', tertiary: '#FFFFFF', logo: espnLogo('was') },
  { id: 'dal', name: 'Cowboys', primary: '#003594', secondary: '#869397', tertiary: '#FFFFFF', logo: espnLogo('dal') },
  { id: 'mia', name: 'Dolphins', primary: '#008E97', secondary: '#FC4C02', tertiary: '#005778', logo: espnLogo('mia') },
  { id: 'phi', name: 'Eagles', primary: '#004C54', secondary: '#A5ACAF', tertiary: '#ACC0C6', logo: espnLogo('phi') },
  { id: 'atl', name: 'Falcons', primary: '#A71930', secondary: '#000000', tertiary: '#A5ACAF', logo: espnLogo('atl') },
  { id: 'nyg', name: 'Giants', primary: '#0B2265', secondary: '#A71930', tertiary: '#A5ACAF', logo: espnLogo('nyg') },
  { id: 'jax', name: 'Jaguars', primary: '#006778', secondary: '#D7A22A', tertiary: '#101820', logo: espnLogo('jax') },
  { id: 'nyj', name: 'Jets', primary: '#125740', secondary: '#000000', tertiary: '#FFFFFF', logo: espnLogo('nyj') },
  { id: 'det', name: 'Lions', primary: '#0076B6', secondary: '#B0B7BC', tertiary: '#000000', logo: espnLogo('det') },
  { id: 'gb', name: 'Packers', primary: '#203731', secondary: '#FFB612', tertiary: '#FFFFFF', logo: espnLogo('gb') },
  { id: 'car', name: 'Panthers', primary: '#0085CA', secondary: '#101820', tertiary: '#BFC0BF', logo: espnLogo('car') },
  { id: 'ne', name: 'Patriots', primary: '#002244', secondary: '#C60C30', tertiary: '#B0B7BC', logo: espnLogo('ne') },
  { id: 'lv', name: 'Raiders', primary: '#000000', secondary: '#A5ACAF', tertiary: '#FFFFFF', logo: espnLogo('lv') },
  { id: 'lar', name: 'Rams', primary: '#003594', secondary: '#FFA300', tertiary: '#FFD100', logo: espnLogo('lar') },
  { id: 'bal', name: 'Ravens', primary: '#241773', secondary: '#9E7C0C', tertiary: '#000000', logo: espnLogo('bal') },
  { id: 'no', name: 'Saints', primary: '#D3BC8D', secondary: '#101820', tertiary: '#FFFFFF', logo: espnLogo('no') },
  { id: 'sea', name: 'Seahawks', primary: '#002244', secondary: '#69BE28', tertiary: '#A5ACAF', logo: espnLogo('sea') },
  { id: 'pit', name: 'Steelers', primary: '#FFB612', secondary: '#101820', tertiary: '#C60C30', logo: espnLogo('pit') },
  { id: 'hou', name: 'Texans', primary: '#03202F', secondary: '#A71930', tertiary: '#FFFFFF', logo: espnLogo('hou') },
  { id: 'ten', name: 'Titans', primary: '#0C2340', secondary: '#4B92DB', tertiary: '#C60C30', logo: espnLogo('ten') },
  { id: 'min', name: 'Vikings', primary: '#4F2683', secondary: '#FFC62F', tertiary: '#FFFFFF', logo: espnLogo('min') },
];
