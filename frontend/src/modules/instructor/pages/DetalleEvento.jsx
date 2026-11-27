import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Breadcrumb from '../../shared/components/Breadcrumb';

const DetalleEvento = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const evento = location.state?.evento;

  if (!evento) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Evento no encontrado</h2>
        <button onClick={() => navigate('/instructor/calendario')}>Volver al Calendario</button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <Breadcrumb />
      <button
        onClick={() => navigate('/instructor/calendario')}
        style={{ background: 'transparent', border: 'none', color: '#3ca203', cursor: 'pointer', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500' }}
      >
        <i className="fas fa-arrow-left" /> Volver al Calendario
      </button>

      <div style={{ background: 'white', borderRadius: '12px', padding: '30px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <span style={{ background: evento.tipo === 'Charla' ? '#e0f2fe' : '#e6f7ed', color: evento.tipo === 'Charla' ? '#0ea5e9' : '#047857', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
              {evento.tipo}
            </span>
            <h2 style={{ margin: '15px 0 5px 0', color: '#1f2937' }}>{evento.titulo}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#3ca203', fontSize: '18px' }}><i className="far fa-calendar-alt" /> {evento.fecha}</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Estado: <strong>{evento.estado}</strong></p>
          </div>
        </div>

        <hr style={{ margin: '20px 0', border: '1px solid #e5e7eb' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Ficha asociada</h4>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#1f2937' }}>{evento.ficha}</p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>Descripción</h4>
            <p style={{ margin: 0, color: '#1f2937' }}>{evento.descripcion}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleEvento;
