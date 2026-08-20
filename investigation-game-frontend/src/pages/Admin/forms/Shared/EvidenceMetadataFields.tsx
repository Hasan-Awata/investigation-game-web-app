interface EvidenceMetadataFieldsProps {
  evidenceType: string;
  subType: string;
  setSubType: (val: string) => void;
  metadata: Record<string, any>;
  updateMeta: (key: string, value: any) => void;
}

export default function EvidenceMetadataFields({
  evidenceType,
  subType,
  setSubType,
  metadata,
  updateMeta
}: EvidenceMetadataFieldsProps) {

  // Renders the specific sub-type dropdown based on the main category
  const renderSubTypeSelector = () => {
    if (evidenceType === 'forensic') {
      return (
        <select className="admin-input" required value={subType} onChange={(e) => setSubType(e.target.value)}>
          <option value="" disabled>-- Select Forensic Classification --</option>
          <option value="autopsy">Autopsy Report</option>
          <option value="ballistics">Ballistics Analysis</option>
          <option value="dna">DNA / Serology Profile</option>
          <option value="digital_forensics">Digital Forensics</option>
          <option value="trace_analysis">Trace / Material Analysis</option>
        </select>
      );
    }
    
    if (evidenceType === 'document') {
      return (
        <select className="admin-input" required value={subType} onChange={(e) => setSubType(e.target.value)}>
          <option value="" disabled>-- Select Document Classification --</option>
          <option value="correspondence">Correspondence (Email/Letter)</option>
          <option value="financial">Financial Record</option>
          <option value="journal">Personal Diary / Journal</option>
          <option value="contract">Official Contract / Deed</option>
          <option value="memo">Corporate Memo / Note</option>
          <option value="background_check">Background Check / Dossier</option> 
        </select>
      );
    }
    return null;
  };

  // Renders the precise form inputs required for the selected sub-type
  const renderDynamicInputs = () => {
    switch (subType) {
      // --- FORENSIC SUB-TYPES ---
      case 'autopsy':
        return (
          <>
            <div className="admin-form-row">
              <div className="form-group"><label>Chief Medical Examiner</label><input type="text" className="admin-input" value={metadata.examiner || ''} onChange={e => updateMeta('examiner', e.target.value)} required /></div>
              <div className="form-group"><label>Est. Time of Death</label><input type="text" className="admin-input" value={metadata.time_of_death || ''} onChange={e => updateMeta('time_of_death', e.target.value)} required /></div>
            </div>
            <div className="form-group"><label>Primary Cause of Death</label><input type="text" className="admin-input" value={metadata.cause_of_death || ''} onChange={e => updateMeta('cause_of_death', e.target.value)} required /></div>
            <div className="form-group"><label>Examiner Notes / Anomalies (Optional)</label><textarea className="admin-textarea" value={metadata.anomalies || ''} onChange={e => updateMeta('anomalies', e.target.value)} /></div>
          </>
        );

      case 'ballistics': {
        const exhibits = metadata.exhibits || [];

        const addExhibit = () => {
          updateMeta('exhibits', [...exhibits, { reference: '', description: '' }]);
        };

        const updateExhibit = (index: number, field: string, value: string) => {
          const newEx = [...exhibits];
          newEx[index] = { ...newEx[index], [field]: value };
          updateMeta('exhibits', newEx);
        };

        const removeExhibit = (index: number) => {
          const newEx = exhibits.filter((_: any, i: number) => i !== index);
          updateMeta('exhibits', newEx);
        };

        return (
          <>
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px dashed var(--accent-cyan)' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                <strong>[ FORMATTING GUIDE ]</strong> Use HTML tags to trigger immersive effects:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                <li><code>&lt;span className="redacted"&gt;Text&lt;/span&gt;</code> : Black redaction bar.</li>
                <li><code>&lt;span className="highlighted"&gt;Text&lt;/span&gt;</code> : Yellow highlighter marker.</li>
              </ul>
            </div>

            <div className="admin-form-row">
              <div className="form-group"><label>Lab Case Number</label><input type="text" className="admin-input" value={metadata.case_number || ''} onChange={e => updateMeta('case_number', e.target.value)} required placeholder="e.g., 2026-BL-8842" /></div>
              <div className="form-group"><label>Examiner Name</label><input type="text" className="admin-input" value={metadata.examiner_name || ''} onChange={e => updateMeta('examiner_name', e.target.value)} required /></div>
            </div>

            <div style={{ marginTop: '1.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>EVIDENCE INTAKE LOG (EXHIBITS)</label>
                <button type="button" className="btn-secondary" onClick={addExhibit} style={{ padding: '0.25rem 0.75rem', width: 'auto', fontSize: '0.75rem' }}>+ Add Exhibit</button>
              </div>

              {exhibits.map((ex: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input type="text" className="admin-input" placeholder="Ref (e.g. EXHIBIT A)" value={ex.reference || ''} onChange={e => updateExhibit(idx, 'reference', e.target.value)} style={{ width: '160px' }} required />
                  <input type="text" className="admin-input" placeholder="Description (e.g. Recovered 9mm Slug)" value={ex.description || ''} onChange={e => updateExhibit(idx, 'description', e.target.value)} style={{ flex: 1 }} required />
                  <button type="button" onClick={() => removeExhibit(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-crimson)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }} title="Remove Exhibit">×</button>
                </div>
              ))}
              
              {exhibits.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                  No exhibits logged. Add a row above.
                </div>
              )}
            </div>

            <h5 style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>TECHNICAL FINDINGS</h5>
            <div className="form-group"><label>Firearm Specification Data</label><textarea className="admin-textarea" value={metadata.firearm_specs || ''} onChange={e => updateMeta('firearm_specs', e.target.value)} style={{ minHeight: '60px' }} /></div>
            <div className="form-group"><label>Microscopic & Toolmark Analysis</label><textarea className="admin-textarea" value={metadata.microscopic_analysis || ''} onChange={e => updateMeta('microscopic_analysis', e.target.value)} style={{ minHeight: '80px' }} /></div>
            <div className="form-group"><label>Trajectory & Range Findings (If Applicable)</label><textarea className="admin-textarea" value={metadata.trajectory_range || ''} onChange={e => updateMeta('trajectory_range', e.target.value)} style={{ minHeight: '60px' }} /></div>
            
            <div className="form-group" style={{ marginTop: '1rem' }}><label>Official Conclusion / Match Determination</label><textarea className="admin-textarea" value={metadata.conclusion || ''} onChange={e => updateMeta('conclusion', e.target.value)} required style={{ minHeight: '60px', borderLeft: '3px solid var(--accent-crimson)' }} placeholder="e.g., MATCH CONFIRMED: Striation patterns on Exhibit A match..." /></div>
            
            <div className="form-group" style={{ marginTop: '1.5rem', borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '1rem' }}>
              <label style={{ color: 'var(--accent-crimson)' }}>Investigator Handwritten Scrawls</label>
              <textarea className="admin-textarea" value={metadata.investigator_notes || ''} onChange={e => updateMeta('investigator_notes', e.target.value)} placeholder="Will render in a red cursive marker font..." style={{ minHeight: '80px' }} />
            </div>
          </>
        );
      }

      case 'dna':
        return (
          <>
            <div className="admin-form-row">
              <div className="form-group"><label>Sample Type (e.g., Blood, Hair)</label><input type="text" className="admin-input" value={metadata.sample_type || ''} onChange={e => updateMeta('sample_type', e.target.value)} required /></div>
              <div className="form-group"><label>Match Probability</label><input type="text" className="admin-input" value={metadata.match_probability || ''} onChange={e => updateMeta('match_probability', e.target.value)} required /></div>
            </div>
            <div className="form-group"><label>Identified Subject (Leave blank if inconclusive)</label><input type="text" className="admin-input" value={metadata.identified_person || ''} onChange={e => updateMeta('identified_person', e.target.value)} /></div>
          </>
        );

      case 'digital_forensics':
        return (
          <>
            <div className="admin-form-row">
              <div className="form-group"><label>Device Classification</label><input type="text" className="admin-input" value={metadata.device_type || ''} onChange={e => updateMeta('device_type', e.target.value)} required /></div>
              <div className="form-group"><label>Extraction Method</label><input type="text" className="admin-input" value={metadata.extraction_method || ''} onChange={e => updateMeta('extraction_method', e.target.value)} required /></div>
            </div>
            <div className="form-group"><label>Decrypted Data / Payload</label><textarea className="admin-textarea" value={metadata.recovered_data || ''} onChange={e => updateMeta('recovered_data', e.target.value)} required /></div>
          </>
        );

      case 'trace_analysis':
        return (
          <>
            <div className="admin-form-row">
              <div className="form-group"><label>Material Composition</label><input type="text" className="admin-input" value={metadata.material_type || ''} onChange={e => updateMeta('material_type', e.target.value)} required /></div>
              <div className="form-group"><label>Identified Origin Source</label><input type="text" className="admin-input" value={metadata.origin_source || ''} onChange={e => updateMeta('origin_source', e.target.value)} required /></div>
            </div>
          </>
        );

      // --- DOCUMENT SUB-TYPES ---
      case 'correspondence':
        return (
          <>
            <div className="admin-form-row">
              <div className="form-group"><label>Sender (FROM)</label><input type="text" className="admin-input" value={metadata.sender || ''} onChange={e => updateMeta('sender', e.target.value)} required /></div>
              <div className="form-group"><label>Recipient (TO)</label><input type="text" className="admin-input" value={metadata.recipient || ''} onChange={e => updateMeta('recipient', e.target.value)} required /></div>
            </div>
            <div className="form-group"><label>Subject Line</label><input type="text" className="admin-input" value={metadata.subject || ''} onChange={e => updateMeta('subject', e.target.value)} required /></div>
            <div className="form-group"><label>Message Body</label><textarea className="admin-textarea" value={metadata.body || ''} onChange={e => updateMeta('body', e.target.value)} required /></div>
          </>
        );

      case 'financial': {
        const transactions = metadata.transactions || [];

        const addTransaction = () => {
          updateMeta('transactions', [...transactions, { date: '', type: '', amount: '', status: 'CLEARED' }]);
        };

        const updateTransaction = (index: number, field: string, value: string) => {
          const newTx = [...transactions];
          newTx[index] = { ...newTx[index], [field]: value };
          updateMeta('transactions', newTx);
        };

        const removeTransaction = (index: number) => {
          const newTx = transactions.filter((_: any, i: number) => i !== index);
          updateMeta('transactions', newTx);
        };

        return (
          <>
            <div className="admin-form-row">
              <div className="form-group"><label>Banking Institution</label><input type="text" className="admin-input" value={metadata.institution || ''} onChange={e => updateMeta('institution', e.target.value)} required /></div>
              <div className="form-group"><label>Account Holder</label><input type="text" className="admin-input" value={metadata.account_holder || ''} onChange={e => updateMeta('account_holder', e.target.value)} required /></div>
            </div>
            
            <div style={{ marginTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>TRANSACTION LEDGER</label>
                <button type="button" className="btn-secondary" onClick={addTransaction} style={{ padding: '0.25rem 0.75rem', width: 'auto', fontSize: '0.75rem' }}>+ Add Row</button>
              </div>

              {transactions.map((tx: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input type="text" className="admin-input" placeholder="Date" value={tx.date || ''} onChange={e => updateTransaction(idx, 'date', e.target.value)} style={{ width: '100px' }} required />
                  <input type="text" className="admin-input" placeholder="Type (e.g. Wire Transfer)" value={tx.type || ''} onChange={e => updateTransaction(idx, 'type', e.target.value)} style={{ flex: 1 }} required />
                  <input type="text" className="admin-input" placeholder="Amount" value={tx.amount || ''} onChange={e => updateTransaction(idx, 'amount', e.target.value)} style={{ width: '120px' }} required />
                  <input type="text" className="admin-input" placeholder="Status" value={tx.status || ''} onChange={e => updateTransaction(idx, 'status', e.target.value)} style={{ width: '100px' }} required />
                  <button type="button" onClick={() => removeTransaction(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-crimson)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }} title="Remove Row">×</button>
                </div>
              ))}
              
              {transactions.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                  No transactions recorded. Add a row above to build the ledger.
                </div>
              )}
            </div>
          </>
        );
      }

      case 'journal':
        return (
          <>
            <div className="admin-form-row">
              <div className="form-group"><label>Author</label><input type="text" className="admin-input" value={metadata.author || ''} onChange={e => updateMeta('author', e.target.value)} required /></div>
              <div className="form-group"><label>Entry Date</label><input type="text" className="admin-input" value={metadata.entry_date || ''} onChange={e => updateMeta('entry_date', e.target.value)} required /></div>
            </div>
            <div className="form-group"><label>Journal Content</label><textarea className="admin-textarea" value={metadata.content || ''} onChange={e => updateMeta('content', e.target.value)} required /></div>
          </>
        );

      case 'contract':
        return (
          <>
            <div className="form-group">
              <label>Parties Involved (Comma Separated)</label>
              <input 
                type="text" className="admin-input" 
                value={metadata.parties_involved ? metadata.parties_involved.join(', ') : ''} 
                onChange={e => updateMeta('parties_involved', e.target.value.split(',').map(s => s.trim()))} 
                placeholder="e.g., Vance Corp, Thorne LLC" required 
              />
            </div>
            <div className="form-group"><label>Agreement Terms</label><textarea className="admin-textarea" value={metadata.agreement_terms || ''} onChange={e => updateMeta('agreement_terms', e.target.value)} required /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(163, 50, 50, 0.1)', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(163, 50, 50, 0.3)' }}>
              <input type="checkbox" checked={!!metadata.signatures_valid} onChange={e => updateMeta('signatures_valid', e.target.checked)} style={{ transform: 'scale(1.5)' }} />
              <label style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-crimson)' }}><strong>SIGNATURES VALID (Uncheck to mark as Forged)</strong></label>
            </div>
          </>
        );

      case 'memo':
        return (
          <>
            <div className="form-group"><label>Written By</label><input type="text" className="admin-input" value={metadata.written_by || ''} onChange={e => updateMeta('written_by', e.target.value)} required /></div>
            <div className="form-group"><label>Memo Context</label><textarea className="admin-textarea" value={metadata.context || ''} onChange={e => updateMeta('context', e.target.value)} required /></div>
          </>
        );
        
      case 'background_check':
        return (
          <>
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px dashed var(--accent-cyan)' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                <strong>[ FORMATTING GUIDE ]</strong> You can use these HTML tags inside any of the text boxes below to trigger immersive investigative effects:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                <li><code>&lt;span className="redacted"&gt;Text&lt;/span&gt;</code> : Renders a black redaction bar over the text.</li>
                <li><code>&lt;span className="highlighted"&gt;Text&lt;/span&gt;</code> : Applies a yellow highlighter marker effect.</li>
              </ul>
            </div>

            <div className="admin-form-row">
              <div className="form-group"><label>Subject Name</label><input type="text" className="admin-input" value={metadata.subject_name || ''} onChange={e => updateMeta('subject_name', e.target.value)} required /></div>
              <div className="form-group"><label>DOB (e.g., 10/24/1985)</label><input type="text" className="admin-input" value={metadata.dob || ''} onChange={e => updateMeta('dob', e.target.value)} required /></div>
              <div className="form-group"><label>Sex/Age (e.g., M / 41)</label><input type="text" className="admin-input" value={metadata.sex_age || ''} onChange={e => updateMeta('sex_age', e.target.value)} required /></div>
            </div>
            <div className="admin-form-row">
              <div className="form-group"><label>Aliases / Monikers</label><input type="text" className="admin-input" value={metadata.aliases || ''} onChange={e => updateMeta('aliases', e.target.value)} /></div>
              <div className="form-group"><label>Last Known Address</label><input type="text" className="admin-input" value={metadata.last_known_address || ''} onChange={e => updateMeta('last_known_address', e.target.value)} /></div>
            </div>
            
            <div className="form-group" style={{ marginTop: '1rem' }}><label>Employment & Financial Flags</label><textarea className="admin-textarea" value={metadata.employment_financial || ''} onChange={e => updateMeta('employment_financial', e.target.value)} style={{ minHeight: '80px' }} /></div>
            <div className="form-group"><label>Criminal History (Docket Format)</label><textarea className="admin-textarea" value={metadata.criminal_history || ''} onChange={e => updateMeta('criminal_history', e.target.value)} style={{ minHeight: '100px' }} /></div>
            <div className="form-group"><label>Known Associates</label><textarea className="admin-textarea" value={metadata.associates || ''} onChange={e => updateMeta('associates', e.target.value)} style={{ minHeight: '80px' }} /></div>
            
            <div className="form-group" style={{ marginTop: '1rem', borderLeft: '3px solid var(--accent-crimson)', paddingLeft: '1rem' }}>
              <label style={{ color: 'var(--accent-crimson)' }}>Investigator Handwritten Scrawls</label>
              <textarea className="admin-textarea" value={metadata.investigator_notes || ''} onChange={e => updateMeta('investigator_notes', e.target.value)} placeholder="Will render in a red cursive marker font across the bottom of the page..." style={{ minHeight: '80px' }} />
            </div>
          </>
        );

      default:
        // Legacy or un-typed fallback
        if (evidenceType === 'testimony') {
          return (
            <div className="form-group">
              <label>Official Transcript</label>
              <textarea className="admin-textarea" value={metadata.transcript || ''} onChange={e => updateMeta('transcript', e.target.value)} />
            </div>
          );
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

      {subType && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {renderDynamicInputs()}
        </div>
      )}
    </div>
  );
}