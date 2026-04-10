import Breadcrumb from '../ui/Breadcrumb';
import StandingsCard from '../sidebar/StandingsCard';
import PowerRankingsCard from '../sidebar/PowerRankingsCard';

export default function DetailViewLayout({ backLabel, currentLabel, onBack, rosters, leagueName, onTeamClick, children }) {
  return (
    <div className="ff-overview-layout">
      <div className="ff-overview-grid">
        <div className="ff-left ff-detail-view">
          <Breadcrumb onBack={onBack} backLabel={backLabel} currentLabel={currentLabel} />
          {children}
        </div>
        <div className="ff-right">
          <StandingsCard rosters={rosters} leagueName={leagueName} onTeamClick={onTeamClick} />
          <PowerRankingsCard rosters={rosters} />
        </div>
      </div>
    </div>
  );
}
