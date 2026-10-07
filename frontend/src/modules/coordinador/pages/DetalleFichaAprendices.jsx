// src/modules/coordinador/pages/DetalleFichaAprendices.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fichaService } from '@/core/services/fichaService';
import { procesoService } from '@/core/services/procesoService';

const DetalleFichaAprendices = () => {
  const { idFicha } = useParams();
  const navigate = useNavigate();

  const [ficha, setFicha] = useState(null);
  const [aprendices, setAprendices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFicha]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const fichaData = await fichaService.getFichaById(idFicha);
      setFicha(fichaData);

      const procesos = await procesoService.getProcesos({ ficha_id: idFicha });

      const filas = await Promise.all(
        (procesos || []).map(async (p) => {
          let aprendiz = null;
          try {
            aprendiz = await procesoService.getUsuarioById(p.aprendiz_id);
          } catch {
            aprendiz = null;
          }
          return {
            id: p.id,
            nombre: aprendiz ? `${aprendiz.nombre} ${aprendiz.apellido}` : `Aprendiz #${p.aprendiz_id}`,
            email: aprendiz?.email || '-',
            empresa: p.empresa_nombre || (p.empresa_id ? `Empresa #${p.empresa_id}` : 'Sin asignar'),
            arl: p.arl || '-',
            estado: p.estado,
          };
        })
      );

      setAprendices(filas);
    } catch (err) {
      console.error('Error al cargar aprendices de la ficha:', err);
      setError(err.message || 'Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
        <p style={{ marginTop: '15px' }}>Cargando aprendices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#dc2626' }}></i>
        <h3 style={{ color: '#dc2626', marginTop: '15px' }}>Error al cargar</h3>
        <p style={{ color: '#6b7280' }}>{error}</p>
        <button
          onClick={() => navigate('/coordinador/parametrizacion/fichas')}
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
        onClick={() => navigate(-1)}
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
        <i className="fas fa-arrow-left" /> Volver
      </button>

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
          Ficha {ficha?.numero_ficha}
        </h2>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Aprendices asignados: {aprendices.length}
        </p>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          overflowX: 'auto',
        }}
      >
        {aprendices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fas fa-users" style={{ fontSize: '32px', color: '#9ca3af' }}></i>
            <p style={{ color: '#6b7280', marginTop: '10px' }}>
              No hay aprendices asignados a esta ficha todavía.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '10px', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>Aprendiz</th>
                <th style={{ padding: '10px', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '10px', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>Empresa</th>
                <th style={{ padding: '10px', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>ARL</th>
                <th style={{ padding: '10px', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {aprendices.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 500 }}>{a.nombre}</td>
                  <td style={{ padding: '12px 10px', color: '#6b7280' }}>{a.email}</td>
                  <td style={{ padding: '12px 10px' }}>{a.empresa}</td>
                  <td style={{ padding: '12px 10px' }}>{a.arl}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span
                      style={{
                        background: a.estado === 'ACTIVO' ? '#d1fae5' : '#f3f4f6',
                        color: a.estado === 'ACTIVO' ? '#047857' : '#6b7280',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {a.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DetalleFichaAprendices;