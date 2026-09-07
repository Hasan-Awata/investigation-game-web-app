export const objectToFormData = (obj: Record<string, any>): FormData => {
  const formData = new FormData();
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    
    if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0');
    } else if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value.toString());
    }
  });
  return formData;
};

export const getEvidenceMetadataTemplate = (evidenceType: string, subType: string): Record<string, any> => {
  // 1. Master Types
  if (evidenceType === 'testimony') {
    return {
      agency: "", 
      title: "", 
      date: "", 
      case_number: "", 
      subject_name: "", 
      interviewer: "", 
      context: "", 
      transcript: "" 
    };
  }

  if (evidenceType === 'image' || evidenceType === 'audio') {
    return {};
  }

  // 2. Document Sub-Types
  if (evidenceType === 'document') {
    const documentTemplates: Record<string, any> = {
      correspondence: { sender: "", recipient: "", subject: "", body: "" },
      financial: { 
        institution_name: "", 
        account_holder: "", 
        account_number: "", 
        pages: [
          { 
            page_number: 1, 
            statement_period: "", 
            transactions: [
              { date: "", description: "", amount: 0 }
            ] 
          }
        ] 
      },
      journal: { 
        owner: "", 
        cover_title: "", 
        pages: [
          { page_number: 1, date_entry: "", content: "", is_torn: false }
        ] 
      },
      contract: { 
        parties_involved: [""], 
        execution_date: "", 
        pages: [
          { page_number: 1, terms_text: "" }
        ], 
        signatures_valid: false 
      },
      memo: { written_by: "", style: "notebook", context: "" },
      background_check: { subject_name: "", dob: "", sex_age: "", aliases: "", last_known_address: "", employment_financial: "", criminal_history: "", associates: "", investigator_notes: "" }
    };
    return documentTemplates[subType] || {};
  }

  // 3. Forensic Sub-Types
  if (evidenceType === 'forensic') {
    const forensicTemplates: Record<string, any> = {
      autopsy: { 
        victim_name: "", 
        gender: "", 
        victim_age: "", 
        examiner: "", 
        time_of_death: "", 
        cause_of_death: "", 
        anomalies: "", 
        internal_exam: "", 
        toxicology_report: "", 
        evidence_collected: [""] // Array of strings representing evidence collected during the autopsy
      },
      ballistics: { 
        case_number: "", 
        chain_of_custody: { submitted_by: "", received_date: "" }, 
        caliber: "", 
        rifling_pattern: "", 
        exhibits: [
          { reference: "", description: "" }
        ], 
        firearm_specs: "", 
        microscopic_analysis: "", 
        trajectory_range: "", 
        firing_distance: "", 
        conclusion: "", 
        investigator_notes: "" 
      },
      dna: { sample_type: "", match_probability: "", lab_technician: "", extraction_method: "", identified_person: "", loci_profile_summary: "", lab_notes: "" },
      digital_forensics: { device_type: "", extraction_method: "", recovered_data: "" },
      trace_analysis: { material_type: "", origin_source: "" }
    };
    return forensicTemplates[subType] || {};
  }

  return {};
};