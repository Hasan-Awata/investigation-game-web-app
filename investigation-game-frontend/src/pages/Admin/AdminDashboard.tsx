import { useState } from 'react';
import { AdminProvider, useAdminContext } from '@/pages/Admin/context/AdminContext';

import CaseForm from './forms/CaseForm';
import ZoneForm from './forms/ZoneForm';
import LevelForm from './forms/LevelForm';
import EvidenceForm from './forms/EvidenceForm';
import CharacterForm from './forms/CharacterForm'; 
import AdminInterrogationBuilder from './forms/QuestionForm/AdminInterrogationBuilder';
import AdminLocationBuilder from './forms/QuestionForm/AdminLocationBuilder';
import AdminWiretapBuilder from './forms/QuestionForm/AdminWiretapBuilder'; 
import InvestigationRequestForm from './forms/InvestigationRequestForm';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import adminDashboardStyles from './AdminDashboard.module.css';

type AdminTab = 'cases' | 'zones' | 'levels' | 'interrogation' | 'location' | 'wiretap' | 'evidences' | 'characters' | 'requests';

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>('cases');
  const { adminT } = useAdminTranslation();
  const t = adminT.adminDashboard;
  
  const {
    isLoading, error, cases, availableZones, availableLevels,
    caseId, setCaseId, zoneId, setZoneId, levelId, setLevelId,
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
    <div className={adminDashboardStyles['admin-dashboard-layout']}>
      {/* THE TACTICAL SIDEBAR */}
      <aside className={adminDashboardStyles['admin-sidebar']}>
        
        {/* GLOBAL CONTEXT SELECTORS */}
        <div className={adminDashboardStyles['admin-global-selectors']}>
          <div className={adminDashboardStyles['form-group']} style={{ gap: '0.25rem' }}>
            <label style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>{t.activeCaseLabel}</label>
            <select className={adminDashboardStyles['admin-input']} style={{ padding: '0.5rem' }} value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">{t.globalDatabaseOption}</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          
          <div className={adminDashboardStyles['form-group']} style={{ gap: '0.25rem' }}>
            <label style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>{t.activeZoneLabel || 'ACTIVE ZONE'}</label>
            <select className={adminDashboardStyles['admin-input']} style={{ padding: '0.5rem' }} value={zoneId} onChange={(e) => setZoneId(e.target.value)} disabled={!caseId}>
              <option value="">{t.allZonesOption || '-- ALL ZONES --'}</option>
              {availableZones.map(z => <option key={z.id} value={z.id}>{z.order_index}: {z.title}</option>)}
            </select>
          </div>

          <div className={adminDashboardStyles['form-group']} style={{ gap: '0.25rem' }}>
            <label style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>{t.activeLevelLabel}</label>
            <select className={adminDashboardStyles['admin-input']} style={{ padding: '0.5rem' }} value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!zoneId}>
              <option value="">{t.allLevelsOption}</option>
              {availableLevels.map(l => <option key={l.id} value={l.id}>{l.order_index}: {l.title} ({l.presentation_type})</option>)}
            </select>
          </div>
        </div>

        {/* NAVIGATION MENUS */}
        <div className={adminDashboardStyles['admin-nav-group']}>
          <h4 className={adminDashboardStyles['admin-nav-group-title']}>{t.narrativeHierarchyGroup}</h4>
          <nav className={adminDashboardStyles['admin-nav-menu']}>
            <button className={`${adminDashboardStyles['admin-tab-btn']}${activeTab === 'cases' ? adminDashboardStyles['active'] : ''}`} onClick={() => handleTabChange('cases')}>{t.casesTab}</button>
            <button className={`${adminDashboardStyles['admin-tab-btn']}${activeTab === 'zones' ? adminDashboardStyles['active'] : ''}`} onClick={() => handleTabChange('zones')}>{t.zonesTab || 'ZONES'}</button>
            <button className={`${adminDashboardStyles['admin-tab-btn']}${activeTab === 'levels' ? adminDashboardStyles['active'] : ''}`} onClick={() => handleTabChange('levels')}>{t.levelsTab}</button>
          </nav>
        </div>

        <div className={adminDashboardStyles['admin-nav-group']}>
          <h4 className={adminDashboardStyles['admin-nav-group-title']}>{t.nodeBuildersGroup}</h4>
          <nav className={adminDashboardStyles['admin-nav-menu']}>
            <button className={`${adminDashboardStyles['admin-tab-btn']}${activeTab === 'interrogation' ? adminDashboardStyles['active'] : ''}`} onClick={() => handleTabChange('interrogation')}>{t.interrogationTab}</button>
            <button className={`${adminDashboardStyles['admin-tab-btn']}${activeTab === 'location' ? adminDashboardStyles['active'] : ''}`} onClick={() => handleTabChange('location')}>{t.locationTab}</button>
            <button className={`${adminDashboardStyles['admin-tab-btn']}${activeTab === 'wiretap' ? adminDashboardStyles['active'] : ''}`} onClick={() => handleTabChange('wiretap')}>{t.wiretapTab}</button>
          </nav>
        </div>

        <div className={adminDashboardStyles['admin-nav-group']} style={{ borderBottom: 'none' }}>
          <h4 className={adminDashboardStyles['admin-nav-group-title']}>{t.databaseAssetsGroup}</h4>
          <nav className={adminDashboardStyles['admin-nav-menu']}>
            <button className={`${adminDashboardStyles['admin-tab-btn']}${activeTab === 'evidences' ? adminDashboardStyles['active'] : ''}`} onClick={() => handleTabChange('evidences')}>{t.evidencesTab}</button>
            <button className={`${adminDashboardStyles['admin-tab-btn']}${activeTab === 'characters' ? adminDashboardStyles['active'] : ''}`} onClick={() => handleTabChange('characters')}>{t.charactersTab}</button>
            <button className={`${adminDashboardStyles['admin-tab-btn']}${activeTab === 'requests' ? adminDashboardStyles['active'] : ''}`} onClick={() => handleTabChange('requests')}>{t.requestsTab}</button>
          </nav>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className={adminDashboardStyles['admin-workspace']}>
        {activeTab === 'cases' && <CaseForm />}
        {activeTab === 'zones' && <ZoneForm />}
        {activeTab === 'levels' && <LevelForm />}
        {activeTab === 'interrogation' && <AdminInterrogationBuilder />}
        {activeTab === 'location' && <AdminLocationBuilder />}
        {activeTab === 'wiretap' && <AdminWiretapBuilder />}
        {activeTab === 'evidences' && <EvidenceForm />}
        {activeTab === 'characters' && <CharacterForm />}
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