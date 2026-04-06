import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLeagues } from '../../hooks/useLeagues';
import TopNav from './TopNav';
import AuthModal from '../auth/AuthModal';
import CreateLeagueModal from '../league/CreateLeagueModal';
import DeleteLeagueModal from '../league/DeleteLeagueModal';
import { getSituationEvents } from '../../api/stats';
import { setSituationEvents } from '../../utils/hexScore';

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

  return (
    <>
      <TopNav
        onSignIn={() => setShowAuthModal('signin')}
        onSignUp={() => setShowAuthModal('signup')}
        onCreateLeague={() => setShowCreateLeague(true)}
      />

      <a href="#main-content" className="ff-skip-link">Skip to content</a>

      <main id="main-content">
        <Outlet context={{
          onCreateLeague: () => setShowCreateLeague(true),
          onDeleteLeague: setDeleteConfirmId,
          onSignIn: () => setShowAuthModal('signin'),
          onSignUp: () => setShowAuthModal('signup'),
        }} />
      </main>

      <footer className="ff-footer">
        <div className="ff-footer-brand"><img src="/logo-full.png" alt="HexMetrics" width="96" height="24" style={{ height: 24, width: 96, opacity: 0.7 }} /> <span className="ff-footer-season">2025-26</span></div>
        <div className="ff-footer-links">
          {isLeagueView ? (
            <button className="ff-footer-link" onClick={() => navigate('/hub')}>Home</button>
          ) : (
            <span className="ff-footer-link disabled">HexMetrics {new Date().getFullYear()}</span>
          )}
        </div>
        <div className="ff-footer-credit">&copy; 2025 HexMetrics</div>
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
