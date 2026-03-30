import { useState } from 'react';
import MatchupWidget from '../dashboard/MatchupWidget';
import PlayerRankings from '../dashboard/PlayerRankings';
import NewsFeed from '../dashboard/NewsFeed';
import StandingsCard from '../sidebar/StandingsCard';
import WaiverWireCard from '../sidebar/WaiverWireCard';
import PowerRankingsCard from '../sidebar/PowerRankingsCard';

export default function LeagueDashboard({ league, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'lineup', label: 'My Lineup' },
    { id: 'matchups', label: 'Matchups' },
    { id: 'standings', label: 'Standings' },
    { id: 'waivers', label: 'Waivers' },
    { id: 'trades', label: 'Trades' },
    { id: 'players', label: 'Players' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div>
      {/* League Header */}
      <div className="ff-hero" style={{ marginTop: 48, paddingBottom: 0 }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button onClick={onBack} className="ff-back-btn">{'\u2190'} My Leagues</button>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{league.type} &middot; {league.scoring_preset?.toUpperCase() || 'PPR'} &middot; {league.league_size} teams</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {league.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            Your team: <strong style={{ color: 'var(--accent-secondary-text)' }}>{league.team_name}</strong> &middot; {league.role === 'commissioner' ? 'Commissioner' : 'Member'}
          </p>

          {/* League Nav Tabs */}
          <div className="ff-league-tabs-wrap">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`ff-league-tab${activeTab === t.id ? ' active' : ''}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="ff-tab-content">
          <div className="ff-main-grid">
            <div className="ff-left">
              <MatchupWidget />
              <NewsFeed />
            </div>
            <div className="ff-right">
              <StandingsCard />
              <WaiverWireCard />
              <PowerRankingsCard />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lineup' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <div className="ff-card">
            <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
            <div className="ff-card-header"><h2>{'\u{1F3C8}'} My Lineup</h2></div>
            <div className="ff-card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
              Lineup management coming soon. Set your starters, manage your bench, and optimize your roster.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'matchups' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <MatchupWidget mode="all" />
        </div>
      )}

      {activeTab === 'standings' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1000, margin: '0 auto' }}>
          <StandingsCard expanded />
        </div>
      )}

      {activeTab === 'waivers' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1000, margin: '0 auto' }}>
          <WaiverWireCard expanded />
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <div className="ff-card">
            <div className="ff-card-top-accent" style={{ background: 'var(--accent-secondary)' }} />
            <div className="ff-card-header"><h2>{'\u{1F91D}'} Trade Center</h2></div>
            <div className="ff-card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
              League-specific trade center coming soon. Propose trades, analyze values based on your league's scoring, and manage offers.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <PlayerRankings />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="ff-tab-content" style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <div className="ff-card">
            <div className="ff-card-top-accent" style={{ background: 'var(--charcoal-slate)' }} />
            <div className="ff-card-header"><h2>{'\u{2699}\u{FE0F}'} League Settings</h2></div>
            <div className="ff-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>League Type</span><br/>{league.type}</div>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Scoring</span><br/>{league.scoring_preset}</div>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Teams</span><br/>{league.league_size}</div>
                <div><span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Season</span><br/>{league.season}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
