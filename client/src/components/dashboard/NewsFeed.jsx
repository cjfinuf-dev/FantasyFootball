import { useState, useEffect } from 'react';
import { getNews } from '../../api/news';

const CATEGORY_ICONS = {
  injury: '\u{1F3E5}',
  trade: '\u{1F4E6}',
  waiver: '\u{1F4C8}',
  transaction: '\u{1F91D}',
  news: '\u{1F4F0}',
};

const TABS = ['all', 'injury', 'trade', 'waiver', 'transaction', 'news'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NewsFeed() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [categoryCounts, setCategoryCounts] = useState({});
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    setArticles([]);
    setNextCursor(null);
    getNews({ limit: 15, category: activeTab === 'all' ? null : activeTab })
      .then(data => {
        setArticles(data.articles);
        setNextCursor(data.nextCursor);
        if (activeTab === 'all' && data.articles) {
          const counts = { all: data.articles.length };
          data.articles.forEach(a => {
            counts[a.category] = (counts[a.category] || 0) + 1;
          });
          setCategoryCounts(counts);
        }
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
      <div className="ff-card-header">
        <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          {'\u{1F4F0}'} News Feed
        </h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Live from ESPN, Yahoo, CBS & more</span>
      </div>

      <div className="ff-tabs">
        {TABS.map(tab => (
          <button key={tab} className={`ff-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {categoryCounts[tab] != null && (
              <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 'var(--radius-full)', background: 'var(--tan-10)', color: 'var(--copper)' }}>
                {categoryCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div>
        {loading && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading news...
          </div>
        )}

        {error && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--red)', fontSize: 12 }}>
            {error}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No news articles yet. The feed updates at 10 AM, 2 PM, and 6 PM ET.
          </div>
        )}

        {articles.map(article => (
          <a key={article.id} href={article.source_url} target="_blank" rel="noopener noreferrer"
            className="ff-news-item" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
            {article.image_url ? (
              <div className="ff-news-thumb">
                <img src={article.image_url} alt="" loading="lazy" />
              </div>
            ) : (
              <div className="ff-news-icon">
                {CATEGORY_ICONS[article.category] || CATEGORY_ICONS.news}
              </div>
            )}
            <div className="ff-news-content">
              <div className="ff-news-title">{article.title}</div>
              <div className="ff-news-body">{article.summary}</div>
              <div className="ff-news-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)',
                  background: 'var(--tan-10)', color: 'var(--copper)', textTransform: 'uppercase',
                }}>{article.source_name}</span>
                {article.source_count > 1 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Reported by {article.source_count} sources
                  </span>
                )}
                <span className="ff-news-time">{timeAgo(article.published_at)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {nextCursor && (
        <div style={{ padding: '12px 20px', textAlign: 'center' }}>
          <button className="ff-btn ff-btn-secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
