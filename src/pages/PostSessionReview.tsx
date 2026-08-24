import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SessionResult, Question, Stimulus } from '@/types';
import { loadLatestCompletedResult } from '@/lib/storage/storage';
import { initializeDataStore, getQuestionWithStimulus } from '@/lib/data/loader';
import { StimulusRenderer } from '@/components/question/StimulusRenderer';
import { QuestionAssetRenderer } from '@/components/question/QuestionAssetRenderer';

type ReviewFilter = 'all' | 'correct' | 'incorrect' | 'unanswered' | 'flagged';

export const PostSessionReview: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<SessionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>('all');
  
  // Mobile UI state
  const [showMobileSidebar, setShowMobileSidebar] = useState<boolean>(false);

  // Load results and questions store
  useEffect(() => {
    async function init() {
      try {
        await initializeDataStore();
        if (sessionId) {
          const stored = loadLatestCompletedResult(sessionId);
          setResult(stored);
        }
      } catch (err) {
        console.error('Failed to load review workspace:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div className="card">
          <h2>Cargando espacio de revisión...</h2>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '4rem' }}>
        <div className="card error" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Reporte No Encontrado</h2>
          <p>No se pudo recuperar el reporte de respuestas para esta sesión.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')} type="button">
            Volver a Inicio
          </button>
        </div>
      </div>
    );
  }

  // Filter items while preserving original exam numbering (which is 0-indexed index in result.questionResults)
  const filteredQuestionIndices = result.questionResults
    .map((qr, index) => ({ qr, index }))
    .filter(({ qr }) => {
      if (activeFilter === 'correct') return qr.status === 'correct';
      if (activeFilter === 'incorrect') return qr.status === 'incorrect';
      if (activeFilter === 'unanswered') return qr.status === 'unanswered';
      if (activeFilter === 'flagged') return qr.flagged;
      return true; // 'all'
    })
    .map(({ index }) => index);

  // Bounds check active index
  const activeQuestionIndex = filteredQuestionIndices[currentIndex] !== undefined
    ? filteredQuestionIndices[currentIndex]
    : filteredQuestionIndices[0];

  const hasQuestions = filteredQuestionIndices.length > 0;

  // Retrieve current active question details
  let question: Question | null = null;
  let stimulus: Stimulus | null = null;
  let qrInfo = hasQuestions && result.questionResults[activeQuestionIndex];

  if (qrInfo) {
    const qWithStim = getQuestionWithStimulus(qrInfo.questionId);
    if (qWithStim) {
      question = qWithStim.question;
      stimulus = qWithStim.stimulus || null;
    }
  }

  const letters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="container">
      {/* Review Header */}
      <div className="session-header-row">
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: 0, color: 'var(--text-highlight)' }}>
            Revisión de Respuestas
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            Sesión: {result.mode.toUpperCase()} ({result.examTarget.toUpperCase()}) • {result.correct} correctas de {result.totalQuestions}
          </p>
        </div>
        <div>
          <button
            onClick={() => navigate(`/results/${result.sessionId}`)}
            className="btn btn-secondary btn-sm"
            style={{ width: 'auto', padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}
            type="button"
          >
            ← Volver a Reporte
          </button>
        </div>
      </div>

      {/* Review Filters Toolbar */}
      <div className="filter-bar">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-highlight)', alignSelf: 'center', marginRight: '0.5rem' }}>
          Filtrar por:
        </span>
        <button
          onClick={() => { setActiveFilter('all'); setCurrentIndex(0); }}
          className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          type="button"
        >
          Todas ({result.totalQuestions})
        </button>
        <button
          onClick={() => { setActiveFilter('correct'); setCurrentIndex(0); }}
          className={`filter-btn ${activeFilter === 'correct' ? 'active' : ''}`}
          type="button"
        >
          Correctas ({result.correct})
        </button>
        <button
          onClick={() => { setActiveFilter('incorrect'); setCurrentIndex(0); }}
          className={`filter-btn ${activeFilter === 'incorrect' ? 'active' : ''}`}
          type="button"
        >
          Incorrectas ({result.incorrect})
        </button>
        <button
          onClick={() => { setActiveFilter('unanswered'); setCurrentIndex(0); }}
          className={`filter-btn ${activeFilter === 'unanswered' ? 'active' : ''}`}
          type="button"
        >
          Sin Responder ({result.unanswered})
        </button>
        <button
          onClick={() => { setActiveFilter('flagged'); setCurrentIndex(0); }}
          className={`filter-btn ${activeFilter === 'flagged' ? 'active' : ''}`}
          type="button"
        >
          Marcadas ⚑ ({result.questionResults.filter(q => q.flagged).length})
        </button>
      </div>

      {/* Mobile Sidebar Toggle Button */}
      <button
        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="btn btn-secondary mobile-sidebar-toggle-btn"
        type="button"
      >
        {showMobileSidebar ? '← Volver a la Pregunta' : '≡ Ver Preguntas del Filtro'}
      </button>

      {/* Main Review Workspace Layout */}
      <div className={`session-layout ${showMobileSidebar ? 'mobile-show-sidebar' : ''}`}>
        
        {/* Main Panel */}
        <div>
          {hasQuestions && question && qrInfo ? (
            <div className={`question-wrapper ${stimulus ? 'has-stimulus' : ''}`}>
              
              {/* Stimulus panel (safe copy) */}
              {stimulus && (
                <div className="stimulus-panel-wrapper">
                  <StimulusRenderer stimulus={stimulus} />
                </div>
              )}

              {/* Question panel */}
              <div className="question-panel-wrapper">
                <div className="question-card">
                  <div className="review-question-header">
                    <span className="question-badge">Pregunta {activeQuestionIndex + 1}</span>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {qrInfo.flagged && (
                        <span style={{ color: 'var(--error-color)', fontWeight: 'bold', fontSize: '1rem', marginRight: '0.5rem' }} title="Marcada para revisión">
                          ⚑ Marcada
                        </span>
                      )}

                      <span className={`result-badge ${qrInfo.status}`}>
                        {qrInfo.status === 'correct' ? 'Correcta' : qrInfo.status === 'incorrect' ? 'Incorrecta' : 'Sin responder'}
                      </span>
                    </div>
                  </div>

                  <div className="question-prompt">{question.prompt}</div>

                  {/* Graph Assets */}
                  <QuestionAssetRenderer assets={question.assets} />

                  {/* Options Selection List (Post Session Render) */}
                  <div className="options-container">
                    {question.options.map((opt, idx) => {
                      const isSelected = qrInfo && qrInfo.selectedAnswer === opt.id;
                      const isCorrect = opt.id === question?.correct_answer;

                      let optClass = 'option-row';
                      let letterBadge = letters[idx] || opt.id;

                      if (isCorrect) {
                        optClass += ' correct-choice';
                      } else if (isSelected && !isCorrect) {
                        optClass += ' incorrect-choice';
                      } else if (isSelected) {
                        optClass += ' selected';
                      }

                      return (
                        <div key={opt.id} className={optClass}>
                          <div className="option-letter">{letterBadge}</div>
                          <div className="option-text">{opt.text}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {isCorrect && <span style={{ color: 'var(--success-color)' }}>✓ Correcta</span>}
                            {isSelected && !isCorrect && <span style={{ color: 'var(--error-color)' }}>✗ Seleccionada</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Block */}
                  {question.explanation && (
                    <div className="explanation-card">
                      <div className="explanation-title">Explicación Resolutiva</div>
                      <div className="explanation-text">{question.explanation}</div>
                    </div>
                  )}

                  {/* Navigation controls */}
                  <div className="session-controls-wrapper">
                    <div className="session-controls-left">
                      <button
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="btn btn-secondary"
                        type="button"
                      >
                        ← Anterior
                      </button>
                      <button
                        onClick={() => setCurrentIndex(prev => Math.min(filteredQuestionIndices.length - 1, prev + 1))}
                        disabled={currentIndex === filteredQuestionIndices.length - 1}
                        className="btn btn-primary"
                        type="button"
                      >
                        Siguiente →
                      </button>
                    </div>
                    <div className="session-controls-right">
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Fila: {currentIndex + 1} de {filteredQuestionIndices.length} filtradas
                      </span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <h3>No hay preguntas en este filtro</h3>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                No se encontraron reactivos con el filtro "{activeFilter.toUpperCase()}".
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <div className="navigator-card">
          <h2 className="navigator-title">Navegación de Revisión</h2>
          
          <div className="navigator-grid">
            {result.questionResults.map((qr, idx) => {
              const matchesFilter = filteredQuestionIndices.includes(idx);
              const isCurrent = idx === activeQuestionIndex;

              let btnClass = 'navigator-btn';
              if (isCurrent) btnClass += ' current';
              
              if (qr.status === 'correct') btnClass += ' correct-item';
              else if (qr.status === 'incorrect') btnClass += ' incorrect-item';
              else btnClass += ' unanswered-item';

              if (!matchesFilter) {
                // If it doesn't match, we grey it out / reduce opacity
                btnClass += ' disabled-item';
              }

              return (
                <button
                  key={qr.questionId}
                  onClick={() => {
                    if (matchesFilter) {
                      const filterIdx = filteredQuestionIndices.indexOf(idx);
                      setCurrentIndex(filterIdx);
                      setShowMobileSidebar(false);
                    }
                  }}
                  disabled={!matchesFilter}
                  className={btnClass}
                  style={{ opacity: matchesFilter ? 1 : 0.25, cursor: matchesFilter ? 'pointer' : 'not-allowed' }}
                  title={`Pregunta ${idx + 1} (${qr.status.toUpperCase()})`}
                  aria-label={`Ir a pregunta ${idx + 1}`}
                  type="button"
                >
                  {idx + 1}
                  {qr.flagged && <span className="btn-flag-dot">⚑</span>}
                </button>
              );
            })}
          </div>

          <div className="navigator-legend" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
            <div className="legend-item">
              <span className="legend-badge correct-item" style={{ width: '20px', height: '20px', border: '1px solid var(--success-color)' }}>✓</span>
              <span>Correcta</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge incorrect-item" style={{ width: '20px', height: '20px', border: '1px solid var(--error-color)' }}>✗</span>
              <span>Incorrecta</span>
            </div>
            <div className="legend-item">
              <span className="legend-badge unanswered-item" style={{ width: '20px', height: '20px', border: '1px solid #adb5bd' }}>-</span>
              <span>Sin Responder</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PostSessionReview;
