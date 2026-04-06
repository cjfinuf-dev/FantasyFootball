const RSSParser = require('rss-parser');
const stringSimilarity = require('string-similarity');
const { getDb, saveDb } = require('../db/connection');
const { RSS_FEEDS, CATEGORY_KEYWORDS, NFL_TEAMS, STOP_WORDS } = require('../utils/rssFeeds');

const parser = new RSSParser({
  timeout: 10000,
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: false }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
    ],
  },
});
const FETCH_WINDOW = 72 * 60 * 60 * 1000; // 72 hours — overlap ensures no gaps between sweeps

// Fix mojibake and smart quote encoding issues from RSS feeds
function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\u009d/g, '"')
    .replace(/â€"/g, '—')
    .replace(/â€"/g, '–')
    .replace(/â€¦/g, '…')
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2013/g, '–')
    .replace(/\u2014/g, '—')
    .replace(/\u2026/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}
const MAX_ARTICLES_PER_SWEEP = 20;

// --- Helpers ---

function extractFirstSentence(text) {
  if (!text) return '';
  const clean = text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  const match = clean.match(/^(.+?[.!?])\s/);
  return match ? match[1] : clean.slice(0, 200);
}

function extractImage(item) {
  // Try enclosure (most common for RSS media)
  if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image')) {
    return item.enclosure.url;
  }
  // Try media:content or media:thumbnail (rss-parser puts these in various places)
  if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
    return item['media:content'].$.url;
  }
  if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
    return item['media:thumbnail'].$.url;
  }
  // Try itunes image
  if (item.itunes && item.itunes.image) {
    return item.itunes.image;
  }
  // Try to find an img tag in the content/description
  const content = item.content || item['content:encoded'] || item.description || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

function tokenize(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s'-]/g, '').split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function extractEntities(title) {
  const lower = title.toLowerCase();
  const entities = new Set();

  for (const team of NFL_TEAMS) {
    if (lower.includes(team)) entities.add(team);
  }

  const namePattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g;
  let match;
  while ((match = namePattern.exec(title)) !== null) {
    const name = match[1].toLowerCase();
    if (!STOP_WORDS.has(name) && name.length > 4) entities.add(name);
  }

  return entities;
}

function classifyCategory(title) {
  const lower = title.toLowerCase();
  let bestCat = 'news';
  let bestCount = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const count = keywords.filter(kw => lower.includes(kw)).length;
    if (count > bestCount) { bestCount = count; bestCat = cat; }
  }

  return bestCat;
}

function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function entityOverlap(entA, entB) {
  for (const e of entA) {
    if (entB.has(e)) return true;
  }
  return false;
}

// --- Core Logic ---

async function fetchAllFeeds() {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).map(item => ({
          title: item.title || '',
          link: item.link || '',
          description: item.contentSnippet || item.content || item.summary || '',
          imageUrl: extractImage(item),
          pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          sourceName: feed.name,
          priority: feed.priority,
        }));
      } catch (err) {
        console.warn(`[News] Feed failed: ${feed.name} (${err.message})`);
        return [];
      }
    })
  );

  const cutoff = Date.now() - FETCH_WINDOW;
  return results
    .map(r => r.status === 'fulfilled' ? r.value : [])
    .flat()
    .filter(a => a.title && a.link && a.pubDate.getTime() > cutoff);
}

function crossReference(articles) {
  const enriched = articles.map(a => ({
    ...a,
    tokens: tokenize(a.title),
    entities: extractEntities(a.title),
    normalizedTitle: a.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(),
  }));

  const clusters = [];

  for (const article of enriched) {
    let matched = false;

    for (const cluster of clusters) {
      const rep = cluster.representative;

      const hasEntityOverlap = entityOverlap(article.entities, rep.entities);
      if (!hasEntityOverlap && article.entities.size > 0 && rep.entities.size > 0) continue;

      const strSim = stringSimilarity.compareTwoStrings(article.normalizedTitle, rep.normalizedTitle);
      const jaccard = jaccardSimilarity(article.tokens, rep.tokens);

      if (strSim >= 0.35 || jaccard >= 0.4 || (hasEntityOverlap && (strSim >= 0.2 || jaccard >= 0.25))) {
        cluster.articles.push(article);
        cluster.sources.add(article.sourceName);
        if (article.priority < rep.priority || (article.priority === rep.priority && article.description.length > rep.description.length)) {
          cluster.representative = article;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      clusters.push({
        articles: [article],
        sources: new Set([article.sourceName]),
        representative: article,
      });
    }
  }

  return clusters
    .filter(c => c.sources.size >= 2)
    .sort((a, b) => {
      if (b.sources.size !== a.sources.size) return b.sources.size - a.sources.size;
      return b.representative.pubDate - a.representative.pubDate;
    })
    .slice(0, MAX_ARTICLES_PER_SWEEP);
}

async function storeArticles(clusters, sweepId) {
  const db = await getDb();
  let stored = 0;

  for (const cluster of clusters) {
    const rep = cluster.representative;

    const existing = db.exec('SELECT id FROM news_articles WHERE source_url = ?', [rep.link]);
    if (existing.length > 0 && existing[0].values.length > 0) continue;

    const summary = extractFirstSentence(rep.description) || rep.title;
    const category = classifyCategory(rep.title);
    const entities = rep.entities;
    const playerName = [...entities].find(e => e.includes(' ') && !NFL_TEAMS.includes(e)) || null;
    const teamName = [...entities].find(e => NFL_TEAMS.includes(e)) || null;

    // Pick best image from cluster — prefer the representative, fall back to any article with an image
    const imageUrl = rep.imageUrl || cluster.articles.find(a => a.imageUrl)?.imageUrl || null;

    db.run(
      `INSERT INTO news_articles (title, summary, image_url, source_url, source_name, category, player_name, team_name, source_count, published_at, sweep_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cleanText(rep.title), cleanText(summary), imageUrl, rep.link, rep.sourceName, category, playerName, teamName, cluster.sources.size, rep.pubDate.toISOString(), sweepId]
    );
    stored++;
  }

  db.run("DELETE FROM news_articles WHERE scraped_at < datetime('now', '-180 days')");
  saveDb();

  return stored;
}

async function fetchAndStoreNews() {
  const sweepId = new Date().toISOString();
  console.log(`[News] Sweep ${sweepId} starting...`);

  const articles = await fetchAllFeeds();
  console.log(`[News] Fetched ${articles.length} articles from ${RSS_FEEDS.length} feeds`);

  if (articles.length === 0) {
    console.log('[News] No articles fetched from any feed.');
    return { count: 0, sweepId };
  }

  const clusters = crossReference(articles);
  console.log(`[News] ${clusters.length} cross-referenced stories found`);

  const count = await storeArticles(clusters, sweepId);
  console.log(`[News] Stored ${count} new articles`);

  return { count, sweepId };
}

async function getNews({ limit = 15, before = null, category = null } = {}) {
  const db = await getDb();
  const conditions = [];
  const params = [];

  if (before) { conditions.push('scraped_at < ?'); params.push(before); }
  if (category) { conditions.push('category = ?'); params.push(category); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit + 1);

  const result = db.exec(
    `SELECT * FROM news_articles ${where} ORDER BY scraped_at DESC, source_count DESC LIMIT ?`,
    params
  );

  if (result.length === 0) return { articles: [], nextCursor: null };

  const cols = result[0].columns;
  const rows = result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });

  const hasMore = rows.length > limit;
  const articles = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? articles[articles.length - 1].scraped_at : null;

  return { articles, nextCursor };
}

module.exports = { fetchAndStoreNews, getNews };
