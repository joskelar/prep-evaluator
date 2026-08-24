import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useExamSession } from '@/context/ExamSessionContext';
import { Difficulty, ExamTargetConfig, Question } from '@/types';
import { loadExamTargets, initializeDataStore, allQuestions } from '@/lib/data/loader';
import { filterQuestions } from '@/lib/engine/filter';
import {
  DifficultySelector,
  QuestionCountSelector
} from '@/components/config/ConfigSelectors';

export const ReviewConfig: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startNewSession, session } = useExamSession();

  const targetParam = searchParams.get('target') || 'prepatec';

  // Config State
  const [targetConfigs, setTargetConfigs] = useState<Record<string, ExamTargetConfig>>({});
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(15);
  const [stratify, setStratify] = useState<boolean>(true);

  // Status State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [candidates, setCandidates] = useState<Question[]>([]);
  const [showCollisionWarning, setShowCollisionWarning] = useState<boolean>(false);

  // Load targets
  useEffect(() => {
    async function init() {
      try {
        await initializeDataStore();
        const configs = await loadExamTargets();
        setTargetConfigs(configs);

        // Pre-select all areas by default
        const targetConf = configs[targetParam];
        if (targetConf) {
          setSelectedAreas(targetConf.areas);
        }
      } catch (err) {
        console.error('Failed to load review config:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [targetParam]);

  // Compute available pool
  useEffect(() => {
    if (isLoading || !targetConfigs[targetParam]) return;

    // Filter questions matching target & active selections
    const matched = allQuestions.filter(q => {
      // 1. Target check
      const config = targetConfigs[targetParam];
      if (!config.areas.includes(q.area)) return false;
      const allowedCategories = config.categories[q.area];
      if (!allowedCategories || !allowedCategories.includes(q.category)) return false;

      // 2. Active areas check
      if (selectedAreas.length > 0 && !selectedAreas.includes(q.area)) return false;

      // 3. Active categories check
      if (selectedCategories.length > 0 && !selectedCategories.includes(q.category)) return false;

      // 4. Difficulty check
      if (difficulty !== 'mixed' && q.difficulty !== difficulty) return false;

      return true;
    });

    setCandidates(matched);

    if (matched.length > 0) {
      setQuestionCount(prev => Math.min(prev, matched.length));
    } else {
      setQuestionCount(0);
    }
  }, [selectedAreas, selectedCategories, difficulty, targetConfigs, targetParam, isLoading]);

  const targetConf = targetConfigs[targetParam];

  // Helper labels
  const getAreaLabel = (area: string) => {
    switch (area) {
      case 'cognitive': return 'Cognitivo';
      case 'spanish': return 'Español';
      case 'math': return 'Matemáticas';
      case 'english': return 'Inglés';
      case 'science': return 'Ciencias';
      default: return area;
    }
  };

  const handleToggleArea = (area: string) => {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
      // Clear associated categories
      if (targetConf) {
        const catsToRemove = targetConf.categories[area] || [];
        setSelectedCategories(selectedCategories.filter(c => !catsToRemove.includes(c)));
      }
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  const handleToggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleStartSession = async (bypassCollision = false) => {
    if (session && session.status === 'active' && !bypassCollision) {
      setShowCollisionWarning(true);
      return;
    }

    const config = {
      mode: 'general_review' as const,
      examTarget: targetParam,
      questionCount,
      area: selectedAreas.length === 1 ? selectedAreas[0] : undefined,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      difficulty,
      stratify
    };

    try {
      const newSession = await startNewSession(config);
      navigate(`/session/${newSession.id}`);
    } catch (err: any) {
      alert(err.message || 'No se pudo iniciar la sesión.');
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div className="card">
          <h2>Cargando inventario de repaso...</h2>
        </div>
      </div>
    );
  }

  if (!targetConf) {
    return (
      <div className="container">
        <div className="card error">
          <h2>Objetivo de Examen Inválido</h2>
          <p>El objetivo "{targetParam}" no está configurado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '650px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Repaso General</h1>
        <p style={{ color: 'var(--accent-secondary)' }}>
          Combina temas y prepárate con muestreo balanceado para {targetParam === 'prepatec' ? 'PrepaTec' : 'BUAP'}
        </p>
      </header>

      {showCollisionWarning ? (
        <div className="card" style={{ border: '1px solid var(--error-color)', padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--error-color)', border: 'none', padding: 0 }}>⚠️ Examen Activo Encontrado</h2>
          <p style={{ margin: '1rem 0 2rem 0' }}>
            Tienes una sesión activa sin finalizar. Si inicias una nueva sesión, perderás el progreso del examen anterior.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
            <button
              onClick={() => session && navigate(`/session/${session.id}`)}
              className="btn btn-primary"
              type="button"
            >
              Continuar Examen Anterior
            </button>
            <button
              onClick={() => handleStartSession(true)}
              className="btn btn-secondary"
              style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}
              type="button"
            >
              Descartar y Empezar Nuevo
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Configurar Repaso</h2>

          {/* Area check group */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Áreas a Incluir</label>
            <div className="selector-grid" role="group" aria-label="Selección de áreas">
              {targetConf.areas.map(area => {
                const isChecked = selectedAreas.includes(area);
                return (
                  <label key={area} className={`selector-card-checkbox ${isChecked ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleArea(area)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    {getAreaLabel(area)}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Category nested check group */}
          {selectedAreas.length > 0 && (
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Categorías (Opcional)</label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.8rem' }}>
                Si no seleccionas ninguna categoría, se incluirán todas las de las áreas seleccionadas.
              </p>
              <div className="selector-grid" role="group" aria-label="Selección de categorías">
                {selectedAreas.flatMap(area => {
                  const cats = targetConf.categories[area] || [];
                  return cats.map(cat => {
                    // Check if category has questions
                    const count = filterQuestions(allQuestions, {
                      examTarget: targetParam,
                      area,
                      categories: [cat]
                    }, targetConfigs).length;

                    if (count === 0) return null;

                    const isChecked = selectedCategories.includes(cat);
                    const label = cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const areaTag = getAreaLabel(area);

                    return (
                      <label key={cat} className={`selector-card-checkbox ${isChecked ? 'selected' : ''}`} style={{ fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(cat)}
                          style={{ marginRight: '0.4rem' }}
                        />
                        <div>
                          <strong>{label}</strong>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>
                            {areaTag} • {count} disp.
                          </span>
                        </div>
                      </label>
                    );
                  });
                })}
              </div>
            </div>
          )}

          {/* Difficulty */}
          <DifficultySelector value={difficulty} onChange={setDifficulty} />

          {/* Stratify check */}
          <div className="form-group" style={{ margin: '1.5rem 0' }}>
            <label className="form-check">
              <input
                type="checkbox"
                checked={stratify}
                onChange={e => setStratify(e.target.checked)}
              />
              Muestreo Estratificado (Balancea preguntas equitativamente entre temas)
            </label>
          </div>

          {/* Question count */}
          {candidates.length > 0 ? (
            <QuestionCountSelector
              value={questionCount}
              maxAvailable={candidates.length}
              onChange={setQuestionCount}
            />
          ) : (
            <div className="validation-bar invalid" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <span>⚠️ No hay preguntas disponibles con las opciones activas. Selecciona al menos una materia.</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary"
              type="button"
              style={{ width: '40%' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => handleStartSession(false)}
              disabled={candidates.length === 0}
              className="btn"
              type="button"
              style={{ flexGrow: 1 }}
            >
              Iniciar Repaso
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewConfig;
