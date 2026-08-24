import React from 'react';

interface SessionControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  onToggleFlag: () => void;
  onClearAnswer: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  isFlagged: boolean;
  hasSelectedAnswer: boolean;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  onPrevious,
  onNext,
  onFinish,
  onToggleFlag,
  onClearAnswer,
  hasPrevious,
  hasNext,
  isFlagged,
  hasSelectedAnswer
}) => {
  return (
    <div className="session-controls-wrapper">
      <div className="session-controls-left">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="btn btn-secondary"
          type="button"
          aria-label="Pregunta anterior"
        >
          ← Anterior
        </button>

        {hasNext ? (
          <button
            onClick={onNext}
            className="btn btn-primary"
            type="button"
            aria-label="Siguiente pregunta"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="btn btn-accent"
            type="button"
            aria-label="Finalizar sesión de examen"
          >
            Finalizar Examen
          </button>
        )}
      </div>

      <div className="session-controls-right">
        <button
          onClick={onToggleFlag}
          className={`btn ${isFlagged ? 'btn-flagged' : 'btn-secondary'}`}
          type="button"
          aria-label={isFlagged ? 'Quitar marca para revisión' : 'Marcar para revisión'}
        >
          <span style={{ marginRight: '0.25rem' }}>⚑</span>
          {isFlagged ? 'Desmarcar' : 'Marcar'}
        </button>

        {hasSelectedAnswer && (
          <button
            onClick={onClearAnswer}
            className="btn btn-danger-link"
            type="button"
            aria-label="Limpiar opción seleccionada"
          >
            Limpiar respuesta
          </button>
        )}
      </div>
    </div>
  );
};
