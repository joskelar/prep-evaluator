import React from 'react';
import { QuestionOption } from '@/types';

interface OptionComponentProps {
  option: QuestionOption;
  isSelected: boolean;
  onClick: () => void;
  index: number; // e.g. 0 -> 'A', 1 -> 'B', etc.
}

export const OptionComponent: React.FC<OptionComponentProps> = ({
  option,
  isSelected,
  onClick,
  index
}) => {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const labelLetter = letters[index] || option.id;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`option-row ${isSelected ? 'selected' : ''}`}
      aria-label={`Opción ${labelLetter}: ${option.text}`}
    >
      <div className="option-letter">{labelLetter}</div>
      <div className="option-text">{option.text}</div>
      <div className="option-indicator">
        <div className="option-indicator-inner" />
      </div>
    </div>
  );
};
