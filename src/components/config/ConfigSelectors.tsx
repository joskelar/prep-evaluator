import React from 'react';
import { Difficulty } from '@/types';

interface TargetSelectorProps {
  value: string;
  onChange: (target: string) => void;
}

export const ExamTargetSelector: React.FC<TargetSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="form-group">
      <label htmlFor="target-select" className="form-label" style={{ fontWeight: 600 }}>
        Objetivo de Examen
      </label>
      <div className="target-tabs" id="target-select" role="radiogroup" aria-label="Objetivo de examen">
        <button
          type="button"
          role="radio"
          aria-checked={value === 'prepatec'}
          className={`tab-btn ${value === 'prepatec' ? 'active' : ''}`}
          onClick={() => onChange('prepatec')}
        >
          PrepaTec (PIENSE II)
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === 'buap'}
          className={`tab-btn ${value === 'buap' ? 'active' : ''}`}
          onClick={() => onChange('buap')}
        >
          BUAP (Admisión)
        </button>
      </div>
    </div>
  );
};

interface AreaSelectorProps {
  target: string;
  allowedAreas: string[];
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
  multiple?: boolean;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({
  allowedAreas,
  selectedAreas,
  onChange,
  multiple = false
}) => {
  const getAreaLabel = (area: string) => {
    switch (area) {
      case 'cognitive': return 'Habilidades Cognitivas';
      case 'spanish': return 'Español / Lengua';
      case 'math': return 'Matemáticas';
      case 'english': return 'Inglés';
      case 'science': return 'Ciencias Naturales';
      default: return area;
    }
  };

  const handleToggle = (area: string) => {
    if (multiple) {
      if (selectedAreas.includes(area)) {
        onChange(selectedAreas.filter(a => a !== area));
      } else {
        onChange([...selectedAreas, area]);
      }
    } else {
      onChange([area]);
    }
  };

  return (
    <div className="form-group">
      <label className="form-label" style={{ fontWeight: 600 }}>
        Selecciona el Área
      </label>
      <div className="selector-grid" role="group" aria-label="Áreas de estudio">
        {allowedAreas.map(area => {
          const isSelected = selectedAreas.includes(area);
          return (
            <label
              key={area}
              className={`selector-card-checkbox ${isSelected ? 'selected' : ''}`}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name="study-area"
                checked={isSelected}
                onChange={() => handleToggle(area)}
                style={{ marginRight: '0.5rem' }}
              />
              {getAreaLabel(area)}
            </label>
          );
        })}
      </div>
    </div>
  );
};

interface CategorySelectorProps {
  categories: string[];
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  multiple?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategories,
  onChange,
  multiple = false
}) => {
  const getCategoryLabel = (cat: string) => {
    return cat
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleToggle = (cat: string) => {
    if (multiple) {
      if (selectedCategories.includes(cat)) {
        onChange(selectedCategories.filter(c => c !== cat));
      } else {
        onChange([...selectedCategories, cat]);
      }
    } else {
      onChange([cat]);
    }
  };

  if (categories.length === 0) return null;

  return (
    <div className="form-group">
      <label htmlFor="category-select" className="form-label" style={{ fontWeight: 600 }}>
        Categorías de Estudio
      </label>
      {multiple ? (
        <div id="category-select" className="selector-grid" role="group" aria-label="Categorías">
          {categories.map(cat => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <label
                key={cat}
                className={`selector-card-checkbox ${isSelected ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(cat)}
                  style={{ marginRight: '0.5rem' }}
                />
                {getCategoryLabel(cat)}
              </label>
            );
          })}
        </div>
      ) : (
        <select
          id="category-select"
          value={selectedCategories[0] || ''}
          onChange={e => onChange(e.target.value ? [e.target.value] : [])}
          className="form-control"
        >
          <option value="">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

interface DifficultySelectorProps {
  value: Difficulty | 'mixed';
  onChange: (val: Difficulty | 'mixed') => void;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({ value, onChange }) => {
  return (
    <div className="form-group">
      <label htmlFor="difficulty-select" className="form-label" style={{ fontWeight: 600 }}>
        Nivel de Dificultad
      </label>
      <select
        id="difficulty-select"
        value={value}
        onChange={e => onChange(e.target.value as Difficulty | 'mixed')}
        className="form-control"
      >
        <option value="mixed">Mixta (Equilibrada)</option>
        <option value="easy">Fácil</option>
        <option value="medium">Media</option>
        <option value="hard">Difícil</option>
      </select>
    </div>
  );
};

interface QuestionCountSelectorProps {
  value: number;
  maxAvailable: number;
  onChange: (val: number) => void;
}

export const QuestionCountSelector: React.FC<QuestionCountSelectorProps> = ({
  value,
  maxAvailable,
  onChange
}) => {
  const options = [5, 10, 15, 20, 30, 50].filter(n => n <= maxAvailable);

  return (
    <div className="form-group">
      <label htmlFor="question-count-select" className="form-label" style={{ fontWeight: 600 }}>
        Número de Preguntas <span style={{ color: 'var(--accent-secondary)', fontWeight: 400 }}>({maxAvailable} disponibles)</span>
      </label>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <select
          id="question-count-select"
          value={options.includes(value) ? value : 'custom'}
          onChange={e => {
            const val = e.target.value;
            if (val !== 'custom') {
              onChange(Number(val));
            }
          }}
          className="form-control"
          style={{ flexGrow: 1 }}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>
              {opt} preguntas
            </option>
          ))}
          <option value="custom">Cantidad personalizada...</option>
        </select>

        {(!options.includes(value) || value > maxAvailable) && (
          <input
            type="number"
            min={1}
            max={maxAvailable}
            value={value}
            aria-label="Cantidad personalizada de preguntas"
            onChange={e => {
              const val = Math.min(maxAvailable, Math.max(1, parseInt(e.target.value, 10) || 1));
              onChange(val);
            }}
            className="form-control"
            style={{ width: '100px' }}
          />
        )}
      </div>
    </div>
  );
};

interface DurationSelectorProps {
  hasDuration: boolean;
  onToggleDuration: (val: boolean) => void;
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  hasDuration,
  onToggleDuration,
  value,
  onChange,
  disabled = false
}) => {
  return (
    <div className="form-group">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
        {!disabled && (
          <input
            id="enable-duration-chk"
            type="checkbox"
            checked={hasDuration}
            onChange={e => onToggleDuration(e.target.checked)}
          />
        )}
        <label htmlFor={disabled ? "duration-input" : "enable-duration-chk"} className="form-label" style={{ margin: 0, fontWeight: 600 }}>
          Límite de Tiempo
        </label>
      </div>

      {(hasDuration || disabled) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            id="duration-input"
            type="number"
            min={1}
            max={180}
            value={value}
            disabled={disabled && !hasDuration} // if forced by simulator
            onChange={e => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="form-control"
            style={{ width: '120px' }}
          />
          <span style={{ color: 'var(--text-primary)' }}>minutos</span>
        </div>
      )}
    </div>
  );
};
