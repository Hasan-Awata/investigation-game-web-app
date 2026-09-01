import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminMutations } from '@/pages/Admin/hooks/useAdminMutations';
import ChoiceEditorCard, { type DraftChoice } from '../Shared/ChoiceEditorCard';
import { defaultRequirements, defaultOutcomes, buildNodeFormData } from '@/pages/Admin/utils/questionUtils';
import type { Question } from '@/types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';

interface AdminInterrogationFormProps {
  nodeData: Question | any;
  levelId: string;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function AdminInterrogationForm({
  nodeData, levelId, onSaved, onDeleted
}: AdminInterrogationFormProps) {
  const [text, setText] = useState(nodeData.text || '');
  const isSaved = typeof nodeData.id === 'number';
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.interrogationForm;

  const initialChoices: DraftChoice[] = (nodeData.choices || []).map((c: any) => ({
    id: c.id || crypto.randomUUID(),
    text: c.text || '',
    outcomes: { ...defaultOutcomes(), ...(c.outcomes || {}) },
    requirements: { ...defaultRequirements(), ...(c.requirements || {}) }
  }));

  const [choicesState, setChoicesState] = useState<DraftChoice[]>(
    initialChoices.length > 0
      ? initialChoices
      : [{ id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }]
  );

  // Directly utilize the unified mutations
  const { createEntity, updateEntity, deleteEntity, isProcessing } = useAdminMutations('question');

  const handleSave = () => {
    if (!text.trim()) {
      toast.error(t.emptyDialogueError);
      return;
    }
    if (choicesState.some(c => !c.text.trim())) {
      toast.error(t.emptyBranchError);
      return;
    }

    const formData = buildNodeFormData({
      level_id: levelId,
      text,
      store_locally: false,
      choices: choicesState,
    });

    if (isSaved) {
      updateEntity({ id: nodeData.id, formData }, { onSuccess: onSaved });
    } else {
      createEntity(formData, { onSuccess: onSaved });
    }
  };

  const handleDelete = () => {
    if (window.confirm(t.deleteConfirm)) {
      deleteEntity(nodeData.id, { onSuccess: onDeleted });
    }
  };

  return (
    <div className={`dialogue-node-card ${isSaved ? '' : 'unsaved'}`}>
      <div className="node-header">
        <span className="node-id-badge">{isSaved ? t.nodeIdBadge(nodeData.id) : t.unsavedBadge}</span>
      </div>

      <div className="node-body">
        <div className="node-suspect-block">
          <label>{t.suspectDialogueLabel}</label>
          <textarea
            className="admin-textarea"
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ minHeight: '80px' }}
            placeholder={t.suspectDialoguePlaceholder}
          />
        </div>

        <div className="node-responses-block">
          <label>{t.playerResponsesLabel}</label>
          {choicesState.map((choice, index) => (
            <ChoiceEditorCard
              key={choice.id}
              index={index}
              choice={choice}
              updateChoice={(updated) => {
                const updatedList = choicesState.map(c => c.id === choice.id ? updated : c);
                setChoicesState(updatedList);
              }}
              removeChoice={() => setChoicesState(choicesState.filter(c => c.id !== choice.id))}
            />
          ))}
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '0.5rem', marginTop: '0.5rem' }}
            onClick={() => setChoicesState([...choicesState, { id: crypto.randomUUID(), text: '', outcomes: defaultOutcomes(), requirements: defaultRequirements() }])}
          >
            {t.addBranchBtn}
          </button>
        </div>
      </div>

      <div className="node-footer">
        <button className="btn-primary" onClick={handleSave} disabled={isProcessing}>
          {isProcessing ? t.syncingBtn : isSaved ? t.updateBtn : t.commitBtn}
        </button>
        {isSaved && (
          <button className="btn-secondary delete-btn" style={{ borderColor: 'var(--accent-crimson)', color: 'var(--accent-crimson)' }} onClick={handleDelete} disabled={isProcessing}>
            {t.deleteBtn}
          </button>
        )}
      </div>
    </div>
  );
}