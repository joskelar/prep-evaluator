import React from 'react';
import { ExamSession } from '@/types';
import { getQuestionStatus } from '@/lib/session/sessionOperations';

interface QuestionNavigatorProps {
  session: ExamSession;
  onJumpToQuestion: (index: number) => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  session,
  onJumpToQuestion
}) => {
  return (
    <div className="navigator-card">
      <h2 className="navigator-title">Navegación de Preguntas</h2>
      
      <div className="navigator-grid">
        {session.questionIds.map((qId, idx) => {
          const { isAnswered, isFlagged } = getQuestionStatus(session, qId);
          const isCurrent = idx === session.currentQuestionIndex;
          
          let btnClass = 'navigator-btn';
          if (isCurrent) btnClass += ' current';
          if (isAnswered) btnClass += ' answered';
          if (isFlagged) btnClass += ' flagged';

          const numberLabel = idx + 1;
          const statusText = [
            isCurrent ? 'Actual' : '',
            isAnswered ? 'Respondida' : 'Sin responder',
            isFlagged ? 'Marcada para revisión' : ''
          ].filter(Boolean).join(', ');

          return (
            <button
              key={qId}
              onClick={() => onJumpToQuestion(idx)}
              className={btnClass}
              title={`Pregunta ${numberLabel} (${statusText})`}
              aria-label={`Ir a pregunta ${numberLabel}, ${statusText}`}
              type="button"
            >
              {numberLabel}
              {isFlagged && <span className="btn-flag-dot" aria-hidden="true">⚑</span>}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="navigator-legend">
        <div className="legend-item">
          <span className="legend-badge current">1</span>
          <span>Actual</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge answered">1</span>
          <span>Respondida</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge flagged">1⚑</span>
          <span>Marcada</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge">1</span>
          <span>Sin responder</span>
        </div>
      </div>
    </div>
  );
};
