// src/modules/instructor/components/Aprendices.jsx
import React, { useState, useEffect } from 'react';
import instructorService from '../services/instructorService';
import './Aprendices.css';

const Aprendices = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aprendices, setAprendices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarAprendicesDisponibles();
  }, []);

  const cargarAprendicesDisponibles = async () => {
    try {
      setLoading(true);
      setError(null);

      const stored = localStorage.getItem('user');
      const instructor = stored ? JSON.parse(stored) : null;
      const instructorId = instructor?.id;

      if (!instructorId) {
        throw new Error('No hay instructor logueado');
      }

      const data = await instructorService.getAprendicesDisponibles(instructorId);
      const lista = Array.isArray(data) ? data : [];

      setAprendices(
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
      setAprendices([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAprendices = aprendices.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.identificacion || '').toLowerCase().includes(q) ||
      (item.nombre || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q)
    );
  });

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleClear = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="aprendices-container">
        <div className="aprendices-header">
          <h2>
            <i className="fas fa-user-graduate" /> Aprendices disponibles
          </h2>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px' }} />
          <p style={{ marginTop: '15px' }}>Cargando aprendices disponibles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aprendices-container">
        <div className="aprendices-header">
          <h2>
            <i className="fas fa-user-graduate" /> Aprendices disponibles
          </h2>
        </div>
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
            onClick={cargarAprendicesDisponibles}
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
      <div className="aprendices-header">
        <div>
          <h2>
            <i className="fas fa-user-graduate" /> Aprendices disponibles
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Aprendices activos que aún no tienen un proceso de etapa productiva asignado
          </p>
        </div>
      </div>

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
          placeholder="Buscar por identificación, nombre o correo..."
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
        {filteredAprendices.length} aprendiz{filteredAprendices.length !== 1 ? 'es' : ''} disponible
        {filteredAprendices.length !== 1 ? 's' : ''}
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
            {searchQuery ? 'No se encontraron resultados' : 'No hay aprendices disponibles'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {searchQuery
              ? 'Prueba con otro término de búsqueda.'
              : 'Todos los aprendices activos ya tienen un proceso asignado.'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
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
        </div>
      )}
    </div>
  );
};

export default Aprendices;