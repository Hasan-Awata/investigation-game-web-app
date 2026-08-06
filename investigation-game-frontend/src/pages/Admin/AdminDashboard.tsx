import { useState } from 'react';
import CaseForm from './forms/CaseForm';
import LevelForm from './forms/LevelForm';
import EvidenceForm from './forms/EvidenceForm';
import QuestionForm from './forms/QuestionForm';
import SuspectForm from './forms/SuspectForm'; 
import InvestigationRequestForm from './forms/InvestigationRequestForm';
import './AdminDashboard.css';

type AdminTab = 'cases' | 'levels' | 'evidences' | 'requests' | 'suspects' | 'questions';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('cases');

  return (
    <div className="admin-dashboard">
      <nav className="admin-tabs">
        <button className={`admin-tab-btn ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => setActiveTab('cases')}>New Case</button>
        <button className={`admin-tab-btn ${activeTab === 'levels' ? 'active' : ''}`} onClick={() => setActiveTab('levels')}>New Level</button>
        <button className={`admin-tab-btn ${activeTab === 'evidences' ? 'active' : ''}`} onClick={() => setActiveTab('evidences')}>New Evidence</button>
        <button className={`admin-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>Combos / Requests</button>
        <button className={`admin-tab-btn ${activeTab === 'suspects' ? 'active' : ''}`} onClick={() => setActiveTab('suspects')}>New Suspect</button>
        <button className={`admin-tab-btn ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>New Question</button>
      </nav>

      <div className="admin-tab-content">
        {activeTab === 'cases' && <CaseForm />}
        {activeTab === 'levels' && <LevelForm />}
        {activeTab === 'evidences' && <EvidenceForm />}
        {activeTab === 'requests' && <InvestigationRequestForm />}
        {activeTab === 'suspects' && <SuspectForm />}
        {activeTab === 'questions' && <QuestionForm />}
      </div>
    </div>
  );
}