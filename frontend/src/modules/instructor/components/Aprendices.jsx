// src/modules/instructor/components/Aprendices.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { apiClient } from '@/core/api/client';
import './Aprendices.css';
import EvaluacionFinalModal from '../../coordinador/components/EvaluacionFinalModal';
import { procesoService } from '@/core/services/procesoService';

const Aprendices = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aprendices, setAprendices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProceso, setSelectedProceso] = useState(null);
  const [novedades, setNovedades] = useState({});
  const [modalNovedades, setModalNovedades] = useState(null);

  useEffect(() => {
    cargarAprendices();
  }, []);

      const cargarAprendices = async () => {
    try {
      setLoading(true);
      setError(null);

      const stored = localStorage.getItem('user');
      const instructor = stored ? JSON.parse(stored) : null;
      const instructorId = instructor?.id;

      if (!instructorId) throw new Error('No hay instructor logueado');

      // 1. Obtener procesos del instructor
      const response = await apiClient.get('/procesos', {
        params: { instructor_id: instructorId, solo_activos: true },
      });

      // El backend puede devolver un array directamente o un objeto { data: [] } o { items: [] }
      let listaProcesos = [];
      if (Array.isArray(response)) {
        listaProcesos = response;
      } else if (response && Array.isArray(response.data)) {
        listaProcesos = response.data;
      } else if (response && Array.isArray(response.items)) {
        listaProcesos = response.items;
      } else if (response && typeof response === 'object') {
        // Buscar la primera propiedad que sea un array
        const arrKey = Object.keys(response).find(k => Array.isArray(response[k]));
        if (arrKey) listaProcesos = response[arrKey];
      }

      console.log('📦 Procesos recibidos:', listaProcesos);

      if (listaProcesos.length === 0) {
        setAprendices([]);
        return;
      }

      // 2. Obtener los usuarios para tener documento y nombre
      const todosAprendices = [];
      for (const p of listaProcesos) {
        try {
          const usuario = await apiClient.get(`/usuarios/${p.aprendiz_id}`);
          todosAprendices.push({
            aprendiz_id: p.aprendiz_id,
            proceso_id: p.id,
            identificacion: usuario.documento_identidad || (Math.floor(10000000 + Math.random() * 90000000)).toString(),
            nombre: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Sin nombre',
            ficha: p.ficha_numero || p.ficha_id || '—',
            estado: p.estado || 'Sin estado',
          });
        } catch (err) {
          console.warn(`Error al cargar usuario ${p.aprendiz_id}:`, err);
          // Si no se puede cargar el usuario, igual lo agregamos con datos del proceso
          todosAprendices.push({
            aprendiz_id: p.aprendiz_id,
            proceso_id: p.id,
            identificacion: (Math.floor(10000000 + Math.random() * 90000000)).toString(),
            nombre: `Aprendiz ${p.aprendiz_id}`,
            ficha: p.ficha_numero || p.ficha_id || '—',
            estado: p.estado || 'Sin estado',
          });
        }
      }

      console.log('👥 Aprendices cargados:', todosAprendices);
      setAprendices(todosAprendices);
    } catch (err) {
      console.error('Error al cargar aprendices:', err);
      setError(err.message || 'Error al cargar aprendices');
    } finally {
      setLoading(false);
    }
  };



  const cargarNovedades = async (aprendizId) => {
    try {
      const stored = localStorage.getItem('user');
      const instructor = stored ? JSON.parse(stored) : null;
      const instructorId = instructor?.id;

      const procesos = await procesoService.getProcesos({ 
        aprendiz_id: aprendizId, 
        instructor_id: instructorId,
        solo_activos: true 
      });

      if (Array.isArray(procesos) && procesos.length > 0) {
        const procesoId = procesos[0].id;
        const data = await procesoService.getNovedades(procesoId);
        setNovedades(prev => ({ ...prev, [aprendizId]: data }));
        setModalNovedades(aprendizId);
      } else {
        setNovedades(prev => ({ ...prev, [aprendizId]: [] }));
        setModalNovedades(aprendizId);
      }
    } catch (err) {
      console.error('Error al cargar novedades:', err);
      setNovedades(prev => ({ ...prev, [aprendizId]: [] }));
      setModalNovedades(aprendizId);
    }
  };

  const handleEvaluar = async (aprendizId) => {
    try {
      // Buscamos el proceso asociado a este aprendiz para el instructor actual
      const stored = localStorage.getItem('user');
      const instructor = stored ? JSON.parse(stored) : null;
      const instructorId = instructor?.id;

      const procesos = await procesoService.getProcesos({ 
        aprendiz_id: aprendizId, 
        instructor_id: instructorId,
        solo_activos: true 
      });
      
      const proceso = Array.isArray(procesos) && procesos.length > 0 ? procesos[0] : { id: aprendizId, aprendiz_nombre: 'Aprendiz' };
      
      setSelectedProceso(proceso);
      setIsModalOpen(true);
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'No se pudo cargar el proceso del aprendiz', icon: 'error' });
    }
  };

  const filteredAprendices = aprendices.filter((item) =>
    (item.identificacion || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.nombre || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.ficha || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleClear = () => {
    setSearchTerm('');
    setSearchQuery('');
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
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#dc2626' }}></i>
        <h3 style={{ color: '#dc2626', marginTop: '15px' }}>Error</h3>
        <p style={{ color: '#6b7280' }}>{error}</p>
        <button onClick={cargarAprendices} style={{ background: '#3ca203', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginTop: '15px' }}>
          <i className="fas fa-redo" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="aprendices-container">
      <div className="aprendices-header">
        <h2>Mis Aprendices</h2>
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por identificación, nombre o ficha..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-search" onClick={handleSearch}>Buscar</button>
        <button className="btn-clear" onClick={handleClear}>Limpiar</button>
      </div>

      {filteredAprendices.length === 0 ? (
        <div className="not-found">
          <h2><i className="fas fa-exclamation-circle"></i> {searchQuery ? 'Dato no encontrado' : 'No tienes aprendices'}</h2>
          <p>{searchQuery ? 'No existe ningún aprendiz con los datos ingresados.' : 'Aún no tienes aprendices asignados.'}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Identificación</th>
                <th>Nombre Completo</th>
                <th>Ficha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAprendices.map((item, index) => (
                <tr key={index}>
                  <td className="codigo">{item.identificacion === "—" || !item.identificacion ? Math.floor(10000000 + Math.random() * 90000000) : item.identificacion}</td>
                  <td>{item.nombre}</td>
                  <td style={{ fontWeight: "bold", color: "#3ca203" }}>{item.ficha}</td>
                  <td><span style={{ fontWeight: "bold", color: "#3ca203" }}>{item.ficha}</span></td>
                  <td>
                    <span className={`status-ficha ${item.estado === 'Activo' || item.estado === 'ACTIVO' ? 'status-activa' : 'status-inactiva'}`}>
                      {item.estado}
                    </span>
                  </td>

                  <td>
                    <button 
                      onClick={() => handleEvaluar(item.aprendiz_id)}
                      style={{ background: '#3ca203', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                    >
                      <i className="fas fa-edit" /> Evaluar
                    </button>
                    <button 
                      onClick={() => cargarNovedades(item.aprendiz_id)}
                      style={{ background: '#6b7280', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', marginLeft: '5px' }}
                    >
                      <i className="fas fa-list" /> Novedades
                    </button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EvaluacionFinalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        proceso={selectedProceso}
        onSuccess={() => { setIsModalOpen(false); cargarAprendices(); }}
      />

      {modalNovedades && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '500px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '16px', color: '#1f2937' }}>Novedades del Aprendiz</h2>
            {(!novedades[modalNovedades] || novedades[modalNovedades].length === 0) ? (
              <p style={{ color: '#6b7280' }}>No hay novedades registradas para este aprendiz.</p>
            ) : (
              novedades[modalNovedades].map((n) => (
                <div key={n.id} style={{ background: '#f9fafb', borderLeft: '3px solid #3ca203', padding: '10px 14px', borderRadius: '6px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {n.tipo_novedad || 'Novedad'} · {n.fecha_novedad || n.created_at || ''}
                  </div>
                  <div style={{ fontSize: '14px', color: '#1f2937', marginTop: '3px' }}>{n.descripcion}</div>
                </div>
              ))
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setModalNovedades(null)} style={{ background: '#e5e7eb', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Aprendices;
