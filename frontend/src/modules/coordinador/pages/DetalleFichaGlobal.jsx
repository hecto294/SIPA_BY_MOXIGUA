// src/modules/coordinador/pages/DetalleFichaGlobal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fichaService } from '@/core/services/fichaService';

const DetalleFichaGlobal = () => {
  const { idFicha } = useParams();
  const navigate = useNavigate();

  // 🔑 Leer el parámetro de la URL
  const [searchParams] = useSearchParams();
  const modo = searchParams.get('modo');
  const mostrarTablaAprendices = modo === 'parametrizacion';

  const [ficha, setFicha] = useState(null);
  const [programa, setPrograma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [aprendices, setAprendices] = useState([]);
  const [loadingAprendices, setLoadingAprendices] = useState(false);

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFicha]);

  const cargarTodo = async () => {
    try {
      setLoading(true);
      setError(null);

      const fichaData = await fichaService.getFichaById(idFicha);
      setFicha(fichaData);

      if (fichaData?.programa_id) {
        const programaData = await fichaService
          .getProgramaById(fichaData.programa_id)
          .catch(() => null);
        setPrograma(programaData);
      }

      // 🔑 Solo cargar aprendices si viene de parametrización
      if (modo === 'parametrizacion') {
        try {
          setLoadingAprendices(true);
          const aprendicesData = await fichaService.getAprendicesByFicha(idFicha);
          setAprendices(aprendicesData || []);
        } catch (err) {
          console.error('❌ Error al cargar aprendices:', err);
          setAprendices([]);
        } finally {
          setLoadingAprendices(false);
        }
      }
    } catch (err) {
      console.error('Error al cargar ficha:', err);
      setError(err.message || 'Error al cargar la ficha');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
        <p style={{ marginTop: '15px' }}>Cargando ficha...</p>
      </div>
    );
  }

  if (error || !ficha) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#dc2626' }}></i>
        <h3 style={{ color: '#dc2626', marginTop: '15px' }}>Ficha no encontrada</h3>
        <p style={{ color: '#6b7280' }}>{error}</p>
        <button
          onClick={() => navigate('/coordinador/fichas')}
          style={{
            background: '#3ca203',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '15px',
          }}
        >
          <i className="fas fa-arrow-left" /> Volver a fichas
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <button
        onClick={() => navigate('/coordinador/fichas')}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#3ca203',
          cursor: 'pointer',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <i className="fas fa-arrow-left" /> Volver a fichas
      </button>

      {/* INFO DE LA FICHA */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '25px',
          border: '1px solid #e5e7eb',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0' }}>
          Ficha {ficha.numero_ficha}
        </h2>
        <p style={{ color: '#6b7280', margin: '0 0 15px 0' }}>
          {programa?.nombre || `Programa #${ficha.programa_id}`}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '20px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Nivel</p>
            <p style={{ margin: '5px 0 0 0', fontWeight: '500' }}>{ficha.nivel || 'N/A'}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Jornada</p>
            <p style={{ margin: '5px 0 0 0', fontWeight: '500' }}>{ficha.jornada || 'N/A'}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Aprendices esperados</p>
            <p style={{ margin: '5px 0 0 0', fontWeight: '500' }}>{ficha.aprendices_esperados || 0}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Estado</p>
            <span
              style={{
                background: ficha.is_active ? '#d1fae5' : '#f3f4f6',
                color: ficha.is_active ? '#047857' : '#6b7280',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'inline-block',
                marginTop: '5px',
              }}
            >
              {ficha.is_active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginTop: '20px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Fecha Inicio</p>
            <p style={{ margin: '5px 0 0 0', fontWeight: '500' }}>{formatearFecha(ficha.fecha_inicio)}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Fecha Fin</p>
            <p style={{ margin: '5px 0 0 0', fontWeight: '500' }}>{formatearFecha(ficha.fecha_fin)}</p>
          </div>
        </div>
      </div>

      {/* TABLA DE APRENDICES - Solo si viene desde Parametrización */}
      {mostrarTablaAprendices && (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '25px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937' }}>
            <i className="fas fa-users" style={{ color: '#3ca203', marginRight: '8px' }}></i>
            Listado de Aprendices
          </h3>

          {loadingAprendices ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#3ca203' }}></i>
              <p>Cargando aprendices...</p>
            </div>
          ) : aprendices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              <i className="fas fa-info-circle" style={{ fontSize: '24px' }}></i>
              <p>No hay aprendices registrados en esta ficha.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 10px' }}>Aprendiz</th>
                    <th style={{ padding: '12px 10px' }}>Correo</th>
                    <th style={{ padding: '12px 10px' }}>Empresa</th>
                    <th style={{ padding: '12px 10px' }}>ARL</th>
                    <th style={{ padding: '12px 10px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {aprendices.map((ap) => (
                    <tr key={ap.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '500' }}>{ap.nombre}</td>
                      <td style={{ padding: '12px 10px', color: '#6b7280' }}>{ap.correo}</td>
                      <td style={{ padding: '12px 10px' }}>{ap.empresa}</td>
                      <td style={{ padding: '12px 10px' }}>{ap.arl}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            background: ap.estado === 'ACTIVO' ? '#d1fae5' : '#fee2e2',
                            color: ap.estado === 'ACTIVO' ? '#047857' : '#dc2626',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          {ap.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetalleFichaGlobal;