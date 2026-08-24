import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SessionResult } from '@/types';
import { loadLatestCompletedResult } from '@/lib/storage/storage';

export const Results: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [result, setResult] = useState<SessionResult | null>(null);
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);

  // Load results from storage
  useEffect(() => {
    if (sessionId) {
      const stored = loadLatestCompletedResult(sessionId);
      setResult(stored);
    }

    // Check if navigated due to timer expiration
    if (location.state && (location.state as any).expired) {
      setIsTimeExpired(true);
    }
  }, [sessionId, location]);

  if (!result) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '4rem' }}>
        <div className="card error" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Resultados No Encontrados</h2>
          <p style={{ margin: '1rem 0 2rem 0' }}>
            No se pudo recuperar el reporte de resultados para esta sesión.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')} type="button">
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const getModeName = (mode: string) => {
    switch (mode) {
      case 'practice': return 'Práctica';
      case 'general_review': return 'Repaso General';
      case 'simulator': return 'Simulador de Examen';
      default: return mode;
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

  const getCategoryLabel = (cat: string) => {
    return cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Determine breakdown display order
  // Practice prioritizes category level performance. General Review & Simulator show Area first, Category second.
  const isPractice = result.mode === 'practice';

  const renderBreakdownSection = (type: 'area' | 'category') => {
    const data = type === 'area' ? result.areaBreakdowns : result.categoryBreakdowns;
    const title = type === 'area' ? 'Rendimiento por Área' : 'Rendimiento por Categoría';

    return (
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-highlight)', borderLeft: '3px solid var(--accent-primary)', paddingLeft: '0.5rem', marginBottom: '1rem' }}>
          {title}
        </h3>
        <div className="results-table-container">
          <table>
            <thead>
              <tr>
                <th>{type === 'area' ? 'Área' : 'Categoría'}</th>
                <th>Correctas</th>
                <th>Incorrectas</th>
                <th>Sin Responder</th>
                <th>Rendimiento</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(data).map(key => {
                const b = data[key];
                const label = type === 'area' ? getAreaLabel(key) : getCategoryLabel(key);
                return (
                  <tr key={key}>
                    <td style={{ fontWeight: 600 }}>{label}</td>
                    <td style={{ color: 'var(--success-color)' }}>{b.correct}</td>
                    <td style={{ color: 'var(--error-color)' }}>{b.incorrect}</td>
                    <td style={{ color: '#adb5bd' }}>{b.unanswered}</td>
                    <td>
                      <span className="percentage-badge">{b.percentage}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ maxWidth: '650px' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800 }}>Resultados de Evaluación</h1>
        <p style={{ color: 'var(--accent-secondary)' }}>
          Reporte de desempeño de tu sesión de {getModeName(result.mode)} ({result.examTarget.toUpperCase()})
        </p>
      </header>

      {isTimeExpired && (
        <div className="validation-bar invalid" style={{ marginBottom: '1.5rem', justifyContent: 'center' }}>
          <span>⌛ El tiempo límite ha expirado. Tu examen fue enviado automáticamente.</span>
        </div>
      )}

      {/* Main Score Card */}
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Resultado General
        </span>
        
        <div style={{ margin: '1.5rem 0' }}>
          <span style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>
            {result.percentage}%
          </span>
          <span style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-highlight)', marginTop: '0.5rem' }}>
            {result.correct} de {result.totalQuestions} correctas
          </span>
        </div>

        {/* Counter Summary grid */}
        <div className="modal-summary-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="summary-card success">
            <span className="summary-num" style={{ fontSize: '1.6rem' }}>{result.correct}</span>
            <span className="summary-lbl">Correctas</span>
          </div>
          <div className="summary-card warning">
            <span className="summary-num" style={{ fontSize: '1.6rem' }}>{result.incorrect}</span>
            <span className="summary-lbl">Incorrectas</span>
          </div>
          <div className="summary-card">
            <span className="summary-num" style={{ fontSize: '1.6rem' }}>{result.unanswered}</span>
            <span className="summary-lbl">Sin Responder</span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', marginTop: '2rem' }}>
          <button
            onClick={() => navigate(`/results/${result.sessionId}/review`)}
            className="btn btn-primary"
            type="button"
          >
            Revisar Preguntas y Explicaciones
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
            type="button"
          >
            Volver a la Página de Inicio
          </button>
        </div>
      </div>

      {/* Performance breakdowns sections */}
      {isPractice ? (
        <>
          {renderBreakdownSection('category')}
          {renderBreakdownSection('area')}
        </>
      ) : (
        <>
          {renderBreakdownSection('area')}
          {renderBreakdownSection('category')}
        </>
      )}
    </div>
  );
};

export default Results;
