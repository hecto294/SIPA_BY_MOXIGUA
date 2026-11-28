// src/modules/instructor/components/Aprendices.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { apiClient } from '@/core/api/client';
import instructorService from '../services/instructorService';
import './Aprendices.css';
import EvaluacionFinalModal from '../../coordinador/components/EvaluacionFinalModal';
import { procesoService } from '@/core/services/procesoService';

const Aprendices = () => {
  // 'disponibles' = aprendices sin proceso activo | 'asignados' = aprendices con proceso del instructor
  const [vista, setVista] = useState('disponibles');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [disponibles, setDisponibles] = useState([]);
  const [asignados, setAsignados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Evaluación final (RF-050) y novedades
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProceso, setSelectedProceso] = useState(null);
  const [novedades, setNovedades] = useState({});
  const [modalNovedades, setModalNovedades] = useState(null);

  const getInstructorId = () => {
    const stored = localStorage.getItem('user');
    const instructor = stored ? JSON.parse(stored) : null;
    return instructor?.id;
  };

  // ==========================================================
  // APRENDICES DISPONIBLES (sin proceso activo)
  // ==========================================================
  const cargarAprendicesDisponibles = async () => {
    try {
      setLoading(true);
      setError(null);

      const instructorId = getInstructorId();
      if (!instructorId) {
        throw new Error('No hay instructor logueado');
      }

      const data = await instructorService.getAprendicesDisponibles(instructorId);
      const lista = Array.isArray(data) ? data : [];

      setDisponibles(
        lista.map((ap) => ({
          id: ap.id,
          identificacion: ap.documento_identidad || '—',
          nombre: (ap.nombre || '').trim() || 'Sin nombre',
          email: ap.email || '—',
          telefono: ap.telefono || '—',
          tipo_documento: ap.tipo_documento || '',
        }))
      );
    } catch (err) {
      console.error('Error al cargar aprendices disponibles:', err);
      setError(err.message || 'Error al cargar aprendices disponibles');
      setDisponibles([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // APRENDICES CON PROCESO (del instructor)
  // ==========================================================
  const cargarAprendicesAsignados = async () => {
    try {
      setLoading(true);
      setError(null);

      const instructorId = getInstructorId();
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
        const arrKey = Object.keys(response).find((k) => Array.isArray(response[k]));
        if (arrKey) listaProcesos = response[arrKey];
      }

      if (listaProcesos.length === 0) {
        setAsignados([]);
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
            identificacion: usuario.documento_identidad || '—',
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
            identificacion: '—',
            nombre: `Aprendiz ${p.aprendiz_id}`,
            ficha: p.ficha_numero || p.ficha_id || '—',
            estado: p.estado || 'Sin estado',
          });
        }
      }

      setAsignados(todosAprendices);
    } catch (err) {
      console.error('Error al cargar aprendices:', err);
      setError(err.message || 'Error al cargar aprendices');
      setAsignados([]);
    } finally {
      setLoading(false);
    }
  };

  const recargar = () =>
    vista === 'disponibles' ? cargarAprendicesDisponibles() : cargarAprendicesAsignados();

  // Cargar la lista de la vista activa (y limpiar la búsqueda al cambiar de vista)
  useEffect(() => {
    setSearchTerm('');
    setSearchQuery('');
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista]);

  // ==========================================================
  // NOVEDADES Y EVALUACIÓN FINAL
  // ==========================================================
  const cargarNovedades = async (aprendizId) => {
    try {
      const instructorId = getInstructorId();

      const procesos = await procesoService.getProcesos({
        aprendiz_id: aprendizId,
        instructor_id: instructorId,
        solo_activos: true,
      });

      if (Array.isArray(procesos) && procesos.length > 0) {
        const procesoId = procesos[0].id;
        const data = await procesoService.getNovedades(procesoId);
        setNovedades((prev) => ({ ...prev, [aprendizId]: data }));
        setModalNovedades(aprendizId);
      } else {
        setNovedades((prev) => ({ ...prev, [aprendizId]: [] }));
        setModalNovedades(aprendizId);
      }
    } catch (err) {
      console.error('Error al cargar novedades:', err);
      setNovedades((prev) => ({ ...prev, [aprendizId]: [] }));
      setModalNovedades(aprendizId);
    }
  };

  const handleEvaluar = async (aprendizId) => {
    try {
      // Buscamos el proceso asociado a este aprendiz para el instructor actual
      const instructorId = getInstructorId();

      const procesos = await procesoService.getProcesos({
        aprendiz_id: aprendizId,
        instructor_id: instructorId,
        solo_activos: true,
      });

      const proceso =
        Array.isArray(procesos) && procesos.length > 0
          ? procesos[0]
          : { id: aprendizId, aprendiz_nombre: 'Aprendiz' };

      setSelectedProceso(proceso);
      setIsModalOpen(true);
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'No se pudo cargar el proceso del aprendiz', icon: 'error' });
    }
  };

  // ==========================================================
  // FILTRO DE BÚSQUEDA
  // ==========================================================
  const esDisponibles = vista === 'disponibles';
  const lista = esDisponibles ? disponibles : asignados;

  const filteredAprendices = lista.filter((item) => {
    const q = searchQuery.toLowerCase();
    const campos = esDisponibles
      ? [item.identificacion, item.nombre, item.email]
      : [item.identificacion, item.nombre, item.ficha];
    return campos.some((c) => String(c ?? '').toLowerCase().includes(q));
  });

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleClear = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  const tabStyle = (activa) => ({
    background: activa ? '#3ca203' : '#e5e7eb',
    color: activa ? 'white' : '#374151',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
  });

  const titulo = esDisponibles ? 'Aprendices disponibles' : 'Mis aprendices';

  const encabezado = (
    <div className="aprendices-header">
      <div>
        <h2>
          <i className="fas fa-user-graduate" /> {titulo}
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
          {esDisponibles
            ? 'Aprendices activos que aún no tienen un proceso de etapa productiva asignado'
            : 'Aprendices con proceso de etapa productiva activo a tu cargo'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" style={tabStyle(esDisponibles)} onClick={() => setVista('disponibles')}>
          <i className="fas fa-user-plus" /> Disponibles
        </button>
        <button type="button" style={tabStyle(!esDisponibles)} onClick={() => setVista('asignados')}>
          <i className="fas fa-users" /> Con proceso
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="aprendices-container">
        {encabezado}
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px' }} />
          <p style={{ marginTop: '15px' }}>Cargando aprendices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aprendices-container">
        {encabezado}
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            color: '#991b1b',
          }}
        >
          <i className="fas fa-exclamation-circle" style={{ fontSize: '28px', marginBottom: '10px' }} />
          <p style={{ margin: 0 }}>{error}</p>
          <button
            onClick={recargar}
            style={{
              marginTop: '16px',
              background: '#3ca203',
              color: 'white',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="aprendices-container">
      {encabezado}

      {/* Barra de búsqueda */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder={
            esDisponibles
              ? 'Buscar por identificación, nombre o correo...'
              : 'Buscar por identificación, nombre o ficha...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            background: '#3ca203',
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          <i className="fas fa-search" /> Buscar
        </button>
        {searchQuery && (
          <button
            onClick={handleClear}
            style={{
              background: '#e5e7eb',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Contador */}
      <p style={{ marginBottom: '12px', color: '#6b7280', fontSize: '13px' }}>
        {filteredAprendices.length} aprendiz{filteredAprendices.length !== 1 ? 'es' : ''}
        {esDisponibles ? ` disponible${filteredAprendices.length !== 1 ? 's' : ''}` : ''}
      </p>

      {filteredAprendices.length === 0 ? (
        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#6b7280',
          }}
        >
          <i className="fas fa-user-slash" style={{ fontSize: '36px', marginBottom: '12px', color: '#9ca3af' }} />
          <h3 style={{ margin: '0 0 6px 0', color: '#374151' }}>
            {searchQuery
              ? 'No se encontraron resultados'
              : esDisponibles
              ? 'No hay aprendices disponibles'
              : 'No tienes aprendices con proceso activo'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {searchQuery
              ? 'Prueba con otro término de búsqueda.'
              : esDisponibles
              ? 'Todos los aprendices activos ya tienen un proceso asignado.'
              : 'Cuando se te asignen procesos, aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          {esDisponibles ? (
            <table>
              <thead>
                <tr>
                  <th>Identificación</th>
                  <th>Nombre completo</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {filteredAprendices.map((item) => (
                  <tr key={item.id}>
                    <td className="codigo">
                      {item.tipo_documento ? `${item.tipo_documento} ` : ''}
                      {item.identificacion}
                    </td>
                    <td>{item.nombre}</td>
                    <td>{item.email}</td>
                    <td>{item.telefono}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
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
                {filteredAprendices.map((item) => (
                  <tr key={item.proceso_id ?? item.aprendiz_id}>
                    <td className="codigo">{item.identificacion}</td>
                    <td>{item.nombre}</td>
                    <td>
                      <span style={{ fontWeight: 'bold', color: '#3ca203' }}>{item.ficha}</span>
                    </td>
                    <td>
                      <span
                        className={`status-ficha ${
                          item.estado === 'Activo' || item.estado === 'ACTIVO' ? 'status-activa' : 'status-inactiva'
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleEvaluar(item.aprendiz_id)}
                        style={{
                          background: '#3ca203',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        <i className="fas fa-edit" /> Evaluar
                      </button>
                      <button
                        onClick={() => cargarNovedades(item.aprendiz_id)}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          marginLeft: '5px',
                        }}
                      >
                        <i className="fas fa-list" /> Novedades
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <EvaluacionFinalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        proceso={selectedProceso}
        onSuccess={() => {
          setIsModalOpen(false);
          cargarAprendicesAsignados();
        }}
      />

      {modalNovedades && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              width: '500px',
              maxWidth: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ marginBottom: '16px', color: '#1f2937' }}>Novedades del Aprendiz</h2>
            {!novedades[modalNovedades] || novedades[modalNovedades].length === 0 ? (
              <p style={{ color: '#6b7280' }}>No hay novedades registradas para este aprendiz.</p>
            ) : (
              novedades[modalNovedades].map((n) => (
                <div
                  key={n.id}
                  style={{
                    background: '#f9fafb',
                    borderLeft: '3px solid #3ca203',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {n.tipo_novedad || 'Novedad'} · {n.fecha_novedad || n.created_at || ''}
                  </div>
                  <div style={{ fontSize: '14px', color: '#1f2937', marginTop: '3px' }}>{n.descripcion}</div>
                </div>
              ))
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setModalNovedades(null)}
                style={{ background: '#e5e7eb', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
              >
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