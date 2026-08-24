import React, { useState } from 'react';
import { useExamSession } from '@/context/ExamSessionContext';
import { SessionConfig, SessionMode, Difficulty } from '@/types';
import { QuestionNavigator } from '@/components/question/QuestionNavigator';
import { QuestionRenderer } from '@/components/question/QuestionRenderer';
import { SessionControls } from '@/components/question/SessionControls';
import { FinishConfirmation } from '@/components/question/FinishConfirmation';
import { formatRemainingTime } from '@/lib/session/sessionOperations';

export const DevSession: React.FC = () => {
  const {
    session,
    progress,
    currentQuestion,
    currentStimulus,
    remainingTime,
    isLoading,
    startNewSession,
    answerQuestion,
    clearAnswer,
    toggleFlag,
    goToQuestion,
    nextQuestion,
    previousQuestion,
    finishSession,
    resetSession
  } = useExamSession();

  // Configuration Form State
  const [mode, setMode] = useState<SessionMode>('practice');
  const [examTarget, setExamTarget] = useState<string>('prepatec');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [stratify, setStratify] = useState<boolean>(true);
  const [hasDuration, setHasDuration] = useState<boolean>(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [seedStr, setSeedStr] = useState<string>('');
  
  // UI State
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);

    const config: SessionConfig = {
      mode,
      examTarget,
      questionCount,
      area: selectedArea || undefined,
      difficulty,
      stratify,
      durationMinutes: hasDuration ? durationMinutes : undefined,
      seed: seedStr.trim() ? parseInt(seedStr.trim(), 10) : undefined
    };

    try {
      await startNewSession(config);
    } catch (err: any) {
      setConfigError(err.message || 'No se pudo iniciar la sesión.');
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div className="card">
          <h2>Cargando Motor de Sesión...</h2>
          <p>Por favor espera mientras se inicializan los bancos de preguntas.</p>
        </div>
      </div>
    );
  }

  // 1. Render Configuration Form (No active session)
  if (!session) {
    return (
      <div className="container" style={{ maxWidth: '650px' }}>
        <header>
          <h1>Simulador de Examen - Configuración</h1>
          <p>Espacio de desarrollo y pruebas para el Hito 2</p>
        </header>

        <form onSubmit={handleStartSession} className="card">
          <h2>Configurar Nueva Sesión</h2>
          
          {configError && (
            <div className="validation-bar invalid" style={{ marginBottom: '1.5rem' }}>
              <span>⚠️ {configError}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="mode">Modo de Sesión</label>
            <select
              id="mode"
              value={mode}
              onChange={e => setMode(e.target.value as SessionMode)}
              className="form-control"
            >
              <option value="practice">Práctica (Sin temporizador por defecto)</option>
              <option value="general_review">Repaso General</option>
              <option value="simulator">Simulador de Examen (Temporizador estricto)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="examTarget">Objetivo de Examen</label>
            <select
              id="examTarget"
              value={examTarget}
              onChange={e => setExamTarget(e.target.value)}
              className="form-control"
            >
              <option value="prepatec">Prepatec (PIENSE II)</option>
              <option value="buap">BUAP (Examen de Admisión)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="area">Área Específica (Opcional)</label>
            <select
              id="area"
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="form-control"
            >
              <option value="">Todas las áreas del examen</option>
              <option value="cognitive">Cognitivo / Habilidades</option>
              <option value="spanish">Español / Lengua</option>
              <option value="math">Matemáticas</option>
              <option value="english">Inglés</option>
              {examTarget === 'buap' && <option value="science">Ciencias Naturales</option>}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="difficulty">Dificultad</label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as Difficulty | 'mixed')}
              className="form-control"
            >
              <option value="mixed">Mixta (Equilibrada)</option>
              <option value="easy">Fácil</option>
              <option value="medium">Media</option>
              <option value="hard">Difícil</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="questionCount">Cantidad de Preguntas</label>
            <input
              id="questionCount"
              type="number"
              min={1}
              max={100}
              value={questionCount}
              onChange={e => setQuestionCount(parseInt(e.target.value, 10) || 10)}
              className="form-control"
            />
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <label className="form-check">
              <input
                type="checkbox"
                checked={stratify}
                onChange={e => setStratify(e.target.checked)}
              />
              Muestreo Estratificado (Balanceado)
            </label>
            
            <label className="form-check">
              <input
                type="checkbox"
                checked={hasDuration}
                onChange={e => setHasDuration(e.target.checked)}
              />
              Con Límite de Tiempo
            </label>
          </div>

          {hasDuration && (
            <div className="form-group">
              <label htmlFor="durationMinutes">Duración (minutos)</label>
              <input
                id="durationMinutes"
                type="number"
                min={1}
                max={180}
                value={durationMinutes}
                onChange={e => setDurationMinutes(parseInt(e.target.value, 10) || 15)}
                className="form-control"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="seed">Semilla Pseudo-Aleatoria (Opcional)</label>
            <input
              id="seed"
              type="text"
              placeholder="Ej. 12345"
              value={seedStr}
              onChange={e => setSeedStr(e.target.value)}
              className="form-control"
            />
          </div>

          <button type="submit" className="btn" style={{ marginTop: '1rem' }}>
            Iniciar Sesión
          </button>
        </form>
      </div>
    );
  }

  // 2. Render Completed/Expired Screen
  const isFinished = session.status === 'completed' || session.status === 'expired';
  if (isFinished) {
    return (
      <div className="container" style={{ maxWidth: '650px' }}>
        <header>
          <h1>Sesión Concluida</h1>
          <p>
            {session.status === 'expired' 
              ? '⌛ El tiempo límite ha expirado. Tu examen fue enviado automáticamente.'
              : '✓ Has completado y entregado el examen exitosamente.'}
          </p>
        </header>

        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <h2>Resumen de Respuestas</h2>
          <p style={{ color: 'var(--accent-secondary)', marginBottom: '2rem' }}>
            Las respuestas se guardaron y el examen está cerrado (las modificaciones están deshabilitadas).
          </p>

          {progress && (
            <div className="modal-summary-grid" style={{ marginBottom: '2.5rem' }}>
              <div className="summary-card">
                <span className="summary-num">{progress.totalQuestions}</span>
                <span className="summary-lbl">Preguntas</span>
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
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={resetSession}
              className="btn btn-primary"
              type="button"
            >
              Nueva Sesión (Configuración)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Active Exam UI
  const currentQuestionId = session.questionIds[session.currentQuestionIndex];
  const isQuestionFlagged = session.flaggedQuestionIds.includes(currentQuestionId);
  const selectedAnswerOption = session.selectedAnswers[currentQuestionId];

  return (
    <div className="container">
      {/* Active Session Header */}
      <div className="session-header-row">
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-highlight)' }}>
            Workspace de Evaluación
          </h1>
          <div className="header-meta" style={{ marginTop: '0.4rem' }}>
            <span className="meta-pill mode">Modo: {session.mode.toUpperCase()}</span>
            <span className="meta-pill">Target: {session.examTarget.toUpperCase()}</span>
            <span className="meta-pill">ID: {session.id.substring(0, 8)}...</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Active Timer Display */}
          {remainingTime !== null && (
            <div className="timer-container" aria-live="polite">
              <span className="timer-label">Tiempo Restante:</span>
              <span className={`timer-val ${remainingTime < 60000 ? 'warning' : ''}`}>
                {formatRemainingTime(remainingTime, true)}
              </span>
            </div>
          )}

          <button
            onClick={resetSession}
            className="btn btn-secondary btn-sm"
            style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            type="button"
          >
            Resetear Sesión
          </button>
        </div>
      </div>

      {session.warnings && session.warnings.length > 0 && (
        <div className="warnings-box" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
          {session.warnings.map((w, idx) => (
            <div key={idx}>⚠️ {w}</div>
          ))}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="session-layout">
        {/* Question Panel */}
        <div>
          {currentQuestion ? (
            <QuestionRenderer
              question={currentQuestion}
              questionNumber={session.currentQuestionIndex + 1}
              selectedOptionId={selectedAnswerOption}
              onSelectOption={optId => answerQuestion(currentQuestionId, optId)}
              onClearAnswer={() => clearAnswer(currentQuestionId)}
              isFlagged={isQuestionFlagged}
              onToggleFlag={() => toggleFlag(currentQuestionId)}
              stimulus={currentStimulus || undefined}
            />
          ) : (
            <div className="card">
              <p>Error: No se pudo cargar la pregunta actual.</p>
            </div>
          )}

          {/* Session Footer Controls */}
          <SessionControls
            onPrevious={previousQuestion}
            onNext={nextQuestion}
            onFinish={() => setIsConfirmOpen(true)}
            onToggleFlag={() => toggleFlag(currentQuestionId)}
            onClearAnswer={() => clearAnswer(currentQuestionId)}
            hasPrevious={session.currentQuestionIndex > 0}
            hasNext={session.currentQuestionIndex < session.questionIds.length - 1}
            isFlagged={isQuestionFlagged}
            hasSelectedAnswer={!!selectedAnswerOption}
          />
        </div>

        {/* Sidebar Navigator */}
        <div>
          <QuestionNavigator
            session={session}
            onJumpToQuestion={goToQuestion}
          />
        </div>
      </div>

      {/* Finish Confirmation Dialog */}
      {progress && (
        <FinishConfirmation
          isOpen={isConfirmOpen}
          progress={progress}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            finishSession();
          }}
        />
      )}
    </div>
  );
};

export default DevSession;
