import { useDynamicList } from '@/hooks/useDynamicList';
import { 
  AdminRow, AdminInput, AdminTextarea, AdminSelect, 
  AdminCheckbox, FormattingGuide, DynamicListHeader, RemoveButton 
} from '@/components/AdminUI';

interface EvidenceMetadataFieldsProps {
  evidenceType: string;
  subType: string;
  setSubType: (val: string) => void;
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

// --- MODULAR SUB-TYPE COMPONENTS ---

const AutopsyFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => {
  const { items, add, updatePrimitive, remove } = useDynamicList<string>(
    metadata.evidence_collected || [],
    (newList) => updateMeta('evidence_collected', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label="Victim Name" value={metadata.victim_name || ''} onChange={e => updateMeta('victim_name', e.target.value)} placeholder="e.g., John Doe" />
        <AdminInput label="Gender" value={metadata.gender || ''} onChange={e => updateMeta('gender', e.target.value)} placeholder="e.g., Male / Female" />
        <AdminInput label="Estimated Age" value={metadata.victim_age || ''} onChange={e => updateMeta('victim_age', e.target.value)} placeholder="e.g., 30-35" />
      </AdminRow>
      <AdminRow>
        <AdminInput label="Chief Medical Examiner" required value={metadata.examiner || ''} onChange={e => updateMeta('examiner', e.target.value)} />
        <AdminInput label="Est. Time of Death" required value={metadata.time_of_death || ''} onChange={e => updateMeta('time_of_death', e.target.value)} />
      </AdminRow>
      <AdminInput label="Primary Cause of Death" required value={metadata.cause_of_death || ''} onChange={e => updateMeta('cause_of_death', e.target.value)} />
      <AdminTextarea label="External Examination & Anomalies" value={metadata.anomalies || ''} onChange={e => updateMeta('anomalies', e.target.value)} />
      <AdminTextarea label="Internal Examination & Organs" value={metadata.internal_exam || ''} onChange={e => updateMeta('internal_exam', e.target.value)} placeholder="Findings from internal cavities and organs..." />
      <AdminTextarea label="Toxicology Report / Lab Analysis" minHeight="60px" value={metadata.toxicology_report || ''} onChange={e => updateMeta('toxicology_report', e.target.value)} placeholder="Blood alcohol, poisons, or chemical substances detected..." />

      <DynamicListHeader title="COLLECTED EVIDENCE / SAMPLES" onAdd={() => add('')} addLabel="+ Add Sample" />
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <AdminInput value={item} onChange={e => updatePrimitive(idx, e.target.value)} placeholder="e.g. 9mm bullet fragment extracted from chest" required />
          <RemoveButton onClick={() => remove(idx)} />
        </div>
      ))}
      {items.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>No evidence items logged. Add a row above.</div>}
    </>
  );
};

const BallisticsFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => {
  const { items, add, update, remove } = useDynamicList<{reference: string, description: string}>(
    metadata.exhibits || [],
    (newList) => updateMeta('exhibits', newList)
  );

  return (
    <>
      <FormattingGuide />
      <AdminRow>
        <AdminInput label="Lab Case Number" required value={metadata.case_number || ''} onChange={e => updateMeta('case_number', e.target.value)} placeholder="e.g., 2026-BL-8842" />
        <AdminInput label="Examiner Name" required value={metadata.examiner_name || ''} onChange={e => updateMeta('examiner_name', e.target.value)} />
      </AdminRow>

      <DynamicListHeader title="EVIDENCE INTAKE LOG (EXHIBITS)" onAdd={() => add({ reference: '', description: '' })} addLabel="+ Add Exhibit" />
      {items.map((ex, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <div style={{ width: '160px' }}><AdminInput value={ex.reference} onChange={e => update(idx, 'reference', e.target.value)} placeholder="Ref (e.g. EXHIBIT A)" required /></div>
          <div style={{ flex: 1 }}><AdminInput value={ex.description} onChange={e => update(idx, 'description', e.target.value)} placeholder="Description (e.g. Recovered 9mm Slug)" required /></div>
          <RemoveButton onClick={() => remove(idx)} />
        </div>
      ))}
      {items.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>No exhibits logged. Add a row above.</div>}

      <h5 style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>TECHNICAL FINDINGS</h5>
      <AdminTextarea label="Firearm Specification Data" minHeight="60px" value={metadata.firearm_specs || ''} onChange={e => updateMeta('firearm_specs', e.target.value)} />
      <AdminTextarea label="Microscopic & Toolmark Analysis" value={metadata.microscopic_analysis || ''} onChange={e => updateMeta('microscopic_analysis', e.target.value)} />
      <AdminTextarea label="Trajectory & Range Findings (If Applicable)" minHeight="60px" value={metadata.trajectory_range || ''} onChange={e => updateMeta('trajectory_range', e.target.value)} />
      <AdminTextarea label="Official Conclusion / Match Determination" required style={{ borderLeft: '3px solid var(--accent-crimson)' }} minHeight="60px" value={metadata.conclusion || ''} onChange={e => updateMeta('conclusion', e.target.value)} placeholder="e.g., MATCH CONFIRMED: Striation patterns on Exhibit A match..." />
      
      <div className="form-group" style={{ marginTop: '1.5rem', borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '1rem' }}>
        <label style={{ color: 'var(--accent-crimson)' }}>Investigator Handwritten Scrawls</label>
        <textarea className="admin-textarea" value={metadata.investigator_notes || ''} onChange={e => updateMeta('investigator_notes', e.target.value)} placeholder="Will render in a red cursive marker font..." style={{ minHeight: '80px' }} />
      </div>
    </>
  );
};

const DNAFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => (
  <>
    <AdminRow>
      <AdminInput label="Sample Type (e.g., Blood, Hair)" required value={metadata.sample_type || ''} onChange={e => updateMeta('sample_type', e.target.value)} />
      <AdminInput label="Match Probability" required value={metadata.match_probability || ''} onChange={e => updateMeta('match_probability', e.target.value)} />
    </AdminRow>
    <AdminRow>
      <AdminInput label="Lab Technician" value={metadata.lab_technician || ''} onChange={e => updateMeta('lab_technician', e.target.value)} placeholder="e.g., Dr. Jane Doe" />
      <AdminInput label="Extraction Method" value={metadata.extraction_method || ''} onChange={e => updateMeta('extraction_method', e.target.value)} placeholder="e.g., FTA Card / Phenol-Chloroform" />
    </AdminRow>
    <AdminInput label="Identified Subject (Leave blank if inconclusive)" value={metadata.identified_person || ''} onChange={e => updateMeta('identified_person', e.target.value)} />
    <AdminTextarea label="STR Loci Profile Summary" value={metadata.loci_profile_summary || ''} onChange={e => updateMeta('loci_profile_summary', e.target.value)} placeholder="Details on allele frequencies and genetic markers..." />
    <AdminTextarea label="Laboratory Notes & Observations" minHeight="60px" value={metadata.lab_notes || ''} onChange={e => updateMeta('lab_notes', e.target.value)} placeholder="Additional analytical insights or chain of custody notes..." />
  </>
);

const DigitalForensicsFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => (
  <>
    <AdminRow>
      <AdminInput label="Device Classification" required value={metadata.device_type || ''} onChange={e => updateMeta('device_type', e.target.value)} />
      <AdminInput label="Extraction Method" required value={metadata.extraction_method || ''} onChange={e => updateMeta('extraction_method', e.target.value)} />
    </AdminRow>
    <AdminTextarea label="Decrypted Data / Payload" required value={metadata.recovered_data || ''} onChange={e => updateMeta('recovered_data', e.target.value)} />
  </>
);

const TraceAnalysisFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => (
  <AdminRow>
    <AdminInput label="Material Composition" required value={metadata.material_type || ''} onChange={e => updateMeta('material_type', e.target.value)} />
    <AdminInput label="Identified Origin Source" required value={metadata.origin_source || ''} onChange={e => updateMeta('origin_source', e.target.value)} />
  </AdminRow>
);

const CorrespondenceFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => (
  <>
    <AdminRow>
      <AdminInput label="Sender (FROM)" required value={metadata.sender || ''} onChange={e => updateMeta('sender', e.target.value)} />
      <AdminInput label="Recipient (TO)" required value={metadata.recipient || ''} onChange={e => updateMeta('recipient', e.target.value)} />
    </AdminRow>
    <AdminInput label="Subject Line" required value={metadata.subject || ''} onChange={e => updateMeta('subject', e.target.value)} />
    <AdminTextarea label="Message Body" required value={metadata.body || ''} onChange={e => updateMeta('body', e.target.value)} />
  </>
);

const FinancialFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => {
  const { items: pages, add: addPage, update: updatePage, remove: removePage } = useDynamicList<{page_number: number, statement_period: string, transactions: any[]}>(
    metadata.pages || [],
    (newList) => updateMeta('pages', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label="Banking Institution" required value={metadata.institution_name || ''} onChange={e => updateMeta('institution_name', e.target.value)} />
        <AdminInput label="Account Holder" required value={metadata.account_holder || ''} onChange={e => updateMeta('account_holder', e.target.value)} />
        <AdminInput label="Account Number" required value={metadata.account_number || ''} onChange={e => updateMeta('account_number', e.target.value)} />
      </AdminRow>

      <DynamicListHeader title="STATEMENT PAGES" onAdd={() => addPage({ page_number: pages.length + 1, statement_period: '', transactions: [] })} addLabel="+ Add Statement Page" />
      {pages.map((page: any, pageIdx: number) => (
        <FinancialStatementPage key={pageIdx} page={page} pageIdx={pageIdx} updatePage={updatePage} removePage={removePage} />
      ))}
    </>
  );
};

const FinancialStatementPage = ({ page, pageIdx, updatePage, removePage }: { page: any, pageIdx: number, updatePage: any, removePage: any }) => {
  const { items: txs, add, update, remove } = useDynamicList<{date: string, description: string, amount: number}>(
    page.transactions || [],
    (newTxs) => updatePage(pageIdx, 'transactions', newTxs)
  );

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', borderLeft: '3px solid var(--accent-amber)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ flex: 1, marginRight: '1rem' }}>
          <AdminInput label="Statement Period" required value={page.statement_period || ''} onChange={e => updatePage(pageIdx, 'statement_period', e.target.value)} placeholder="e.g., Q3 2023" />
        </div>
        <button type="button" onClick={() => removePage(pageIdx, 'page_number')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-crimson)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>REMOVE PAGE {page.page_number}</button>
      </div>
      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#aaa', fontFamily: 'var(--font-mono)' }}>TRANSACTIONS</span>
          <button type="button" onClick={() => add({ date: '', description: '', amount: 0 })} style={{ background: 'transparent', border: '1px solid #aaa', color: '#aaa', padding: '2px 8px', borderRadius: '2px', cursor: 'pointer', fontSize: '0.7rem' }}>+ Add Row</button>
        </div>
        {txs.map((tx: any, txIdx: number) => (
          <div key={txIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '100px' }}><AdminInput value={tx.date} onChange={e => update(txIdx, 'date', e.target.value)} placeholder="Date" required /></div>
            <div style={{ flex: 1 }}><AdminInput value={tx.description} onChange={e => update(txIdx, 'description', e.target.value)} placeholder="Description (e.g. Wire Transfer)" required /></div>
            <div style={{ width: '120px' }}><AdminInput type="number" step="0.01" value={tx.amount} onChange={e => update(txIdx, 'amount', parseFloat(e.target.value))} placeholder="Amount" required /></div>
            <RemoveButton onClick={() => remove(txIdx)} />
          </div>
        ))}
        {txs.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>No transactions recorded on this page.</div>}
      </div>
    </div>
  );
};

const JournalFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => {
  const { items: pages, add: addPage, update: updatePage, remove: removePage } = useDynamicList<{page_number: number, date_entry: string, content: string, is_torn: boolean}>(
    metadata.pages || [],
    (newList) => updateMeta('pages', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label="Owner / Author" required value={metadata.owner || ''} onChange={e => updateMeta('owner', e.target.value)} />
        <AdminInput label="Cover Title (Optional)" value={metadata.cover_title || ''} onChange={e => updateMeta('cover_title', e.target.value)} placeholder="e.g., Personal Diary" />
      </AdminRow>

      <DynamicListHeader title="JOURNAL PAGES" onAdd={() => addPage({ page_number: pages.length + 1, date_entry: '', content: '', is_torn: false })} addLabel="+ Add Page" />
      
      {pages.map((page: any, idx: number) => (
        <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '10px', right: '10px', color: '#888', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>PAGE {page.page_number}</span>
          <RemoveButton onClick={() => removePage(idx, 'page_number')} style={{ position: 'absolute', top: '8px', right: '60px' }} />
          
          <AdminInput label="Date Entry (Optional)" value={page.date_entry || ''} onChange={e => updatePage(idx, 'date_entry', e.target.value)} disabled={page.is_torn} placeholder="e.g., October 14th, 11:00 PM" />
          <AdminTextarea label="Journal Content" value={page.content || ''} onChange={e => updatePage(idx, 'content', e.target.value)} disabled={page.is_torn} required={!page.is_torn} />
          
          <AdminCheckbox 
            checked={!!page.is_torn} 
            onChange={e => updatePage(idx, 'is_torn', e.target.checked)}
            labelTitle="MARK AS TORN OUT"
            description="Hides content for gameplay effect"
            accentColor="var(--accent-crimson)"
            bgColor="transparent"
            style={{ marginBottom: 0, padding: 0, border: 'none' }}
          />
        </div>
      ))}
    </>
  );
};

const ContractFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => {
  const { items: pages, add: addPage, update: updatePage, remove: removePage } = useDynamicList<{page_number: number, terms_text: string, key_clause: string}>(
    metadata.pages || [],
    (newList) => updateMeta('pages', newList)
  );

  return (
    <>
      <AdminRow>
        <AdminInput label="Parties Involved (Comma Separated)" required value={metadata.parties_involved ? metadata.parties_involved.join(', ') : ''} onChange={e => updateMeta('parties_involved', e.target.value.split(',').map((s: string) => s.trim()))} placeholder="e.g., Vance Corp, Thorne LLC" />
        <AdminInput label="Execution Date (Optional)" value={metadata.execution_date || ''} onChange={e => updateMeta('execution_date', e.target.value)} placeholder="e.g., 14-OCT-2023" />
      </AdminRow>

      <DynamicListHeader title="CONTRACT PAGES" onAdd={() => addPage({ page_number: pages.length + 1, terms_text: '', key_clause: '' })} addLabel="+ Add Page" />
      
      {pages.map((page: any, idx: number) => (
        <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '10px', right: '10px', color: '#888', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>PAGE {page.page_number}</span>
          <RemoveButton onClick={() => removePage(idx, 'page_number')} style={{ position: 'absolute', top: '8px', right: '60px' }} />
          
          <AdminTextarea label="Terms and Conditions" minHeight="100px" required value={page.terms_text || ''} onChange={e => updatePage(idx, 'terms_text', e.target.value)} />
          <AdminInput label="Critical Clause (Gameplay Clue - Optional)" value={page.key_clause || ''} onChange={e => updatePage(idx, 'key_clause', e.target.value)} placeholder="Highlight a specific suspicious term" />
        </div>
      ))}

      <div style={{ marginTop: '1rem' }}>
        <AdminCheckbox 
          checked={!!metadata.signatures_valid} 
          onChange={e => updateMeta('signatures_valid', e.target.checked)}
          labelTitle="SIGNATURES VALID"
          description="Uncheck to mark as Forged"
          accentColor="var(--accent-crimson)"
          bgColor="rgba(163, 50, 50, 0.1)"
        />
      </div>
    </>
  );
};

const MemoFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => (
  <>
    <AdminRow>
      <AdminInput label="Written By" required value={metadata.written_by || ''} onChange={e => updateMeta('written_by', e.target.value)} />
      <AdminSelect 
        label="Presentation Style" 
        value={metadata.style || 'notebook'} 
        onChange={e => updateMeta('style', e.target.value)}
        options={[{ value: 'notebook', label: 'Notebook Page' }, { value: 'sticky', label: 'Sticky Note' }]} 
      />
    </AdminRow>
    <AdminTextarea label="Memo Context" required value={metadata.context || ''} onChange={e => updateMeta('context', e.target.value)} />
  </>
);

const BackgroundCheckFields = ({ metadata, updateMeta }: { metadata: any, updateMeta: any }) => (
  <>
    <FormattingGuide />
    <AdminRow>
      <AdminInput label="Subject Name" required value={metadata.subject_name || ''} onChange={e => updateMeta('subject_name', e.target.value)} />
      <AdminInput label="DOB (e.g., 10/24/1985)" required value={metadata.dob || ''} onChange={e => updateMeta('dob', e.target.value)} />
      <AdminInput label="Sex/Age (e.g., M / 41)" required value={metadata.sex_age || ''} onChange={e => updateMeta('sex_age', e.target.value)} />
    </AdminRow>
    <AdminRow>
      <AdminInput label="Aliases / Monikers" value={metadata.aliases || ''} onChange={e => updateMeta('aliases', e.target.value)} />
      <AdminInput label="Last Known Address" value={metadata.last_known_address || ''} onChange={e => updateMeta('last_known_address', e.target.value)} />
    </AdminRow>
    
    <AdminTextarea label="Employment & Financial Flags" value={metadata.employment_financial || ''} onChange={e => updateMeta('employment_financial', e.target.value)} />
    <AdminTextarea label="Criminal History (Docket Format)" minHeight="100px" value={metadata.criminal_history || ''} onChange={e => updateMeta('criminal_history', e.target.value)} />
    <AdminTextarea label="Known Associates" value={metadata.associates || ''} onChange={e => updateMeta('associates', e.target.value)} />
    
    <div className="form-group" style={{ marginTop: '1rem', borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '1rem' }}>
      <label style={{ color: 'var(--accent-crimson)' }}>Investigator Handwritten Scrawls</label>
      <textarea className="admin-textarea" value={metadata.investigator_notes || ''} onChange={e => updateMeta('investigator_notes', e.target.value)} placeholder="Will render in a red cursive marker font across the bottom of the page..." style={{ minHeight: '80px' }} />
    </div>
  </>
);

// --- MAIN EXPORT COMPONENT ---

export default function EvidenceMetadataFields({ evidenceType, subType, setSubType, metadata, updateMeta }: EvidenceMetadataFieldsProps) {
  
  const FORENSIC_OPTIONS = [
    { value: "autopsy", label: "Autopsy Report" },
    { value: "ballistics", label: "Ballistics Analysis" },
    { value: "dna", label: "DNA / Serology Profile" },
    { value: "digital_forensics", label: "Digital Forensics" },
    { value: "trace_analysis", label: "Trace / Material Analysis" }
  ];

  const DOCUMENT_OPTIONS = [
    { value: "correspondence", label: "Correspondence (Email/Letter)" },
    { value: "financial", label: "Financial Record" },
    { value: "journal", label: "Personal Diary / Journal" },
    { value: "contract", label: "Official Contract / Deed" },
    { value: "memo", label: "Corporate Memo / Note" },
    { value: "background_check", label: "Background Check / Dossier" }
  ];

  const renderSubTypeSelector = () => {
    if (evidenceType === 'forensic') return <AdminSelect required value={subType} onChange={e => setSubType(e.target.value)} options={FORENSIC_OPTIONS} placeholder="-- Select Forensic Classification --" />;
    if (evidenceType === 'document') return <AdminSelect required value={subType} onChange={e => setSubType(e.target.value)} options={DOCUMENT_OPTIONS} placeholder="-- Select Document Classification --" />;
    return null;
  };

  const renderDynamicInputs = () => {
    switch (subType) {
      // FORENSICS
      case 'autopsy': return <AutopsyFields metadata={metadata} updateMeta={updateMeta} />;
      case 'ballistics': return <BallisticsFields metadata={metadata} updateMeta={updateMeta} />;
      case 'dna': return <DNAFields metadata={metadata} updateMeta={updateMeta} />;
      case 'digital_forensics': return <DigitalForensicsFields metadata={metadata} updateMeta={updateMeta} />;
      case 'trace_analysis': return <TraceAnalysisFields metadata={metadata} updateMeta={updateMeta} />;
      
      // DOCUMENTS
      case 'correspondence': return <CorrespondenceFields metadata={metadata} updateMeta={updateMeta} />;
      case 'financial': return <FinancialFields metadata={metadata} updateMeta={updateMeta} />;
      case 'journal': return <JournalFields metadata={metadata} updateMeta={updateMeta} />;
      case 'contract': return <ContractFields metadata={metadata} updateMeta={updateMeta} />;
      case 'memo': return <MemoFields metadata={metadata} updateMeta={updateMeta} />;
      case 'background_check': return <BackgroundCheckFields metadata={metadata} updateMeta={updateMeta} />;
      
      // FALLBACK
      default:
        if (evidenceType === 'testimony') {
          return <AdminTextarea label="Official Transcript" value={metadata.transcript || ''} onChange={e => updateMeta('transcript', e.target.value)} />;
        }
        return null;
    }
  };

  if (evidenceType === 'image' || evidenceType === 'audio') return null;

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '1.5rem' }}>
      <h4 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
        [ Structured Metadata Injection ]
      </h4>
      {renderSubTypeSelector()}
      {(subType || evidenceType === 'testimony') && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {renderDynamicInputs()}
        </div>
      )}
    </div>
  );
}