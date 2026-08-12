import { useState } from 'react';
import CaseForm from './forms/CaseForm';
import PhaseForm from './forms/PhaseForm';
import LevelForm from './forms/LevelForm/LevelForm';
import EvidenceForm from './forms/EvidenceForm';
import QuestionForm from './forms/QuestionForm/QuestionForm';
import SuspectForm from './forms/SuspectForm'; 
import VictimForm from './forms/VictimForm'; 
import AdminInterrogationBuilder from './forms/LevelForm/AdminInterrogationBuilder';

import InvestigationRequestForm from './forms/InvestigationRequestForm';
import './AdminDashboard.css';

type AdminTab = 'cases' | 'phases' | 'levels' | 'evidences' | 'requests' | 'suspects' | 'victims' | 'questions' | 'interrogation';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('cases');

  return (
    <div className="admin-dashboard">
      <nav className="admin-tabs" style={{ flexWrap: 'wrap' }}>
        <button className={`admin-tab-btn ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => setActiveTab('cases')}>New Case</button>
        <button className={`admin-tab-btn ${activeTab === 'phases' ? 'active' : ''}`} onClick={() => setActiveTab('phases')}>New Phase</button>
        <button className={`admin-tab-btn ${activeTab === 'levels' ? 'active' : ''}`} onClick={() => setActiveTab('levels')}>New Level</button>
        <button className={`admin-tab-btn ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>New Question</button>
        <button className={`admin-tab-btn ${activeTab === 'evidences' ? 'active' : ''}`} onClick={() => setActiveTab('evidences')}>New Evidence</button>
        <button className={`admin-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>Combos</button>
        <button className={`admin-tab-btn ${activeTab === 'suspects' ? 'active' : ''}`} onClick={() => setActiveTab('suspects')}>New Suspect</button>
        <button className={`admin-tab-btn ${activeTab === 'victims' ? 'active' : ''}`} onClick={() => setActiveTab('victims')}>New Victim</button>
        <button className={`admin-tab-btn ${activeTab === 'interrogation' ? 'active' : ''}`} onClick={() => setActiveTab('interrogation')}>Interrogation Builder</button>
      </nav>

      <div className="admin-tab-content">
        {activeTab === 'cases' && <CaseForm />}
        {activeTab === 'phases' && <PhaseForm />}
        {activeTab === 'levels' && <LevelForm />}
        {activeTab === 'questions' && <QuestionForm />}
        {activeTab === 'evidences' && <EvidenceForm />}
        {activeTab === 'requests' && <InvestigationRequestForm />}
        {activeTab === 'suspects' && <SuspectForm />}
        {activeTab === 'victims' && <VictimForm />}
        {activeTab === 'interrogation' && <AdminInterrogationBuilder />}
      </div>
    </div>
  );
}