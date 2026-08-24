import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useExamSession } from '@/context/ExamSessionContext';
import { ExamTargetConfig, Question } from '@/types';
import { loadExamTargets, initializeDataStore, allQuestions } from '@/lib/data/loader';
import { filterQuestions } from '@/lib/engine/filter';
import {
  QuestionCountSelector,
  DurationSelector
} from '@/components/config/ConfigSelectors';

export const SimulatorConfig: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startNewSession, session } = useExamSession();

  const targetParam = searchParams.get('target') || 'prepatec';

  // Config State
  const [targetConfigs, setTargetConfigs] = useState<Record<string, ExamTargetConfig>>({});
  const [questionCount, setQuestionCount] = useState<number>(30);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);

  // Status State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [candidates, setCandidates] = useState<Question[]>([]);
  const [showCollisionWarning, setShowCollisionWarning] = useState<boolean>(false);

  // Load target config and set simulator defaults
  useEffect(() => {
    async function init() {
      try {
        await initializeDataStore();
        const configs = await loadExamTargets();
        setTargetConfigs(configs);

        const targetConf = configs[targetParam];
        if (targetConf?.simulatorDefaults) {
          setQuestionCount(targetConf.simulatorDefaults.questionCount);
          setDurationMinutes(targetConf.simulatorDefaults.durationMinutes);
        }
      } catch (err) {
        console.error('Failed to load simulator configs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [targetParam]);

  // Compute available pool for target
  useEffect(() => {
    if (isLoading || !targetConfigs[targetParam]) return;

    // Filter questions matching target
    const matched = filterQuestions(allQuestions, { examTarget: targetParam }, targetConfigs);
    setCandidates(matched);
  }, [targetConfigs, targetParam, isLoading]);

  const targetConf = targetConfigs[targetParam];

  const handleStartSession = async (bypassCollision = false) => {
    if (session && session.status === 'active' && !bypassCollision) {
      setShowCollisionWarning(true);
      return;
    }

    const config = {
      mode: 'simulator' as const,
      examTarget: targetParam,
      questionCount,
      difficulty: 'mixed' as const, // Simulator is always balanced mixed difficulty
      stratify: true, // Always balanced sampling for simulators
      durationMinutes
    };

    try {
      const newSession = await startNewSession(config);
      navigate(`/session/${newSession.id}`);
    } catch (err: any) {
      alert(err.message || 'No se pudo iniciar el simulador.');
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div className="card">
          <h2>Cargando simulador...</h2>
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
    <div className="container" style={{ maxWidth: '600px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Simulador de Examen</h1>
        <p style={{ color: 'var(--accent-secondary)' }}>
          Ponte a prueba bajo condiciones oficiales de tiempo y reactivos para {targetParam === 'prepatec' ? 'PrepaTec' : 'BUAP'}
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
          <h2>Configurar Simulacro</h2>

          <div style={{ background: 'rgba(102, 252, 241, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--card-border)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>
              ⏱️ <strong>Instrucciones:</strong> El simulador bloquea las respuestas correctas hasta que entregues. El examen se guardará de forma automática en cuanto expire el temporizador. Puedes navegar libremente y cambiar tus respuestas mientras el examen esté activo.
            </p>
          </div>

          {/* Question Count Selector */}
          {candidates.length > 0 ? (
            <QuestionCountSelector
              value={questionCount}
              maxAvailable={candidates.length}
              onChange={setQuestionCount}
            />
          ) : (
            <div className="validation-bar invalid">
              <span>⚠️ No hay preguntas cargadas en la base de datos para este examen.</span>
            </div>
          )}

          {/* Duration Selector */}
          <DurationSelector
            hasDuration={true}
            onToggleDuration={() => {}} // Forced enabled by Simulator config
            value={durationMinutes}
            onChange={setDurationMinutes}
            disabled={true} // Strict, always timed
          />

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
              Comenzar Simulador
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulatorConfig;
