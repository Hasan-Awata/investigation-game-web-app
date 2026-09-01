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
import './AdminDashboard.css';

type AdminTab = 'cases' | 'phases' | 'levels' | 'interrogation' | 'location' | 'wiretap' | 'evidences' | 'suspects' | 'victims' | 'requests';

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>('cases');
  
  const {
    isLoading, error, cases, availablePhases, availableLevels,
    caseId, setCaseId, phaseId, setPhaseId, levelId, setLevelId,
    isDirty, setIsDirty
  } = useAdminContext();

  const handleTabChange = (tab: AdminTab) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Discard and switch tabs?')) return;
      setIsDirty(false);
    }
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="terminal-text">Establishing Secure Connection to Database...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="terminal-text error">System Error: {error.message}</div>
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
            <label style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>[ ACTIVE CASE DIRECTORY ]</label>
            <select className="admin-input" style={{ padding: '0.5rem' }} value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">-- Global Database --</option>
              {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          
          <div className="form-group" style={{ gap: '0.25rem' }}>
            <label style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>[ ACTIVE PHASE ]</label>
            <select className="admin-input" style={{ padding: '0.5rem' }} value={phaseId} onChange={(e) => setPhaseId(e.target.value)} disabled={!caseId}>
              <option value="">-- All Phases --</option>
              {availablePhases.map(p => <option key={p.id} value={p.id}>{p.order_index}: {p.title}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ gap: '0.25rem' }}>
            <label style={{ color: 'var(--accent-amber)', fontSize: '0.75rem' }}>[ ACTIVE LEVEL ]</label>
            <select className="admin-input" style={{ padding: '0.5rem' }} value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!phaseId}>
              <option value="">-- All Levels --</option>
              {availableLevels.map(l => <option key={l.id} value={l.id}>{l.order_index}: {l.title} ({l.presentation_type})</option>)}
            </select>
          </div>
        </div>

        {/* NAVIGATION MENUS */}
        <div className="admin-nav-group">
          <h4 className="admin-nav-group-title">Narrative Hierarchy</h4>
          <nav className="admin-nav-menu">
            <button className={`admin-tab-btn ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => handleTabChange('cases')}>📁 Cases (Root)</button>
            <button className={`admin-tab-btn ${activeTab === 'phases' ? 'active' : ''}`} onClick={() => handleTabChange('phases')}>📑 Phases (Chapters)</button>
            <button className={`admin-tab-btn ${activeTab === 'levels' ? 'active' : ''}`} onClick={() => handleTabChange('levels')}>📌 Levels (Encounters)</button>
          </nav>
        </div>

        <div className="admin-nav-group">
          <h4 className="admin-nav-group-title">Node Builders</h4>
          <nav className="admin-nav-menu">
            <button className={`admin-tab-btn ${activeTab === 'interrogation' ? 'active' : ''}`} onClick={() => handleTabChange('interrogation')}>💬 Interrogation Tree</button>
            <button className={`admin-tab-btn ${activeTab === 'location' ? 'active' : ''}`} onClick={() => handleTabChange('location')}>🎯 Location Sweeps</button>
            <button className={`admin-tab-btn ${activeTab === 'wiretap' ? 'active' : ''}`} onClick={() => handleTabChange('wiretap')}>🎙️ Wiretap Intercepts</button>
          </nav>
        </div>

        <div className="admin-nav-group" style={{ borderBottom: 'none' }}>
          <h4 className="admin-nav-group-title">Database Assets</h4>
          <nav className="admin-nav-menu">
            <button className={`admin-tab-btn ${activeTab === 'evidences' ? 'active' : ''}`} onClick={() => handleTabChange('evidences')}>🔍 Evidence Locker</button>
            <button className={`admin-tab-btn ${activeTab === 'suspects' ? 'active' : ''}`} onClick={() => handleTabChange('suspects')}>👤 Suspect Profiles</button>
            <button className={`admin-tab-btn ${activeTab === 'victims' ? 'active' : ''}`} onClick={() => handleTabChange('victims')}>💀 Identified Casualties</button>
            <button className={`admin-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => handleTabChange('requests')}>⚖️ Procedural Combos</button>
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