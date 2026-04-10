import { useState, useEffect, useMemo } from 'react';
import { getNews } from '../../api/news';
import { PLAYERS } from '../../data/players';
import HexBrand from '../ui/HexBrand';
import { useAuth } from '../../hooks/useAuth';

// Fix mojibake from RSS feeds
function cleanText(s) {
  if (!s) return s;
  return s.replace(/â€™/g, "'").replace(/â€˜/g, "'").replace(/â€œ/g, '"').replace(/â€\u009d/g, '"')
    .replace(/â€"/g, '—').replace(/â€"/g, '–').replace(/â€¦/g, '…')
    .replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}
import { getDynamicSituationEvents } from '../../utils/hexScore';

const PLAYER_NAME_MAP = {};
PLAYERS.forEach(p => { PLAYER_NAME_MAP[p.name.toLowerCase()] = p; });

// Sort by name length descending so "Patrick Mahomes" matches before "Pat"
const PLAYER_NAMES_SORTED = PLAYERS.map(p => p.name).sort((a, b) => b.length - a.length);

// ─── Suffix-aware last-name extraction ───
function getLastName(fullName) {
  const parts = fullName.split(' ');
  let last = parts[parts.length - 1].toLowerCase();
  if (['jr.', 'jr', 'sr.', 'sr', 'ii', 'iii', 'iv', 'v'].includes(last) && parts.length > 2) {
    last = parts[parts.length - 2].toLowerCase();
  }
  return last;
}

// Surnames too common in general English — require full name match always
const COMMON_SURNAMES = new Set([
  'smith', 'johnson', 'williams', 'brown', 'jones', 'miller', 'davis',
  'wilson', 'moore', 'taylor', 'thomas', 'jackson', 'white', 'harris',
  'martin', 'thompson', 'robinson', 'clark', 'lewis', 'walker', 'young',
  'king', 'wright', 'scott', 'green', 'adams', 'baker', 'nelson',
  'carter', 'mitchell', 'turner', 'campbell', 'parker', 'evans',
  'collins', 'stewart', 'morris', 'cook', 'bell', 'murphy', 'cooper',
  'ward', 'gray', 'james', 'watson', 'brooks', 'price', 'bennett',
  'wood', 'ross', 'long', 'howard', 'foster', 'reed', 'jordan',
  'cole', 'hall', 'coleman', 'washington',
]);

// last name → [player, player, ...] for every rostered player
const LAST_NAME_PLAYERS = {};
PLAYERS.forEach(p => {
  if (p.pos === 'D/ST') return;
  const last = getLastName(p.name);
  if (!LAST_NAME_PLAYERS[last]) LAST_NAME_PLAYERS[last] = [];
  LAST_NAME_PLAYERS[last].push(p);
});

// First-name set for collision detection (e.g., "Chase" is both first and last)
const _firstNames = new Set(
  PLAYERS.filter(p => p.pos !== 'D/ST').map(p => p.name.split(' ')[0].toLowerCase())
);

// Split eligible last names into two tiers
const DISTINCTIVE_NAMES = []; // unique in roster, not common, no first-name collision
const AMBIGUOUS_NAMES = [];   // shared by 2+ players OR has first-name collision — need team context

Object.entries(LAST_NAME_PLAYERS).forEach(([last, players]) => {
  if (COMMON_SURNAMES.has(last) || last.length < 4) return; // blocked
  if (players.length === 1 && !_firstNames.has(last)) {
    DISTINCTIVE_NAMES.push(last);
  } else {
    AMBIGUOUS_NAMES.push(last);
  }
});

// Sort longest-first for matching priority
DISTINCTIVE_NAMES.sort((a, b) => b.length - a.length);
AMBIGUOUS_NAMES.sort((a, b) => b.length - a.length);

// ─── Team extraction from article text ───
const NFL_TEAM_LOOKUP = {
  // Mascots (unambiguous, word-bounded matching)
  'cardinals': 'ARI', 'falcons': 'ATL', 'ravens': 'BAL', 'bills': 'BUF',
  'panthers': 'CAR', 'bears': 'CHI', 'bengals': 'CIN', 'browns': 'CLE',
  'cowboys': 'DAL', 'broncos': 'DEN', 'lions': 'DET', 'packers': 'GB',
  'texans': 'HOU', 'colts': 'IND', 'jaguars': 'JAX', 'chiefs': 'KC',
  'raiders': 'LV', 'chargers': 'LAC', 'rams': 'LA', 'dolphins': 'MIA',
  'vikings': 'MIN', 'patriots': 'NE', 'saints': 'NO', 'giants': 'NYG',
  'jets': 'NYJ', 'eagles': 'PHI', 'steelers': 'PIT', '49ers': 'SF',
  'seahawks': 'SEA', 'buccaneers': 'TB', 'bucs': 'TB', 'titans': 'TEN',
  'commanders': 'WAS',
  // Cities/regions (substring matching — multi-word safe)
  'arizona': 'ARI', 'atlanta': 'ATL', 'baltimore': 'BAL', 'buffalo': 'BUF',
  'carolina': 'CAR', 'chicago': 'CHI', 'cincinnati': 'CIN', 'cleveland': 'CLE',
  'dallas': 'DAL', 'denver': 'DEN', 'detroit': 'DET', 'green bay': 'GB',
  'houston': 'HOU', 'indianapolis': 'IND', 'jacksonville': 'JAX',
  'kansas city': 'KC', 'las vegas': 'LV', 'miami': 'MIA',
  'minnesota': 'MIN', 'new england': 'NE', 'new orleans': 'NO',
  'philadelphia': 'PHI', 'pittsburgh': 'PIT', 'san francisco': 'SF',
  'seattle': 'SEA', 'tampa bay': 'TB', 'tennessee': 'TEN',
};
// NOTE: "new york" and "los angeles" omitted — ambiguous (2 teams each).
// Mascot names (giants/jets/chargers/rams) handle those.
// NOTE: "washington" omitted as a city — it's in COMMON_SURNAMES. "commanders" handles team detection.

