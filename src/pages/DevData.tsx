import React, { useEffect, useState } from 'react';
import {
  initializeDataStore,
  getValidationReport,
  allQuestions,
  stimuliById,
  loadManifest,
  loadExamTargets
} from '@/lib/data/loader';
import { sampleQuestions } from '@/lib/engine/sampling';
import { Question, SamplingResult, ExamTargetConfig, Difficulty } from '@/types';

const DevData: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetConfigs, setTargetConfigs] = useState<Record<string, ExamTargetConfig>>({});
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  
  // Stats
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalStimuli, setTotalStimuli] = useState(0);
  const [questionFilesCount, setQuestionFilesCount] = useState(0);
  const [stimulusFilesCount, setStimulusFilesCount] = useState(0);
  const [areaCounts, setAreaCounts] = useState<Record<string, number>>({});
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [difficultyCounts, setDifficultyCounts] = useState<Record<string, number>>({});

  // Form State
  const [examTarget, setExamTarget] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('mixed');
  const [sampleCount, setSampleCount] = useState<number>(10);
  const [stratify, setStratify] = useState<boolean>(false);
  const [seedStr, setSeedStr] = useState<string>('');

  // Results State
  const [samplingResult, setSamplingResult] = useState<SamplingResult | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Initialize data store (which runs validation checks)
        await initializeDataStore();
        const targets = await loadExamTargets();
        const manifest = await loadManifest();
        
        setTargetConfigs(targets);
        setValidationErrors(getValidationReport().errors);
        setQuestionFilesCount(manifest.banks.length);
        setStimulusFilesCount(manifest.stimuli.length);
        
        // Calculate counts
        setTotalQuestions(allQuestions.length);
        setTotalStimuli(Object.keys(stimuliById).length);

        const areas: Record<string, number> = {};
        const categories: Record<string, number> = {};
        const difficulties: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

        allQuestions.forEach(q => {
          areas[q.area] = (areas[q.area] || 0) + 1;
          categories[q.category] = (categories[q.category] || 0) + 1;
          if (q.difficulty in difficulties) {
            difficulties[q.difficulty]++;
          } else {
            difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1;
          }
        });

        setAreaCounts(areas);
        setCategoryCounts(categories);
        setDifficultyCounts(difficulties);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSample = (e: React.FormEvent) => {
    e.preventDefault();
    
    const seed = seedStr.trim() !== '' ? parseInt(seedStr, 10) : undefined;
    const filter = {
      examTarget: examTarget || undefined,
      area: selectedArea || undefined,
      difficulty: difficulty as Difficulty | 'mixed'
    };

    const result = sampleQuestions(
      {
        filter,
        count: sampleCount,
        stratify,
        seed
      },
      allQuestions,
      targetConfigs
    );

    setSamplingResult(result);
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '20vh' }}>
        <h1 style={{ color: 'var(--accent-primary)' }}>Cargando base de datos de preguntas...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ marginTop: '10vh' }}>
        <div className="card" style={{ borderColor: 'var(--error-color)' }}>
          <h2 style={{ color: 'var(--error-color)' }}>Error Fatal de Inicialización</h2>
          <p style={{ margin: '1rem 0' }}>{error}</p>
          <button className="btn" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  const errorsList = validationErrors.filter(err => err.type !== 'warning');
  const warningsList = validationErrors.filter(err => err.type === 'warning');
  const isValid = errorsList.length === 0;

  return (
    <div className="container">
      <header>
        <h1>Prep Evaluator - Engine Dashboard</h1>
        <p>Milestone 1.1 Validation and Question Bank Inspection</p>
      </header>

      {/* Validation Status */}
      <div className={`validation-bar ${isValid ? 'valid' : 'invalid'}`}>
        <span>
          {isValid 
            ? '✓ VALID - Dataset cargado con éxito sin errores bloqueantes.' 
            : `✗ INVALID - Se encontraron ${errorsList.length} errores bloqueantes en el dataset.`}
          {warningsList.length > 0 && ` (Además, hay ${warningsList.length} advertencias)`}
        </span>
      </div>

      {/* Validation Errors List */}
      {errorsList.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', borderColor: 'var(--error-color)' }}>
          <h2 style={{ color: 'var(--error-color)' }}>Registro de Errores de Validación (Bloqueantes)</h2>
          <div className="error-list">
            {errorsList.map((err, idx) => (
              <div key={idx} className="error-item">
                <div className="error-path">
                  Archivo: {err.filePath} 
                  {err.questionId && ` | ID Pregunta: ${err.questionId}`}
                  {err.stimulusId && ` | ID Estímulo: ${err.stimulusId}`}
                </div>
                <div className="error-msg">{err.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation Warnings List */}
      {warningsList.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', borderColor: 'var(--warning-color, #ffc007)' }}>
          <h2 style={{ color: 'var(--warning-color, #ffc007)' }}>Registro de Advertencias de Validación (No Bloqueantes)</h2>
          <div className="error-list">
            {warningsList.map((err, idx) => (
              <div key={idx} className="error-item" style={{ borderLeftColor: 'var(--warning-color, #ffc007)' }}>
                <div className="error-path">
                  Archivo: {err.filePath} 
                  {err.questionId && ` | ID Pregunta: ${err.questionId}`}
                  {err.stimulusId && ` | ID Estímulo: ${err.stimulusId}`}
                </div>
                <div className="error-msg">{err.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database Statistics */}
      <div className="dashboard-grid">
        <div className="card">
          <h2>Estadísticas Generales</h2>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-item">
              <div className="stat-val">{totalQuestions}</div>
              <div className="stat-lbl">Preguntas</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">{totalStimuli}</div>
              <div className="stat-lbl">Estímulos (Textos/Fig)</div>
            </div>
          </div>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-item">
              <div className="stat-val">{questionFilesCount}</div>
              <div className="stat-lbl">Archivos de Preguntas</div>
            </div>
            <div className="stat-item">
              <div className="stat-val">{stimulusFilesCount}</div>
              <div className="stat-lbl">Archivos de Estímulos</div>
            </div>
          </div>

          <h3 style={{ color: 'var(--text-highlight)', marginBottom: '0.5rem', fontSize: '1rem' }}>Dificultad</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-val" style={{ color: 'var(--success-color)' }}>{difficultyCounts.easy || 0}</div>
              <div className="stat-lbl">Fácil</div>
            </div>
            <div className="stat-item">
              <div className="stat-val" style={{ color: '#ff922b' }}>{difficultyCounts.medium || 0}</div>
              <div className="stat-lbl">Medio</div>
            </div>
            <div className="stat-item">
              <div className="stat-val" style={{ color: 'var(--error-color)' }}>{difficultyCounts.hard || 0}</div>
              <div className="stat-lbl">Difícil</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Distribución por Área</h2>
          <div style={{ maxHeight: '230px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Área</th>
                  <th>Preguntas</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(areaCounts).map(([area, count]) => (
                  <tr key={area}>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{area}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Categories Distribution */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Distribución por Categorías</h2>
        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Preguntas</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <tr key={cat}>
                  <td style={{ fontFamily: 'monospace' }}>{cat}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sampling Engine Test Form */}
      <div className="dashboard-grid">
        <div className="card">
          <h2>Prueba del Motor de Muestreo</h2>
          <form onSubmit={handleSample} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Examen Objetivo (Target)</label>
              <select className="form-control" value={examTarget} onChange={e => setExamTarget(e.target.value)}>
                <option value="">Ninguno (Todos los reactivos)</option>
                <option value="prepatec">PrepaTec (PIENSE-II)</option>
                <option value="buap">BUAP (EXANI-I)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Área Temática (Area)</label>
              <select className="form-control" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                <option value="">Todas</option>
                <option value="cognitive">Cognitivo</option>
                <option value="spanish">Español</option>
                <option value="math">Matemáticas</option>
                <option value="english">Inglés</option>
                <option value="science">Ciencias</option>
              </select>
            </div>

            <div className="form-group">
              <label>Dificultad</label>
              <select className="form-control" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="mixed">Mixta (Cualquiera)</option>
                <option value="easy">Fácil</option>
                <option value="medium">Medio</option>
                <option value="hard">Difícil</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cantidad de Preguntas</label>
              <input
                type="number"
                className="form-control"
                min="1"
                max="100"
                value={sampleCount}
                onChange={e => setSampleCount(parseInt(e.target.value, 10) || 1)}
              />
            </div>

            <div className="form-group">
              <label>Semilla Determinista (Seed)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. 12345 (Vacío para aleatorio ordinario)"
                value={seedStr}
                onChange={e => setSeedStr(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: '1.5rem 0' }}>
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={stratify}
                  onChange={e => setStratify(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Muestreo Estratificado (Stratified Sampling)</span>
              </label>
            </div>

            <button type="submit" className="btn">Ejecutar Muestreo</button>
          </form>
        </div>

        {/* Sampling Results */}
        <div className="card">
          <h2>Resultados de Muestreo</h2>
          {samplingResult ? (
            <div>
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-item">
                  <div className="stat-val">{samplingResult.candidateCount}</div>
                  <div className="stat-lbl">Candidatos</div>
                </div>
                <div className="stat-item">
                  <div className="stat-val">{samplingResult.actualCount}</div>
                  <div className="stat-lbl">Obtenidos</div>
                </div>
              </div>

              {samplingResult.warnings && (
                <div className="warnings-box">
                  <strong>Advertencias:</strong>
                  <ul>
                    {samplingResult.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                  </ul>
                </div>
              )}

              <h3 style={{ color: 'var(--text-highlight)', margin: '1rem 0 0.5rem 0', fontSize: '1.1rem' }}>
                Preguntas Seleccionadas ({samplingResult.questions.length})
              </h3>
              
              <div className="results-table-container" style={{ maxHeight: '250px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Área</th>
                      <th>Categoría</th>
                      <th>Dif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samplingResult.questions.map((q: Question) => (
                      <tr key={q.id}>
                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{q.id}</td>
                        <td style={{ textTransform: 'capitalize' }}>{q.area}</td>
                        <td style={{ fontFamily: 'monospace' }}>{q.category}</td>
                        <td>
                          <span className={`badge ${q.difficulty}`}>{q.difficulty}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--accent-secondary)', marginTop: '20%' }}>
              Completa el formulario y ejecuta el muestreo para visualizar los resultados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevData;
