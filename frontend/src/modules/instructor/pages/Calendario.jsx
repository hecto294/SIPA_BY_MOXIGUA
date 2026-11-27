import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Breadcrumb from '../../shared/components/Breadcrumb';
import { apiClient } from '../../../core/api/client';

const Calendario = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true; // Evita actualizar el estado si el componente se desmonta

    const cargarEventos = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get('/instructor/eventos');
        const data = response?.data;
        
        if (isMounted) {
          if (Array.isArray(data)) {
            setEventos(data);
          } else if (data && Array.isArray(data.eventos)) {
            setEventos(data.eventos);
          } else {
            setEventos([]);
          }
        }
      } catch (err) {
        console.error('Error cargando eventos:', err);
        if (isMounted) {
          setError('No se pudieron cargar los eventos. Intenta de nuevo.');
          setEventos([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    cargarEventos();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '20px 0' }}>
        <Breadcrumb />
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
          <p style={{ marginTop: '15px', color: '#6b7280' }}>Cargando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <Breadcrumb />
      <button
        onClick={() => navigate('/instructor/dashboard')}
        style={{
          background: 'transparent', border: 'none', color: '#3ca203',
          cursor: 'pointer', marginBottom: '15px', display: 'flex',
          alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '500'
        }}
      >
        <i className="fas fa-arrow-left" /> Volver al Dashboard
      </button>

      <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>Calendario de Eventos</h2>
      <p style={{ color: '#6b7280' }}>Aquí se muestran todas tus reuniones y charlas programadas.</p>

      {error ? (
        <div style={{ marginTop: '20px', padding: '20px', background: '#fee2e2', borderRadius: '8px', color: '#dc2626' }}>
          <i className="fas fa-exclamation-circle" /> {error}
        </div>
      ) : eventos.length === 0 ? (
        <div style={{ marginTop: '20px', background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <i className="fas fa-calendar-times" style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '15px' }} />
          <h3 style={{ color: '#1f2937' }}>No hay eventos programados</h3>
          <p style={{ color: '#6b7280' }}>Aún no tienes reuniones ni charlas registradas en el sistema.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {eventos.map((ev) => (
            <div
              key={ev.id}
              style={{
                background: 'white', borderRadius: '12px', padding: '20px',
                border: `2px solid ${ev.tipo === 'Charla' ? '#0ea5e9' : '#3ca203'}`,
                cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
              }}
              onClick={() => navigate(`/instructor/evento/${ev.id}`, { state: { evento: ev } })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ background: ev.tipo === 'Charla' ? '#e0f2fe' : '#e6f7ed', color: ev.tipo === 'Charla' ? '#0ea5e9' : '#047857', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                  {ev.tipo}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}><i className="far fa-calendar-alt" /> {ev.fecha || 'Sin fecha'}</span>
              </div>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#1f2937' }}>{ev.titulo}</h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.descripcion}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}><i className="fas fa-layer-group" /> Ficha: {ev.ficha}</span>
                <span style={{ fontSize: '12px', color: ev.estado === 'Completado' ? '#10b981' : ev.estado === 'Pendiente' ? '#f59e0b' : '#0ea5e9', fontWeight: 'bold' }}>{ev.estado}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Calendario;
