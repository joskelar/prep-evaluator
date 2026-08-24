import React, { createContext, useContext, useState, useEffect } from 'react';
import { Question, Stimulus, ExamSession, SessionConfig, SessionProgress } from '@/types';
import {
  initializeDataStore,
  getQuestionWithStimulus
} from '@/lib/data/loader';
import {
  createSession as apiCreateSession,
  selectAnswer as apiSelectAnswer,
  clearAnswer as apiClearAnswer,
  toggleFlag as apiToggleFlag,
  goToQuestion as apiGoToQuestion,
  goNext as apiGoNext,
  goPrevious as apiGoPrevious,
  completeSession as apiCompleteSession,
  getSessionProgress,
  checkSessionExpiration
} from '@/lib/session/sessionOperations';
import {
  saveSession,
  loadActiveSession,
  deleteSession
} from '@/lib/storage/storage';

interface ExamSessionContextType {
  session: ExamSession | null;
  progress: SessionProgress | null;
  currentQuestion: Question | null;
  currentStimulus: Stimulus | null;
  remainingTime: number | null;
  isLoading: boolean;
  startNewSession: (config: SessionConfig) => Promise<ExamSession>;
  answerQuestion: (questionId: string, optionId: string) => void;
  clearAnswer: (questionId: string) => void;
  toggleFlag: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  finishSession: () => void;
  resetSession: () => void;
}

const ExamSessionContext = createContext<ExamSessionContextType | undefined>(undefined);

export const ExamSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);

  // Initialize data store and active session on mount
  useEffect(() => {
    async function init() {
      try {
        await initializeDataStore();
        const active = loadActiveSession();
        if (active) {
          setSession(active);
        }
      } catch (err: any) {
        console.error('Failed to initialize session store:', err);
        setInitError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Sync current question and stimulus
  useEffect(() => {
    if (!session || session.questionIds.length === 0) {
      setCurrentQuestion(null);
      setCurrentStimulus(null);
      return;
    }

    const qId = session.questionIds[session.currentQuestionIndex];
    const qWithStim = getQuestionWithStimulus(qId);
    if (qWithStim) {
      setCurrentQuestion(qWithStim.question);
      setCurrentStimulus(qWithStim.stimulus || null);
    } else {
      setCurrentQuestion(null);
      setCurrentStimulus(null);
    }
  }, [session?.currentQuestionIndex, session?.questionIds]);

  // Sync Timer interval for active session
  useEffect(() => {
    if (!session || session.status !== 'active' || !session.expirationTime) {
      setRemainingTime(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, session.expirationTime! - now);
      setRemainingTime(remaining);

      if (remaining <= 0) {
        // Handle expiration
        setSession(prev => {
          if (prev && prev.status === 'active') {
            const updated = checkSessionExpiration(prev, now);
            saveSession(updated);
            return updated;
          }
          return prev;
        });
      }
    };

    updateTimer(); // initial tick
    const timerId = setInterval(updateTimer, 1000);

    return () => clearInterval(timerId);
  }, [session?.expirationTime, session?.status]);

  // Derived progress
  const progress = session ? getSessionProgress(session) : null;

  // Actions
  const startNewSession = async (config: SessionConfig): Promise<ExamSession> => {
    setIsLoading(true);
    try {
      const newSession = await apiCreateSession(config);
      saveSession(newSession);
      setSession(newSession);
      return newSession;
    } catch (err) {
      console.error('Error starting new session:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const answerQuestion = (questionId: string, optionId: string) => {
    setSession(prev => {
      if (!prev) return null;
      const updated = apiSelectAnswer(prev, questionId, optionId);
      saveSession(updated);
      return updated;
    });
  };

  const clearAnswer = (questionId: string) => {
    setSession(prev => {
      if (!prev) return null;
      const updated = apiClearAnswer(prev, questionId);
      saveSession(updated);
      return updated;
    });
  };

  const toggleFlag = (questionId: string) => {
    setSession(prev => {
      if (!prev) return null;
      const updated = apiToggleFlag(prev, questionId);
      saveSession(updated);
      return updated;
    });
  };

  const goToQuestion = (index: number) => {
    setSession(prev => {
      if (!prev) return null;
      const updated = apiGoToQuestion(prev, index);
      saveSession(updated);
      return updated;
    });
  };

  const nextQuestion = () => {
    setSession(prev => {
      if (!prev) return null;
      const updated = apiGoNext(prev);
      saveSession(updated);
      return updated;
    });
  };

  const previousQuestion = () => {
    setSession(prev => {
      if (!prev) return null;
      const updated = apiGoPrevious(prev);
      saveSession(updated);
      return updated;
    });
  };

  const finishSession = () => {
    setSession(prev => {
      if (!prev) return null;
      const updated = apiCompleteSession(prev);
      saveSession(updated);
      return updated;
    });
  };

  const resetSession = () => {
    if (session) {
      deleteSession(session.id);
    }
    setSession(null);
    setCurrentQuestion(null);
    setCurrentStimulus(null);
    setRemainingTime(null);
  };

  if (initError) {
    return (
      <div className="container" style={{ maxWidth: '550px', marginTop: '6rem' }}>
        <div className="card error" style={{ textAlign: 'center', padding: '3rem' }}>
          <h1 style={{ fontSize: '2rem', color: 'var(--error-color)', borderBottom: 'none', padding: 0 }}>
            Error de Inicialización
          </h1>
          <p style={{ margin: '1.5rem 0 2rem 0', fontSize: '1.05rem', lineHeight: '1.6' }}>
            La base de datos de preguntas y estímulos no pudo inicializarse correctamente.
          </p>
          <div style={{ background: 'rgba(255,107,107,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'left', marginBottom: '2rem', fontSize: '0.9rem', border: '1px solid var(--error-color)', fontFamily: 'monospace', overflowX: 'auto' }}>
            {initError.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            type="button"
            style={{ width: '100%' }}
          >
            Reintentar Cargar
          </button>
        </div>
      </div>
    );
  }

  return (
    <ExamSessionContext.Provider
      value={{
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
      }}
    >
      {children}
    </ExamSessionContext.Provider>
  );
};

export const useExamSession = () => {
  const context = useContext(ExamSessionContext);
  if (context === undefined) {
    throw new Error('useExamSession must be used within an ExamSessionProvider');
  }
  return context;
};
