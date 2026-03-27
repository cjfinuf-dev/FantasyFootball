const RSS_FEEDS = [
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/nfl/news', priority: 1 },
  { name: 'Yahoo Sports', url: 'https://sports.yahoo.com/nfl/rss', priority: 1 },
  { name: 'CBS Sports', url: 'https://www.cbssports.com/rss/headlines/nfl/', priority: 2 },
  { name: 'NFL.com', url: 'https://www.nfl.com/rss/rsslanding?type=newVideoContent&count=50', priority: 2 },
  { name: 'Pro Football Talk', url: 'https://profootballtalk.nbcsports.com/feed/', priority: 3 },
  { name: 'FantasyPros', url: 'https://www.fantasypros.com/nfl/rss/news.xml', priority: 3 },
];

const CATEGORY_KEYWORDS = {
  injury: ['injury', 'injured', 'out', 'questionable', 'doubtful', 'ir', 'concussion', 'acl', 'hamstring', 'ankle', 'knee', 'surgery', 'dnp', 'limited', 'ruled out', 'day-to-day'],
  trade: ['trade', 'traded', 'deal', 'swap', 'acquire', 'acquired', 'sends', 'receives', 'blockbuster'],
  waiver: ['waiver', 'waivers', 'pickup', 'pick up', 'free agent', 'add', 'faab', 'claim', 'stash'],
  transaction: ['sign', 'signed', 'signing', 'release', 'released', 'cut', 'contract', 'extension', 'franchise tag', 'restructure', 'retire'],
};

const NFL_TEAMS = [
  'cardinals', 'falcons', 'ravens', 'bills', 'panthers', 'bears', 'bengals', 'browns',
  'cowboys', 'broncos', 'lions', 'packers', 'texans', 'colts', 'jaguars', 'chiefs',
  'raiders', 'chargers', 'rams', 'dolphins', 'vikings', 'patriots', 'saints', 'giants',
  'jets', 'eagles', 'steelers', '49ers', 'seahawks', 'buccaneers', 'titans', 'commanders',
  'arizona', 'atlanta', 'baltimore', 'buffalo', 'carolina', 'chicago', 'cincinnati', 'cleveland',
  'dallas', 'denver', 'detroit', 'green bay', 'houston', 'indianapolis', 'jacksonville', 'kansas city',
  'las vegas', 'los angeles', 'la rams', 'la chargers', 'miami', 'minnesota', 'new england',
  'new orleans', 'new york', 'ny giants', 'ny jets', 'philadelphia', 'pittsburgh', 'san francisco',
  'seattle', 'tampa bay', 'tennessee', 'washington',
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither',
  'this', 'that', 'these', 'those', 'it', 'its', 'he', 'she', 'they', 'we',
  'nfl', 'football', 'fantasy', 'report', 'reports', 'says', 'per', 'sources',
  'via', 'according', 'update', 'news', 'latest', 'breaking',
]);

module.exports = { RSS_FEEDS, CATEGORY_KEYWORDS, NFL_TEAMS, STOP_WORDS };
