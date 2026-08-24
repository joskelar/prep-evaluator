import React from 'react';
import { Question, Stimulus } from '@/types';
import { OptionComponent } from './OptionComponent';
import { QuestionAssetRenderer } from './QuestionAssetRenderer';
import { StimulusRenderer } from './StimulusRenderer';

interface QuestionRendererProps {
  question: Question;
  questionNumber: number;
  selectedOptionId?: string;
  onSelectOption: (optionId: string) => void;
  onClearAnswer: () => void;
  isFlagged: boolean;
  onToggleFlag: () => void;
  stimulus?: Stimulus;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  questionNumber,
  selectedOptionId,
  onSelectOption,
  onClearAnswer,
  isFlagged,
  onToggleFlag,
  stimulus
}) => {
  return (
    <div className={`question-wrapper ${stimulus ? 'has-stimulus' : ''}`}>
      {/* Render Stimulus Panel if present */}
      {stimulus && (
        <div className="stimulus-panel-wrapper">
          <StimulusRenderer stimulus={stimulus} />
        </div>
      )}

      {/* Main Question Panel */}
      <div className="question-panel-wrapper">
        <div className="question-card">
          <div className="question-header">
            <span className="question-badge">Pregunta {questionNumber}</span>
            <button
              onClick={onToggleFlag}
              className={`flag-button ${isFlagged ? 'flagged' : ''}`}
              aria-label={isFlagged ? 'Quitar marca a esta pregunta' : 'Marcar esta pregunta para revisión'}
              type="button"
            >
              <span className="flag-icon">⚑</span>
              {isFlagged ? 'Marcada' : 'Marcar'}
            </button>
          </div>

          <div className="question-prompt">
            {question.prompt}
          </div>

          {/* Render Independent Question Assets */}
          <QuestionAssetRenderer assets={question.assets} />

          {/* Options Selection Grid */}
          <div className="options-container" role="radiogroup" aria-label={`Opciones de la pregunta ${questionNumber}`}>
            {question.options.map((opt, idx) => (
              <OptionComponent
                key={opt.id}
                option={opt}
                isSelected={selectedOptionId === opt.id}
                onClick={() => onSelectOption(opt.id)}
                index={idx}
              />
            ))}
          </div>

          {/* Auxiliary Actions */}
          <div className="question-actions-row">
            {selectedOptionId && (
              <button
                onClick={onClearAnswer}
                className="btn btn-secondary btn-sm"
                type="button"
              >
                Limpiar Respuesta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
