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
            <button onClick={onBack} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: 'var(--radius-sm)', padding: '4px 12px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{'\u2190'} My Leagues</button>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{league.type} &middot; {league.scoring_preset?.toUpperCase() || 'PPR'} &middot; {league.league_size} teams</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {league.name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            Your team: <strong style={{ color: 'var(--accent-secondary-text)' }}>{league.team_name}</strong> &middot; {league.role === 'commissioner' ? 'Commissioner' : 'Member'}
          </p>

          {/* League Nav Tabs */}
          <div style={{ display: 'flex', gap: 0, marginTop: 16, overflowX: 'auto' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                background: 'none', border: 'none', padding: '10px 16px',
                fontSize: 12, fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
                borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
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
      )}

      {activeTab === 'lineup' && (
        <div style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
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
        <div style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <MatchupWidget mode="all" />
        </div>
      )}

      {activeTab === 'standings' && (
        <div style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 600, margin: '0 auto' }}>
          <StandingsCard />
        </div>
      )}

      {activeTab === 'waivers' && (
        <div style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 600, margin: '0 auto' }}>
          <WaiverWireCard />
        </div>
      )}

      {activeTab === 'trades' && (
        <div style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
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
        <div style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
          <PlayerRankings />
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ padding: '20px clamp(16px, 4vw, 32px)', maxWidth: 1400, margin: '0 auto' }}>
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
