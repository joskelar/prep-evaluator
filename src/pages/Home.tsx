import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [target, setTarget] = useState<string>('prepatec');

  // Load target preference
  useEffect(() => {
    const savedTarget = localStorage.getItem('prep_evaluator_preferred_target');
    if (savedTarget === 'prepatec' || savedTarget === 'buap') {
      setTarget(savedTarget);
    }
  }, []);

  const handleTargetChange = (newTarget: string) => {
    setTarget(newTarget);
    localStorage.setItem('prep_evaluator_preferred_target', newTarget);
  };

  const handleNavigate = (path: string) => {
    navigate(`${path}?target=${target}`);
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800 }}>Simulador de Evaluación</h1>
        <p style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem', marginTop: '0.5rem' }}>
          Prepara tus exámenes de admisión de forma efectiva y a tu propio ritmo
        </p>
      </header>

      {/* Target Selector Tabs */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.2rem' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ textAlign: 'center', marginBottom: '0.8rem', fontWeight: 600 }}>
            ¿Qué examen vas a presentar?
          </label>
          <div className="target-tabs" role="radiogroup" aria-label="Objetivo de examen">
            <button
              type="button"
              role="radio"
              aria-checked={target === 'prepatec'}
              className={`tab-btn ${target === 'prepatec' ? 'active' : ''}`}
              onClick={() => handleTargetChange('prepatec')}
            >
              PrepaTec (PIENSE II)
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={target === 'buap'}
              className={`tab-btn ${target === 'buap' ? 'active' : ''}`}
              onClick={() => handleTargetChange('buap')}
            >
              BUAP (Examen de Admisión)
            </button>
          </div>
        </div>
      </div>

      {/* Main Flows Grid */}
      <div className="flow-grid">
        {/* Flow 1: Practice */}
        <div className="flow-card" onClick={() => handleNavigate('/practice')}>
          <div className="flow-badge">Paso a Paso</div>
          <h2 className="flow-title">Modo Práctica</h2>
          <p className="flow-desc">
            Estudia áreas y categorías específicas. Ideal para reforzar temas complicados y responder sin límite de tiempo.
          </p>
          <button className="btn btn-primary" type="button" style={{ marginTop: 'auto' }}>
            Practicar Temas
          </button>
        </div>

        {/* Flow 2: General Review */}
        <div className="flow-card" onClick={() => handleNavigate('/review')}>
          <div className="flow-badge">Combinado</div>
          <h2 className="flow-title">Repaso General</h2>
          <p className="flow-desc">
            Crea sesiones personalizadas mezclando las materias de tu elección. Mide tu nivel en múltiples temas a la vez.
          </p>
          <button className="btn btn-primary" type="button" style={{ marginTop: 'auto' }}>
            Iniciar Repaso
          </button>
        </div>

        {/* Flow 3: Exam Simulator */}
        <div className="flow-card" onClick={() => handleNavigate('/simulator')}>
          <div className="flow-badge">Simulación Real</div>
          <h2 className="flow-title">Simulador de Examen</h2>
          <p className="flow-desc">
            Ponte a prueba en condiciones reales de examen, con tiempo limitado y distribución de reactivos oficiales.
          </p>
          <button className="btn btn-primary" type="button" style={{ marginTop: 'auto' }}>
            Iniciar Simulacro
          </button>
        </div>

        {/* Flow 4: Study Cards */}
        <div className="flow-card" onClick={() => handleNavigate('/study')}>
          <div className="flow-badge">Teoría Clave</div>
          <h2 className="flow-title">Tarjetas de Estudio</h2>
          <p className="flow-desc">
            Memoriza conceptos clave, fórmulas matemáticas y reglas gramaticales mediante tarjetas interactivas de repaso rápido.
          </p>
          <button className="btn btn-primary" type="button" style={{ marginTop: 'auto' }}>
            Repasar Tarjetas
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
