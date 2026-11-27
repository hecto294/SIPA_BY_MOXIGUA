import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/core/api/client';

const COLOR_POR_TIPO = {
  URGENTE: { fondo: '#fee2e2', texto: '#b91c1c' },
  ADVERTENCIA: { fondo: '#fef3c7', texto: '#b45309' },
  INFO: { fondo: '#dbeafe', texto: '#1d4ed8' },
  EXITO: { fondo: '#d1fae5', texto: '#047857' },
};

const formatearFecha = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

const HistorialAlertas = ({ rutaVolver = '/' }) => {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoria, setCategoria] = useState('TODAS');

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await apiClient.get('/alertas/historial');
        const datos = response?.data ?? response;
        setAlertas(datos?.alertas || []);
      } catch (err) {
        console.error('Error cargando historial de alertas:', err);
        setError('No se pudo cargar el historial de alertas.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const categorias = ['TODAS', ...new Set(alertas.map((a) => a.categoria).filter(Boolean))];
  const visibles = categoria === 'TODAS' ? alertas : alertas.filter((a) => a.categoria === categoria);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
        <p style={{ marginTop: '15px' }}>Cargando historial...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 5px 0' }}>
            <i className="fas fa-history" style={{ color: '#3ca203', marginRight: '10px' }} />
            Historial de alertas
          </h2>
          <p style={{ color: '#6b7280', fontSize: '15px', margin: 0 }}>
            Alertas que ya fueron resueltas ({alertas.length}).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white' }}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>{c === 'TODAS' ? 'Todas las categorías' : c.toLowerCase()}</option>
            ))}
          </select>
          <button
            onClick={() => navigate(rutaVolver)}
            style={{ background: '#3ca203', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          >
            ← Volver
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '20px', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px' }}>{error}</div>
      )}

      {!error && visibles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <i className="fas fa-inbox" style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '15px' }} />
          <h3 style={{ color: '#1f2937', margin: '0 0 8px 0' }}>Sin alertas en el historial</h3>
          <p style={{ color: '#6b7280', margin: 0 }}>Cuando resuelvas alertas, aparecerán aquí.</p>
        </div>
      )}

      {!error && visibles.length > 0 && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {visibles.map((a) => {
            const color = COLOR_POR_TIPO[a.tipo] || COLOR_POR_TIPO.INFO;
            return (
              <div key={a.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#1f2937' }}>{a.titulo}</h3>
                  <span style={{ background: color.fondo, color: color.texto, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                    {a.tipo}
                  </span>
                </div>
                <p style={{ margin: '6px 0', color: '#4b5563', fontSize: '14px' }}>{a.mensaje}</p>
                <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <span>Creada: {formatearFecha(a.created_at)}</span>
                  {a.categoria && <span>• {a.categoria.toLowerCase()}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistorialAlertas;