function extractTeamsFromText(text) {
  const teams = new Set();
  for (const [name, abbrev] of Object.entries(NFL_TEAM_LOOKUP)) {
    if (text.includes(name)) teams.add(abbrev);
  }
  return teams;
}

function findPlayersInText(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = [];
  const seen = new Set();

  // Full name matches first
  for (const name of PLAYER_NAMES_SORTED) {
    if (lower.includes(name.toLowerCase()) && !seen.has(name)) {
      const p = PLAYER_NAME_MAP[name.toLowerCase()];
      found.push(p);
      seen.add(p.id);
      if (found.length >= 3) return found;
    }
  }

  // Pass 2: Distinctive last names — unique in roster, match on name alone
  for (const last of DISTINCTIVE_NAMES) {
    const regex = new RegExp('\\b' + last.replace(/\./g, '\\.') + '\\b', 'i');
    if (regex.test(text)) {
      const p = LAST_NAME_PLAYERS[last][0];
      if (!seen.has(p.id)) {
        found.push(p);
        seen.add(p.id);
        if (found.length >= 3) return found;
      }
    }
  }

  // Pass 3: Ambiguous last names — require team context to disambiguate
  if (AMBIGUOUS_NAMES.length > 0) {
    const teamsInText = extractTeamsFromText(lower);
    if (teamsInText.size > 0) {
      for (const last of AMBIGUOUS_NAMES) {
        const regex = new RegExp('\\b' + last.replace(/\./g, '\\.') + '\\b', 'i');
        if (regex.test(text)) {
          const candidates = LAST_NAME_PLAYERS[last].filter(p => teamsInText.has(p.team));
          if (candidates.length === 1 && !seen.has(candidates[0].id)) {
            found.push(candidates[0]);
            seen.add(candidates[0].id);
            if (found.length >= 3) return found;
          }
        }
      }
    }
  }

  return found;
}

function findPlayerByName(name) {
  if (!name) return null;
  return PLAYER_NAME_MAP[name.toLowerCase()] || null;
}

const TABS = ['all', 'injury', 'trade', 'waiver'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getReadKey(userId) {
  return userId ? `ff-read-articles-${userId}` : 'ff-read-articles';
}

function getReadIds(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(getReadKey(userId)) || '[]'));
  } catch { return new Set(); }
}

function markRead(articleId, userId) {
  const read = getReadIds(userId);
  read.add(articleId);
  const arr = [...read].slice(-500);
  localStorage.setItem(getReadKey(userId), JSON.stringify(arr));
  return new Set(arr);
}

