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

export const PracticeConfig: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startNewSession, session } = useExamSession();

  // URL Target or fallback
  const targetParam = searchParams.get('target') || 'prepatec';

  // Config State
  const [targetConfigs, setTargetConfigs] = useState<Record<string, ExamTargetConfig>>({});
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Status State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [candidates, setCandidates] = useState<Question[]>([]);
  const [showCollisionWarning, setShowCollisionWarning] = useState<boolean>(false);

  // Load targets & questions
  useEffect(() => {
    async function init() {
      try {
        await initializeDataStore();
        const configs = await loadExamTargets();
        setTargetConfigs(configs);

        // Default area selection
        const targetConf = configs[targetParam];
        if (targetConf && targetConf.areas.length > 0) {
          setSelectedArea(targetConf.areas[0]);
        }
      } catch (err) {
        console.error('Failed to load practice config metadata:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [targetParam]);

  // Update dynamic question inventory list
  useEffect(() => {
    if (isLoading || !targetConfigs[targetParam]) return;

    const currentFilter = {
      examTarget: targetParam,
      area: selectedArea || undefined,
      categories: selectedCategory ? [selectedCategory] : undefined,
      difficulty: difficulty === 'mixed' ? undefined : difficulty
    };

    const matched = filterQuestions(allQuestions, currentFilter, targetConfigs);
    setCandidates(matched);
    
    // Bounds check count
    if (matched.length > 0) {
      setQuestionCount(prev => Math.min(prev, matched.length));
    } else {
      setQuestionCount(0);
    }
  }, [selectedArea, selectedCategory, difficulty, targetConfigs, targetParam, isLoading]);

  const targetConf = targetConfigs[targetParam];
  const categoriesList = (targetConf && selectedArea && targetConf.categories[selectedArea]) || [];

  const handleStartSession = async (bypassCollision = false) => {
    if (session && session.status === 'active' && !bypassCollision) {
      setShowCollisionWarning(true);
      return;
    }

    const config = {
      mode: 'practice' as const,
      examTarget: targetParam,
      questionCount,
      area: selectedArea || undefined,
      categories: selectedCategory ? [selectedCategory] : undefined,
      difficulty,
      stratify: false // Practice usually focuses on a specific category
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
          <h2>Cargando inventario de práctica...</h2>
        </div>
      </div>
    );
  }

  if (!targetConf) {
    return (
      <div className="container">
        <div className="card error">
          <h2>Objetivo de Examen Inválido</h2>
          <p>El objetivo "{targetParam}" no está configurado en el sistema.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/')} type="button">
            Regresar a Inicio
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Modo Práctica</h1>
        <p style={{ color: 'var(--accent-secondary)' }}>
          Personaliza tu sesión de estudio para {targetParam === 'prepatec' ? 'PrepaTec' : 'BUAP'}
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
          <h2>Configuración de Práctica</h2>

          {/* Area Selector */}
          <div className="form-group">
            <label htmlFor="area-select" className="form-label" style={{ fontWeight: 600 }}>
              Área de Estudio
            </label>
            <select
              id="area-select"
              value={selectedArea}
              onChange={e => {
                setSelectedArea(e.target.value);
                setSelectedCategory(''); // Reset category
              }}
              className="form-control"
            >
              {targetConf.areas.map(area => (
                <option key={area} value={area}>
                  {getAreaLabel(area)}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          {categoriesList.length > 0 && (
            <div className="form-group">
              <label htmlFor="category-select" className="form-label" style={{ fontWeight: 600 }}>
                Categoría Específica
              </label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="form-control"
              >
                <option value="">Todas las categorías de esta área</option>
                {categoriesList.map(cat => {
                  // Only count questions matching target + area + category
                  const count = filterQuestions(allQuestions, {
                    examTarget: targetParam,
                    area: selectedArea,
                    categories: [cat]
                  }, targetConfigs).length;

                  if (count === 0) return null; // Hide empty categories

                  const label = cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <option key={cat} value={cat}>
                      {label} ({count} disponibles)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Difficulty Selector */}
          <DifficultySelector value={difficulty} onChange={setDifficulty} />

          {/* Question Count Selector */}
          {candidates.length > 0 ? (
            <QuestionCountSelector
              value={questionCount}
              maxAvailable={candidates.length}
              onChange={setQuestionCount}
            />
          ) : (
            <div className="validation-bar invalid" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <span>⚠️ No hay preguntas disponibles para los filtros seleccionados.</span>
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
              Iniciar Práctica
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeConfig;
