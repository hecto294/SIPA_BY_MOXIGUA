// src/modules/aprendiz/pages/MisCertificados.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { apiClient } from '@/core/api/client';

const MisCertificados = () => {
  const [certificados, setCertificados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarCertificados = async () => {
      try {
        const response = await apiClient.get('/certificados/mis-certificados');
        // Si el backend devuelve un arreglo, lo asignamos; si no, lista vacía
        const datos = response?.data ?? response;
        setCertificados(Array.isArray(datos) ? datos : (datos?.certificados || []));
      } catch (err) {
        console.error('Error cargando certificados:', err);
        Swal.fire({
          title: '❌ Error',
          text: 'No se pudieron cargar tus certificados.',
          icon: 'error',
          confirmButtonColor: '#dc2626',
        });
      } finally {
        setLoading(false);
      }
    };
    cargarCertificados();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
        <p style={{ marginTop: '15px' }}>Cargando tus certificados...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 5px 0' }}>
          <i className="fas fa-award" style={{ color: '#3ca203', marginRight: '10px' }} />
          Mis Certificados
        </h2>
        <p style={{ color: '#6b7280', fontSize: '15px', margin: 0 }}>
          Aquí puedes ver y descargar los certificados de tu etapa productiva emitidos por el coordinador.
        </p>
      </div>

      {certificados.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px', background: 'white',
          borderRadius: '12px', border: '1px solid #e5e7eb',
        }}>
          <i className="fas fa-hourglass-half" style={{ fontSize: '64px', color: '#f59e0b', marginBottom: '20px' }} />
          <h3 style={{ color: '#1f2937', margin: '0 0 10px 0' }}>Aún no tienes certificados</h3>
          <p style={{ color: '#6b7280', maxWidth: '500px', margin: '0 auto' }}>
            Cuando tu coordinador emita tu certificado de etapa productiva, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {certificados.map((cert) => (
            <div
              key={cert.id}
              style={{
                background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
                padding: '24px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
              }}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '12px', background: '#d1fae5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className="fas fa-award" style={{ fontSize: '32px', color: '#047857' }} />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: '600', color: '#1f2937' }}>
                  {cert.titulo || 'Certificado de Etapa Productiva'}
                </h3>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#6b7280' }}>
                  <span>
                    <i className="fas fa-calendar" style={{ marginRight: '5px', color: '#3ca203' }} />
                    Emitido: {cert.fecha_emision}
                  </span>
                </div>
              </div>
              <div>
                <span style={{
                  background: '#d1fae5', color: '#047857', padding: '4px 12px',
                  borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase',
                }}>
                  {cert.estado}
                </span>
              </div>
              <div>
                <button
                  onClick={() => Swal.fire('📄 Descargar', 'El certificado se está generando...', 'info')}
                  style={{
                    background: '#3ca203', color: 'white', border: 'none', padding: '10px 20px',
                    borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <i className="fas fa-download" /> Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MisCertificados;
