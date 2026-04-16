import { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLeagues } from '../../hooks/useLeagues';
import TopNav from './TopNav';
import AuthModal from '../auth/AuthModal';
import CreateLeagueModal from '../league/CreateLeagueModal';
import DeleteLeagueModal from '../league/DeleteLeagueModal';
import { getSituationEvents } from '../../api/stats';
import { setSituationEvents } from '../../utils/hexScore';
import { getHexIconOverlay } from '../../utils/hexMeshIcons';
import { checkSeasonGuard } from '../../data/seasonConfig';

export default function AppLayout() {
  const { user } = useAuth();
  const { addLeague, removeLeague } = useLeagues();
  const navigate = useNavigate();
  const location = useLocation();

  const [showAuthModal, setShowAuthModal] = useState(null);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Load situation events from server (historical stats loaded at module level in hexScore.js)
  useEffect(() => {
    getSituationEvents()
      .then(data => { if (data?.events) setSituationEvents(data.events); })
      .catch(() => {});
  }, []);

  const handleLeagueCreated = (league) => {
    addLeague(league);
    setShowCreateLeague(false);
    navigate(`/league/${league.id}`);
  };

  const handleLeagueDeleted = (leagueId) => {
    removeLeague(leagueId);
    setDeleteConfirmId(null);
    // If viewing the deleted league, go back to hub
    if (location.pathname.startsWith(`/league/${leagueId}`)) {
      navigate('/hub');
    }
  };

  const isLeagueView = location.pathname.startsWith('/league/');
  const seasonGuard = checkSeasonGuard();

  const activeIconTab = useMemo(() => {
    const p = location.pathname;
    if (p === '/') return null;
    const lm = p.match(/^\/league\/[^/]+\/([^/]+)/);
    if (lm) return lm[1];
    if (/^\/league\/[^/]+\/?$/.test(p)) return 'overview';
    const hm = p.match(/^\/hub\/([^/]+)/);
    if (hm) return hm[1];
    return null;
  }, [location.pathname]);

  const hexIconStyle = useMemo(() => {
    const overlay = getHexIconOverlay(activeIconTab);
    if (!overlay) return undefined;
    return {
      backgroundImage: overlay,
      backgroundSize: '56px 96px',
      backgroundRepeat: 'repeat',
      backgroundAttachment: 'fixed',
    };
  }, [activeIconTab]);

  return (
    <>
      <a href="#main-content" className="ff-skip-link">Skip to content</a>

      <TopNav
        onSignIn={() => setShowAuthModal('signin')}
        onSignUp={() => setShowAuthModal('signup')}
        onCreateLeague={() => setShowCreateLeague(true)}
      />

      {seasonGuard.stale && (
        <div className="ff-season-stale-banner" role="alert">
          Data is from the {seasonGuard.dataSeason} season. Projections and standings may be outdated.
        </div>
      )}

      <main id="main-content" style={hexIconStyle}>
        <Outlet context={{
          onCreateLeague: () => setShowCreateLeague(true),
          onDeleteLeague: setDeleteConfirmId,
          onSignIn: () => setShowAuthModal('signin'),
          onSignUp: () => setShowAuthModal('signup'),
        }} />
      </main>

      <footer className="ff-footer">
        <div className="ff-footer-brand"><img src="/logo-full.png" alt="HexMetrics" width="96" height="24" style={{ height: 'var(--logo-height-footer)', width: 'var(--logo-width-footer)', opacity: 0.7 }} /> <span className="ff-footer-season">{`${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`}</span></div>
        <div className="ff-footer-links">
          {isLeagueView && <button className="ff-footer-link" onClick={() => navigate('/hub')}>Home</button>}
          <span className="ff-footer-link">&copy; {new Date().getFullYear()} HexMetrics</span>
        </div>
      </footer>

      {showAuthModal && (
        <AuthModal mode={showAuthModal} onClose={() => setShowAuthModal(null)}
          onSwitch={() => setShowAuthModal(prev => prev === 'signin' ? 'signup' : 'signin')} />
      )}

      {showCreateLeague && (
        <CreateLeagueModal onCreated={handleLeagueCreated} onClose={() => setShowCreateLeague(false)} />
      )}

      {deleteConfirmId && (
        <DeleteLeagueModal leagueId={deleteConfirmId} onDeleted={handleLeagueDeleted} onClose={() => setDeleteConfirmId(null)} />
      )}
    </>
  );
}
