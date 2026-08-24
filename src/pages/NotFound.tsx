import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ maxWidth: '550px', marginTop: '6rem' }}>
      <div className="card error" style={{ textAlign: 'center', padding: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--accent-secondary)', borderBottom: 'none', padding: 0 }}>
          🔍 Página No Encontrada
        </h1>
        <p style={{ margin: '1.5rem 0 2.2rem 0', fontSize: '1.05rem', lineHeight: '1.6' }}>
          Lo sentimos, el recurso que estás buscando no existe o la dirección URL es incorrecta.
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn btn-primary"
          type="button"
          style={{ width: '100%' }}
        >
          Volver a la Página de Inicio
        </button>
      </div>
    </div>
  );
};

export default NotFound;
