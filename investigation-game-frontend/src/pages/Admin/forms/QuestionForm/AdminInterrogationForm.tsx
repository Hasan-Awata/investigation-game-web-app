import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminMutations } from '@/pages/Admin/hooks/useAdminMutations';
import { useConfirm } from '@/pages/Admin/components/AdminUI/ConfirmContext';
import ChoiceEditorCard, { type DraftChoice } from '../Shared/ChoiceEditorCard';
import { defaultRequirements, defaultOutcomes, buildNodeFormData } from '@/pages/Admin/utils/questionUtils';
import type { Choice } from '@/types';
import { useAdminTranslation } from '@/pages/Admin/hooks/useAdminTranslation';
import choiceEditorCard from '../Shared/ChoiceEditorCard.module.css';
import adminInterrogationBuilder from './AdminInterrogationBuilder.module.css';
import adminDashboard from '../../AdminDashboard.module.css';

interface NodeData {
  id: number | string;
  text: string;
  choices?: Choice[];
}

interface AdminInterrogationFormProps {
  nodeData: NodeData;
  levelId: string;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function AdminInterrogationForm({
  nodeData, levelId, onSaved, onDeleted
}: AdminInterrogationFormProps) {
  const [text, setText] = useState(nodeData.text || '');
  const savedId = typeof nodeData.id === 'number' ? nodeData.id : null;
  const { adminT } = useAdminTranslation();
  const t = adminT.forms.interrogationForm;
  const confirm = useConfirm();

  const initialChoices: DraftChoice[] = (nodeData.choices || []).map((c: Choice) => ({
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

    if (savedId !== null) {
      updateEntity({ id: savedId, formData }, { onSuccess: onSaved });
    } else {
      createEntity(formData, { onSuccess: onSaved });
    }
  };

  const handleDelete = async () => {
    if (await confirm({ message: t.deleteConfirm, danger: true })) {
      if (savedId !== null) {
        deleteEntity(savedId, { onSuccess: onDeleted });
      }
    }
  };

return (
    <div 
      className={`${adminInterrogationBuilder['dialogue-node-card']} ${savedId !== null ? '' : adminInterrogationBuilder['unsaved']}`}>
      <div className={adminInterrogationBuilder['node-header']}>
        <span className={adminInterrogationBuilder['node-id-badge']}>{savedId !== null ? t.nodeIdBadge(savedId) : t.unsavedBadge}</span>
      </div>

      <div className={adminInterrogationBuilder['node-body']}>
        <div className={adminInterrogationBuilder['node-suspect-block']}>
          <label>{t.suspectDialogueLabel}</label>
          <textarea
            className={adminDashboard['admin-textarea']}
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ minHeight: '80px' }}
            placeholder={t.suspectDialoguePlaceholder}
          />
        </div>

        <div className={adminInterrogationBuilder['node-responses-block']}>
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

      <div className={adminInterrogationBuilder['node-footer']}>
        <button className="btn-primary" onClick={handleSave} disabled={isProcessing}>
          {isProcessing ? t.syncingBtn : savedId !== null ? t.updateBtn : t.commitBtn}
        </button>
        {savedId !== null && (
          <button className={`btn-secondary ${choiceEditorCard['delete-btn']}`} style={{ borderColor: 'var(--accent-crimson)', color: 'var(--accent-crimson)' }} onClick={handleDelete} disabled={isProcessing}>
            {t.deleteBtn}
          </button>
        )}
      </div>
    </div>
  );
}