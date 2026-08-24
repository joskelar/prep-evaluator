import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudyCard, ExamTargetConfig } from '@/types';
import { loadExamTargets, initializeDataStore, getStudyCardsByTarget } from '@/lib/data/loader';

export const Study: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Selected exam target from URL parameter or fallback
  const targetParam = searchParams.get('target') || 'prepatec';

  // Config Metadata
  const [targetConfigs, setTargetConfigs] = useState<Record<string, ExamTargetConfig>>({});
  const [targetCards, setTargetCards] = useState<StudyCard[]>([]);

  // Selection state
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');

  // Execution state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCards, setActiveCards] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isStudying, setIsStudying] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    async function init() {
      try {
        await initializeDataStore();
        const configs = await loadExamTargets();
        setTargetConfigs(configs);

        // Load cards matching target
        const cards = await getStudyCardsByTarget(targetParam);
        setTargetCards(cards);

        // Pre-select first valid area
        const targetConf = configs[targetParam];
        if (targetConf && targetConf.areas.length > 0) {
          // Find first area that has at least one card
          const firstAreaWithCards = targetConf.areas.find(area => 
            cards.some(c => c.area === area)
          );
          setSelectedArea(firstAreaWithCards || targetConf.areas[0]);
        }
      } catch (err) {
        console.error('Failed to load study cards workspace:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [targetParam]);

  // Compute active category and subcategory resets
  useEffect(() => {
    setSelectedCategory('');
    setSelectedSubcategory('');
  }, [selectedArea]);

  useEffect(() => {
    setSelectedSubcategory('');
  }, [selectedCategory]);

  // Compute card candidates matching filters
  const candidates = targetCards.filter(card => {
    if (selectedArea && card.area !== selectedArea) return false;
    if (selectedCategory && card.category !== selectedCategory) return false;
    if (selectedSubcategory && card.subcategory !== selectedSubcategory) return false;
    return true;
  });

  const targetConf = targetConfigs[targetParam];

  // Areas with positive card count
  const availableAreas = (targetConf?.areas || []).filter(area => 
    targetCards.some(card => card.area === area)
  );

  // Categories under selected area with positive card count
  const availableCategories = (targetConf && selectedArea && targetConf.categories[selectedArea] || []).filter(cat =>
    targetCards.some(card => card.area === selectedArea && card.category === cat)
  );

  // Unique subcategories for selected area & category
  const availableSubcategories = Array.from(
    new Set(
      targetCards
        .filter(card => card.area === selectedArea && card.category === selectedCategory && card.subcategory)
        .map(card => card.subcategory as string)
    )
  );

  // Start study session
  const handleStartStudy = () => {
    if (candidates.length === 0) return;
    setActiveCards([...candidates]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsStudying(true);
  };

  // Shuffle active cards
  const handleShuffle = () => {
    if (activeCards.length <= 1) return;
    
    // Fisher-Yates shuffle implementation
    const shuffled = [...activeCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Ensure we don't end up with the exact same order if possible
    let isSameOrder = true;
    for (let i = 0; i < shuffled.length; i++) {
      if (shuffled[i].id !== activeCards[i].id) {
        isSameOrder = false;
        break;
      }
    }

    if (isSameOrder && shuffled.length > 1) {
      // Swap first two elements to guarantee order change
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }

    setActiveCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isStudying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement).tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT' || targetTag === 'BUTTON') {
        return; // Avoid intercepting elements with their own behaviors
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousCard();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus container to capture keyboard events immediately
    if (containerRef.current) {
      containerRef.current.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStudying, currentIndex, activeCards.length]);

  const handleNextCard = () => {
    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePreviousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

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

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i} style={{ display: 'block', marginBottom: '0.4rem' }}>
        {line}
      </span>
    ));
  };

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div className="card">
          <h2>Cargando fichas de estudio...</h2>
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
          <button className="btn btn-secondary" onClick={() => navigate('/')} type="button">
            Regresar a Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '650px' }} ref={containerRef} tabIndex={-1}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Tarjetas de Estudio</h1>
        <p style={{ color: 'var(--accent-secondary)' }}>
          Repasa conceptos teóricos clave para {targetParam === 'prepatec' ? 'PrepaTec' : 'BUAP'}
        </p>
      </header>

      {!isStudying ? (
        // Configuration Panel
        <div className="card">
          <h2>Configuración de Tarjetas</h2>

          {/* Target selection */}
          <div className="form-group">
            <label htmlFor="target-card-select" className="form-label" style={{ fontWeight: 600 }}>
              Objetivo de Examen
            </label>
            <select
              id="target-card-select"
              value={targetParam}
              onChange={e => navigate(`/study?target=${e.target.value}`)}
              className="form-control"
            >
              <option value="prepatec">PrepaTec (PPAA)</option>
              <option value="buap">BUAP (EGA-I)</option>
            </select>
          </div>

          {/* Area Selector */}
          <div className="form-group">
            <label htmlFor="area-card-select" className="form-label" style={{ fontWeight: 600 }}>
              Materia / Área
            </label>
            <select
              id="area-card-select"
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="form-control"
            >
              {availableAreas.map(area => (
                <option key={area} value={area}>
                  {getAreaLabel(area)} ({targetCards.filter(c => c.area === area).length} fichas)
                </option>
              ))}
              {availableAreas.length === 0 && (
                <option value="">No hay materias con tarjetas disponibles</option>
              )}
            </select>
          </div>

          {/* Category Selector */}
          {availableCategories.length > 0 && (
            <div className="form-group">
              <label htmlFor="category-card-select" className="form-label" style={{ fontWeight: 600 }}>
                Tema / Categoría
              </label>
              <select
                id="category-card-select"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="form-control"
              >
                <option value="">Todos los temas ({targetCards.filter(c => c.area === selectedArea).length} fichas)</option>
                {availableCategories.map(cat => {
                  const count = targetCards.filter(c => c.area === selectedArea && c.category === cat).length;
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

          {/* Subcategory Selector */}
          {selectedCategory && availableSubcategories.length > 0 && (
            <div className="form-group">
              <label htmlFor="subcat-card-select" className="form-label" style={{ fontWeight: 600 }}>
                Subtema (Opcional)
              </label>
              <select
                id="subcat-card-select"
                value={selectedSubcategory}
                onChange={e => setSelectedSubcategory(e.target.value)}
                className="form-control"
              >
                <option value="">Todos los subtemas</option>
                {availableSubcategories.map(sub => {
                  const count = targetCards.filter(c => c.area === selectedArea && c.category === selectedCategory && c.subcategory === sub).length;
                  const label = sub.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <option key={sub} value={sub}>
                      {label} ({count} disponibles)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Candidates validation & button */}
          <div style={{ marginTop: '2rem' }}>
            <div className="validation-bar valid" style={{ marginBottom: '1.5rem', background: 'rgba(102, 252, 241, 0.05)', color: 'var(--text-highlight)' }}>
              <span>📝 Se encontraron <strong>{candidates.length}</strong> tarjetas listas para estudiar.</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => navigate('/')}
                className="btn btn-secondary"
                type="button"
                style={{ width: '40%' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleStartStudy}
                disabled={candidates.length === 0}
                className="btn"
                type="button"
                style={{ flexGrow: 1 }}
              >
                Comenzar Repaso
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Active Study Session Panel
        <div>
          {/* Card Meta Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
              {getAreaLabel(activeCards[currentIndex].area).toUpperCase()} • {activeCards[currentIndex].category.replace(/-/g, ' ').toUpperCase()}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-highlight)', fontWeight: 'bold' }}>
              Ficha {currentIndex + 1} de {activeCards.length}
            </span>
          </div>

          {/* Interactive Flip Card Card */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className={`study-card-flip-container ${isFlipped ? 'flipped' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Tarjeta: ${activeCards[currentIndex].title}. Presiona Enter o Espacio para voltear.`}
            onKeyDown={e => {
              if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                setIsFlipped(!isFlipped);
              }
            }}
          >
            <div className="study-card-inner">
              {/* Front side */}
              <div className="study-card-front">
                <div className="study-card-header">
                  <h3>{activeCards[currentIndex].title}</h3>
                  <span className="card-side-tag">PREGUNTA / CONCEPTO</span>
                </div>
                <div className="study-card-body">
                  <p className="study-card-text font-large">
                    {formatText(activeCards[currentIndex].front)}
                  </p>
                </div>
                <div className="study-card-footer">
                  <span>Haz clic o presiona <strong>Espacio</strong> para revelar la respuesta</span>
                </div>
              </div>

              {/* Back side */}
              <div className="study-card-back">
                <div className="study-card-header">
                  <h3>{activeCards[currentIndex].title}</h3>
                  <span className="card-side-tag correct">EXPLICACIÓN / RESPUESTA</span>
                </div>
                <div className="study-card-body">
                  <p className="study-card-text">
                    {formatText(activeCards[currentIndex].back)}
                  </p>
                  {activeCards[currentIndex].note && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', fontSize: '0.85rem', color: 'var(--accent-secondary)' }}>
                      <strong>Nota:</strong> {activeCards[currentIndex].note}
                    </div>
                  )}
                </div>
                <div className="study-card-footer">
                  <span>Haz clic o presiona <strong>Espacio</strong> para volver a ver la pregunta</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Navigation & controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handlePreviousCard}
                disabled={currentIndex === 0}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                type="button"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="btn btn-accent"
                style={{ flex: 1.2 }}
                type="button"
              >
                Voltear Tarjeta
              </button>
              <button
                onClick={handleNextCard}
                disabled={currentIndex === activeCards.length - 1}
                className="btn btn-primary"
                style={{ flex: 1 }}
                type="button"
              >
                Siguiente →
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                onClick={handleShuffle}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                type="button"
              >
                🔀 Mezclar Fichas
              </button>
              <button
                onClick={() => setIsStudying(false)}
                className="btn btn-secondary"
                style={{ flex: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                type="button"
              >
                ⚙️ Cambiar Filtros
              </button>
            </div>

            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary"
              style={{ marginTop: '1.5rem', width: '100%', borderColor: 'var(--error-color)', color: 'var(--error-color)' }}
              type="button"
            >
              Terminar Sesión de Estudio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Study;
