import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamSession } from '@/context/ExamSessionContext';
import { QuestionNavigator } from '@/components/question/QuestionNavigator';
import { QuestionRenderer } from '@/components/question/QuestionRenderer';
import { SessionControls } from '@/components/question/SessionControls';
import { FinishConfirmation } from '@/components/question/FinishConfirmation';
import { formatRemainingTime } from '@/lib/session/sessionOperations';
import { loadSession } from '@/lib/storage/storage';
import { scoreSession } from '@/lib/scoring/scoring';
import { saveLatestCompletedResult } from '@/lib/storage/storage';
import { allQuestions } from '@/lib/data/loader';

export const StudentSession: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const {
    session,
    progress,
    currentQuestion,
    currentStimulus,
    remainingTime,
    isLoading,
    answerQuestion,
    clearAnswer,
    toggleFlag,
    goToQuestion,
    nextQuestion,
    previousQuestion,
    finishSession,
    startNewSession // used if we reload active from local storage
  } = useExamSession();

  // UI State
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [showMobileNavigator, setShowMobileNavigator] = useState<boolean>(false);
  const [notFound, setNotFound] = useState<boolean>(false);

  // Active session navigation guard
  useEffect(() => {
    if (!session || session.status !== 'active') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '¿Estás seguro de que deseas salir del examen? Tu progreso guardado no se perderá.';
      return e.returnValue;
    };

    const handlePopState = () => {
      const confirmLeave = window.confirm(
        '¿Estás seguro de que deseas salir de la sesión de examen activa?'
      );
      if (!confirmLeave) {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    // Push dummy state to capture back button
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [session?.status]);

  // 1. Passive Recovery & Expiry check
  useEffect(() => {
    if (isLoading) return;

    if (!session || session.id !== sessionId) {
      // Try to recover from localStorage
      const recovered = loadSession(sessionId || '');
      if (recovered) {
        if (recovered.status === 'completed' || recovered.status === 'expired') {
          // Already finished, redirect to results
          navigate(`/results/${sessionId}`, { replace: true });
        } else {
          // Restart context session with recovered parameters
          startNewSession(recovered.config);
        }
      } else {
        setNotFound(true);
      }
    }
  }, [sessionId, session, isLoading, navigate, startNewSession]);

  // 2. Detect session completion/expiration
  useEffect(() => {
    if (session && (session.status === 'completed' || session.status === 'expired')) {
      // Calculate final score
      const result = scoreSession(session, allQuestions);
      saveLatestCompletedResult(result);

      // Route to results
      navigate(`/results/${session.id}`, {
        replace: true,
        state: { expired: session.status === 'expired' }
      });
    }
  }, [session?.status, session, navigate]);

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div className="card">
          <h2>Cargando evaluación...</h2>
        </div>
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="container">
        <div className="card error" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Examen No Encontrado</h2>
          <p style={{ margin: '1rem 0 2rem 0' }}>
            La sesión de examen especificada no existe o no pudo ser recuperada.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')} type="button">
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const currentQuestionId = session.questionIds[session.currentQuestionIndex];
  const isQuestionFlagged = session.flaggedQuestionIds.includes(currentQuestionId);
  const selectedAnswerOption = session.selectedAnswers[currentQuestionId];

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'practice': return 'Práctica';
      case 'general_review': return 'Repaso';
      case 'simulator': return 'Simulacro';
      default: return mode;
    }
  };

  const handleJumpQuestion = (idx: number) => {
    goToQuestion(idx);
    setShowMobileNavigator(false); // Close mobile drawer
  };

  return (
    <div className="container">
      {/* Active Session Header */}
      <div className="session-header-row">
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: 0, color: 'var(--text-highlight)' }}>
            Examen en Curso: {getModeLabel(session.mode)}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            Objetivo: {session.examTarget.toUpperCase()}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Active Timer Display */}
          {remainingTime !== null && (
            <div className="timer-container" aria-live="polite">
              <span className="timer-label">Límite:</span>
              <span className={`timer-val ${remainingTime < 60000 ? 'warning' : ''}`}>
                {formatRemainingTime(remainingTime, true)}
              </span>
            </div>
          )}

          <button
            onClick={() => setIsConfirmOpen(true)}
            className="btn btn-accent"
            style={{ width: 'auto', padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}
            type="button"
          >
            Entregar Examen
          </button>
        </div>
      </div>

      {/* Mobile Drawer Trigger */}
      <button
        onClick={() => setShowMobileNavigator(!showMobileNavigator)}
        className="btn btn-secondary mobile-sidebar-toggle-btn"
        type="button"
      >
        {showMobileNavigator ? '← Volver a la Pregunta' : '≡ Navegación y Respuestas'}
      </button>

      {/* Main Workspace Layout */}
      <div className={`session-layout ${showMobileNavigator ? 'mobile-show-sidebar' : ''}`}>
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
              <p>Error: No se pudo renderizar el reactivo.</p>
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
            onJumpToQuestion={handleJumpQuestion}
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

export default StudentSession;
