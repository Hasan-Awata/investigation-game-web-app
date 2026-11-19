export const getEvidenceMetadataTemplate = (evidenceType: string): Record<string, unknown> => {
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

  return {};
};
