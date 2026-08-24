import React, { useEffect, useRef } from 'react';
import { SessionProgress } from '@/types';

interface FinishConfirmationProps {
  isOpen: boolean;
  progress: SessionProgress;
  onCancel: () => void;
  onConfirm: () => void;
}

export const FinishConfirmation: React.FC<FinishConfirmationProps> = ({
  isOpen,
  progress,
  onCancel,
  onConfirm
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Handle ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Focus cancel button for safe default action
    setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="modal-title">¿Finalizar Examen?</h2>
        
        <p className="modal-lead">
          Por favor confirma que deseas concluir tu sesión actual. A continuación se presenta el resumen de tu progreso:
        </p>

        <div className="modal-summary-grid">
          <div className="summary-card">
            <span className="summary-num">{progress.totalQuestions}</span>
            <span className="summary-lbl">Total Preguntas</span>
          </div>
          <div className="summary-card success">
            <span className="summary-num">{progress.answeredCount}</span>
            <span className="summary-lbl">Respondidas</span>
          </div>
          <div className="summary-card warning">
            <span className="summary-num">{progress.unansweredCount}</span>
            <span className="summary-lbl">Sin Responder</span>
          </div>
          <div className="summary-card flagged">
            <span className="summary-num">{progress.flaggedCount}</span>
            <span className="summary-lbl">Marcadas ⚑</span>
          </div>
        </div>

        {progress.unansweredCount > 0 && (
          <div className="modal-warning-block">
            ⚠️ Tienes <strong>{progress.unansweredCount}</strong> preguntas sin responder. Si finalizas ahora, no podrás responderlas.
          </div>
        )}

        <div className="modal-actions">
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            className="btn btn-secondary"
            type="button"
          >
            Regresar al Examen
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-accent"
            type="button"
          >
            Sí, Finalizar Examen
          </button>
        </div>
      </div>
    </div>
  );
};
