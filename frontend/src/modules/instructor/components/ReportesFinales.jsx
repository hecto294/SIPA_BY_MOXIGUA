// src/modules/instructor/components/ReportesFinales.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Breadcrumb from '../../shared/components/Breadcrumb';
import { apiClient } from '@/core/api/client';
import EvaluacionFinalModal from '../../coordinador/components/EvaluacionFinalModal';

const ReportesFinales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aprendices, setAprendices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProceso, setSelectedProceso] = useState(null);

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    try {
      setLoading(true);
      setError(null);
      const stored = localStorage.getItem('user');
      const instructor = stored ? JSON.parse(stored) : null;
      const instructorId = instructor && instructor.id;
      if (!instructorId) throw new Error('No se encontró el instructor logueado');

      const data = await apiClient.get('/instructor/reportes-finales/' + instructorId);
      setAprendices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar reportes:', err);
      setError(err.message || 'Error al cargar reportes finales');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleClear = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  const filteredAprendices = aprendices.filter(
    (a) =>
      (a.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.ficha_numero || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEvaluar = (aprendiz) => {
    setSelectedProceso(aprendiz);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
        <p style={{ marginTop: '15px' }}>Cargando reportes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#dc2626' }}></i>
        <h3 style={{ color: '#dc2626', marginTop: '15px' }}>Error</h3>
        <p style={{ color: '#6b7280' }}>{error}</p>
        <button onClick={cargarReportes} style={{ background: '#3ca203', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginTop: '15px' }}>
          <i className="fas fa-redo" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Breadcrumb />
      <h2 style={{ marginBottom: '20px', color: '#1f2937' }}>Reportes Finales</h2>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar aprendiz por nombre o ficha..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}
        />
        <button onClick={handleSearch} style={{ background: '#3ca203', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          <i className="fas fa-search" /> Buscar
        </button>
        <button onClick={handleClear} style={{ background: '#e5e7eb', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          <i className="fas fa-times" /> Limpiar
        </button>
      </div>

      {filteredAprendices.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>No hay reportes pendientes.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredAprendices.map((a, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e6f7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3ca203', fontWeight: 'bold', fontSize: '18px' }}>
                  {(a.nombre || 'A').charAt(0)}
                </div>
                <div>
                  <h4 style={{ margin: 0 }}>{a.nombre || 'Sin nombre'}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                    Ficha {a.ficha_numero || '—'} • {a.programa_nombre || 'Sin programa'}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                    Finalizó etapa productiva: {a.fecha_fin || '—'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ background: '#fef3c7', color: '#d97706', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '500' }}>
                  <i className="fas fa-hourglass-half"></i> Reporte pendiente
                </span>
                <button
                  onClick={() => handleEvaluar(a)}
                  style={{ background: '#3ca203', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  <i className="fas fa-edit" /> Evaluar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EvaluacionFinalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        proceso={selectedProceso}
        onSuccess={() => {
          setIsModalOpen(false);
          cargarReportes();
        }}
      />
    </div>
  );
};

export default ReportesFinales;
