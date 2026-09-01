import { useState } from 'react';
import { AdminProvider, useAdminContext } from '@/pages/Admin/context/AdminContext';

import CaseForm from './forms/CaseForm';
import PhaseForm from './forms/PhaseForm';
import LevelForm from './forms/LevelForm';
import EvidenceForm from './forms/EvidenceForm';
import SuspectForm from './forms/SuspectForm'; 
import VictimForm from './forms/VictimForm'; 
import AdminInterrogationBuilder from './forms/QuestionForm/AdminInterrogationBuilder';
import AdminLocationBuilder from './forms/QuestionForm/AdminLocationBuilder';
import AdminWiretapBuilder from './forms/QuestionForm/AdminWiretapBuilder'; 
import InvestigationRequestForm from './forms/InvestigationRequestForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import './AdminDashboard.css';

type AdminTab = 'cases' | 'phases' | 'levels' | 'interrogation' | 'location' | 'wiretap' | 'evidences' | 'suspects' | 'victims' | 'requests';

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>('cases');
  const { adminT } = useAdminTranslation();
  const t = adminT.adminDashboard;
  
  const {
    isLoading, error, cases, availablePhases, availableLevels,
    caseId, setCaseId, phaseId, setPhaseId, levelId, setLevelId,
    isDirty, setIsDirty
  } = useAdminContext();

  const handleTabChange = (tab: AdminTab) => {
    if (isDirty) {
      if (!window.confirm(t.unsavedChangesConfirm)) return;
      setIsDirty(false);
    }
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="terminal-text">{t.loadingConnection}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="terminal-text error">{t.systemError(error.message)}</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-layout">
      {/* THE TACTICAL SIDEBAR */}
      <aside className="admin-sidebar">
        
        {/* GLOBAL CONTEXT SELECTORS */}
        <div className="admin-global-selectors">
          <div className="form-group" style={{ gap: '0.25rem' }}>
            <label style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>{t.activeCaseLabel}</label>
            <select className="admin-input" style={{ padding: '0.5rem' }} value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">{t.globalDatabaseOption}</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          
          <div className="form-group" style={{ gap: '0.25rem' }}>
            <label style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>{t.activePhaseLabel}</label>
            <select className="admin-input" style={{ padding: '0.5rem' }} value={phaseId} onChange={(e) => setPhaseId(e.target.value)} disabled={!caseId}>
              <option value="">{t.allPhasesOption}</option>
              {availablePhases.map(p => <option key={p.id} value={p.id}>{p.order_index}: {p.title}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ gap: '0.25rem' }}>
            <label style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>{t.activeLevelLabel}</label>
            <select className="admin-input" style={{ padding: '0.5rem' }} value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!phaseId}>
              <option value="">{t.allLevelsOption}</option>
              {availableLevels.map(l => <option key={l.id} value={l.id}>{l.order_index}: {l.title} ({l.presentation_type})</option>)}
            </select>
          </div>
        </div>

        {/* NAVIGATION MENUS */}
        <div className="admin-nav-group">
          <h4 className="admin-nav-group-title">{t.narrativeHierarchyGroup}</h4>
          <nav className="admin-nav-menu">
            <button className={`admin-tab-btn ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => handleTabChange('cases')}>{t.casesTab}</button>
            <button className={`admin-tab-btn ${activeTab === 'phases' ? 'active' : ''}`} onClick={() => handleTabChange('phases')}>{t.phasesTab}</button>
            <button className={`admin-tab-btn ${activeTab === 'levels' ? 'active' : ''}`} onClick={() => handleTabChange('levels')}>{t.levelsTab}</button>
          </nav>
        </div>

        <div className="admin-nav-group">
          <h4 className="admin-nav-group-title">{t.nodeBuildersGroup}</h4>
          <nav className="admin-nav-menu">
            <button className={`admin-tab-btn ${activeTab === 'interrogation' ? 'active' : ''}`} onClick={() => handleTabChange('interrogation')}>{t.interrogationTab}</button>
            <button className={`admin-tab-btn ${activeTab === 'location' ? 'active' : ''}`} onClick={() => handleTabChange('location')}>{t.locationTab}</button>
            <button className={`admin-tab-btn ${activeTab === 'wiretap' ? 'active' : ''}`} onClick={() => handleTabChange('wiretap')}>{t.wiretapTab}</button>
          </nav>
        </div>

        <div className="admin-nav-group" style={{ borderBottom: 'none' }}>
          <h4 className="admin-nav-group-title">{t.databaseAssetsGroup}</h4>
          <nav className="admin-nav-menu">
            <button className={`admin-tab-btn ${activeTab === 'evidences' ? 'active' : ''}`} onClick={() => handleTabChange('evidences')}>{t.evidencesTab}</button>
            <button className={`admin-tab-btn ${activeTab === 'suspects' ? 'active' : ''}`} onClick={() => handleTabChange('suspects')}>{t.suspectsTab}</button>
            <button className={`admin-tab-btn ${activeTab === 'victims' ? 'active' : ''}`} onClick={() => handleTabChange('victims')}>{t.victimsTab}</button>
            <button className={`admin-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => handleTabChange('requests')}>{t.requestsTab}</button>
          </nav>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="admin-workspace">
        {activeTab === 'cases' && <CaseForm />}
        {activeTab === 'phases' && <PhaseForm />}
        {activeTab === 'levels' && <LevelForm />}
        {activeTab === 'interrogation' && <AdminInterrogationBuilder />}
        {activeTab === 'location' && <AdminLocationBuilder />}
        {activeTab === 'wiretap' && <AdminWiretapBuilder />}
        {activeTab === 'evidences' && <EvidenceForm />}
        {activeTab === 'suspects' && <SuspectForm />}
        {activeTab === 'victims' && <VictimForm />}
        {activeTab === 'requests' && <InvestigationRequestForm />}
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminProvider>
      <AdminDashboardContent />
    </AdminProvider>
  );
}