export default function NewsFeed({ onPlayerClick }) {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [readIds, setReadIds] = useState(() => getReadIds(user?.id));
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Build a map of article ID → situation event for impact badges
  const articleImpactMap = useMemo(() => {
    const map = {};
    getDynamicSituationEvents().forEach(e => {
      if (e.articleId) map[e.articleId] = e;
    });
    return map;
  }, [articles]); // recompute when articles change (events are stable per session)

  const unreadCounts = (() => {
    const counts = {};
    let total = 0;
    articles.forEach(a => {
      if (!readIds.has(a.id)) {
        counts[a.category] = (counts[a.category] || 0) + 1;
        total++;
      }
    });
    counts.all = total;
    return counts;
  })();

  const handleArticleClick = (articleId) => {
    setReadIds(markRead(articleId, user?.id));
  };

  useEffect(() => {
    setLoading(true);
    setArticles([]);
    setNextCursor(null);
    getNews({ limit: 15, category: activeTab === 'all' ? null : activeTab })
      .then(data => {
        setArticles(data.articles);
        setNextCursor(data.nextCursor);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await getNews({ limit: 15, before: nextCursor, category: activeTab === 'all' ? null : activeTab });
      setArticles(prev => [...prev, ...data.articles]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="ff-card">
      <div className="ff-card-top-accent" style={{ background: 'var(--charcoal-slate)' }} />

      <div style={{ maxHeight: 'min(680px, 75vh)', overflowY: 'auto' }}>
        {/* Two-column header: tabs left, "Players" label right */}
        <div className="ff-news-sticky-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                News Feed
                {unreadCounts.all > 0 && (
                  <span className="ff-badge-count">{unreadCounts.all > 99 ? '99+' : unreadCounts.all}</span>
                )}
              </h2>
            </div>
            <div className="ff-tabs" style={{ borderBottom: 'none' }}>
              {TABS.map(tab => {
                const count = unreadCounts[tab] || 0;
                return (
                  <button key={tab} className={`ff-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {count > 0 && (
                      <span style={{
                        marginLeft: 6, fontSize: 12, fontWeight: 700, padding: '3px 7px',
                        borderRadius: 'var(--radius-full)',
                        background: tab === 'all' ? 'var(--accent)' : 'var(--tan-10)',
                        color: tab === 'all' ? 'var(--on-accent)' : 'var(--copper)',
                      }}>
                        {count > 100 ? '100+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="ff-news-players" style={{ justifyContent: 'flex-end', padding: '0 16px 10px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Impacted Players
            </span>
          </div>
        </div>
        {loading && (
          <div style={{ padding: '8px 0' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ width: 80, height: 56, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '70%', height: 20, marginBottom: 6, borderRadius: 4 }} />
                  <div className="skeleton" style={{ width: '90%', height: 18, marginBottom: 4, borderRadius: 4 }} />
                  <div className="skeleton" style={{ width: '40%', height: 16, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 14 }}>
            <div style={{ color: 'var(--red)', marginBottom: 8 }}>{error}</div>
            <button className="ff-btn ff-btn-secondary ff-btn-sm" onClick={() => {
              setError(null);
              setLoading(true);
              getNews({ limit: 15, category: activeTab === 'all' ? null : activeTab })
                .then(data => { setArticles(data.articles); setNextCursor(data.nextCursor); })
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
            }}>Retry</button>
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 15 }}>
            No news articles yet. The feed updates at 10 AM, 2 PM, and 6 PM ET.
          </div>
        )}

        {articles.map((article) => {
          const isRead = readIds.has(article.id);
          const textPlayers = findPlayersInText((article.title || '') + ' ' + (article.summary || ''));
          const serverPlayer = findPlayerByName(article.player_name);
          // Merge: text-matched players first, add server match if not already found
          const matchedPlayers = [...textPlayers];
          if (serverPlayer && !matchedPlayers.find(p => p.id === serverPlayer.id)) {
            matchedPlayers.push(serverPlayer);
          }
          const impact = articleImpactMap[article.id];
          return (
          <div key={article.id} className={`ff-news-item${isRead ? ' ff-news-read' : ''}`}>
            <a href={article.source_url} target="_blank" rel="noopener noreferrer"
              className="ff-news-article" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flex: 1, minWidth: 0, gap: 12 }}
              onClick={() => handleArticleClick(article.id)}>
              {article.image_url ? (
                <div className="ff-news-thumb">
                  <img src={article.image_url} alt="" loading="lazy" />
                </div>
              ) : (
                <div className="ff-news-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 48 52" width="32" height="34" opacity="0.25">
                    <polygon points="24,2 46,14 46,38 24,50 2,38 2,14" fill="none" stroke="var(--hex-purple)" strokeWidth="2"/>
                    <text x="24" y="30" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--hex-purple)">H</text>
                  </svg>
                </div>
              )}
              <div className="ff-news-content">
                <div className="ff-news-title">{cleanText(article.title)}</div>
                <div className="ff-news-body">{cleanText(article.summary)}</div>
                <div className="ff-news-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                    background: 'var(--tan-10)', color: 'var(--copper)', textTransform: 'uppercase',
                  }}>{article.source_name}</span>
                  {article.source_count > 1 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Reported by {article.source_count} sources
                    </span>
                  )}
                  <span className="ff-news-time">{timeAgo(article.published_at)}</span>
                  {impact && (
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                      background: impact.impact > 0 ? 'var(--green-light)' : 'var(--red-light)',
                      color: impact.impact > 0 ? 'var(--success-green)' : 'var(--red)',
                    }}>
                      {impact.impact > 0 ? '\u2191' : '\u2193'} <HexBrand word="Score" icon={false} /> Impact
                    </span>
                  )}
                </div>
              </div>
            </a>
            <div className="ff-news-players">
              {matchedPlayers.map(mp => (
                <button key={mp.id} className="ff-news-player-link"
                  onClick={() => { if (onPlayerClick) onPlayerClick(mp.id); }}>
                  {mp.name} <span className="ff-news-player-pos">{mp.pos}</span>
                </button>
              ))}
            </div>
          </div>
          );
        })}

        {nextCursor && (
          <div style={{ padding: '12px 20px', textAlign: 'center' }}>
            <button className="ff-btn ff-btn-secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
