// src/modules/instructor/components/SeguimientoMomentos.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/core/api/client';
import { seguimientoService } from '@/core/services/seguimientoService';
import { showSuccess, showError } from '@/core/utils/sweetAlert';
import './SeguimientoMomentos.css';

const MOMENTOS_OPCIONES = [
  { value: 'MOMENTO_1_INICIAL', label: 'Momento 1 - Inicial' },
  { value: 'MOMENTO_2_PARCIAL', label: 'Momento 2 - Parcial' },
  { value: 'MOMENTO_3_FINAL', label: 'Momento 3 - Final' },
];

const SeguimientoMomentos = () => {
  const navigate = useNavigate();
  const [momentoSeleccionado, setMomentoSeleccionado] = useState(null);
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [aprendizModal, setAprendizModal] = useState(null);

  const [momentos, setMomentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTermFichas, setSearchTermFichas] = useState('');
  const [searchQueryFichas, setSearchQueryFichas] = useState('');
  const [searchTermAprendices, setSearchTermAprendices] = useState('');
  const [searchQueryAprendices, setSearchQueryAprendices] = useState('');

  // Programar reunión
  const [showProgramar, setShowProgramar] = useState(false);
  const [procesos, setProcesos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    proceso_id: '',
    momento: 'MOMENTO_1_INICIAL',
    fecha_programada: '',
    observaciones: '',
  });

  const instructor = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    cargarMomentos();
  }, []);

  const cargarMomentos = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!instructor?.id) throw new Error('No se encontró el instructor logueado');
      const data = await apiClient.get('/instructor/momentos/' + instructor.id);
      setMomentos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar momentos:', err);
      setError(err.message || 'Error al cargar seguimientos');
    } finally {
      setLoading(false);
    }
  };

  const abrirProgramar = async () => {
    setShowProgramar(true);
    try {
      // Procesos del instructor
      const data = await apiClient.get('/procesos', {
        params: { instructor_id: instructor?.id, solo_activas: true, limit: 200 },
      });
      setProcesos(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      console.error(e);
      setProcesos([]);
    }
  };

  const handleProgramar = async (e) => {
    e.preventDefault();
    if (!form.proceso_id || !form.momento || !form.fecha_programada) {
      await showError('Completa proceso, momento y fecha programada');
      return;
    }
    setGuardando(true);
    try {
      await seguimientoService.createReunion({
        proceso_id: Number(form.proceso_id),
        momento: form.momento,
        fecha_programada: new Date(form.fecha_programada).toISOString(),
        instructor_id: instructor.id,
        observaciones: form.observaciones || null,
      });
      await showSuccess('Reunión programada correctamente');
      setShowProgramar(false);
      setForm({
        proceso_id: '',
        momento: 'MOMENTO_1_INICIAL',
        fecha_programada: '',
        observaciones: '',
      });
      await cargarMomentos();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Error al programar la reunión';
      await showError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setGuardando(false);
    }
  };

  const handleVerMomento = (id) => {
    const momento = momentos.find((m) => m.id === id);
    setMomentoSeleccionado(momento);
    setFichaSeleccionada(null);
    setSearchTermFichas('');
    setSearchQueryFichas('');
  };

  const handleVolverMomentos = () => {
    setMomentoSeleccionado(null);
    setFichaSeleccionada(null);
    setAprendizModal(null);
  };

  const handleVerFicha = (idFicha) => {
    const ficha = momentoSeleccionado.fichas.find((f) => f.idFicha === idFicha);
    setFichaSeleccionada(ficha);
    setSearchTermAprendices('');
    setSearchQueryAprendices('');
    setAprendizModal(null);
  };

  const handleVolverFichas = () => {
    setFichaSeleccionada(null);
    setAprendizModal(null);
  };

  const handleVerDetalle = (aprendiz) => setAprendizModal(aprendiz);
  const handleCerrarModal = () => setAprendizModal(null);

  const handleSearchFichas = () => setSearchQueryFichas(searchTermFichas);
  const handleClearFichas = () => {
    setSearchTermFichas('');
    setSearchQueryFichas('');
  };
  const handleSearchAprendices = () => setSearchQueryAprendices(searchTermAprendices);
  const handleClearAprendices = () => {
    setSearchTermAprendices('');
    setSearchQueryAprendices('');
  };

  const goToInicio = () => navigate('/instructor');

  // Modal programar
  const modalProgramar = showProgramar && (
    <div
      className="modal-overlay"
      onClick={() => setShowProgramar(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Programar reunión de seguimiento</h3>
        <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
          Elige el proceso, el momento (inicial, parcial o final) y la fecha.
        </p>

        <form onSubmit={handleProgramar}>
          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 4 }}>Proceso / Aprendiz *</label>
          <select
            value={form.proceso_id}
            onChange={(e) => setForm((f) => ({ ...f, proceso_id: e.target.value }))}
            required
            style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          >
            <option value="">-- Selecciona proceso --</option>
            {procesos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.aprendiz_nombre || `Aprendiz #${p.aprendiz_id}`} — Ficha {p.ficha_numero || p.ficha_id}
              </option>
            ))}
          </select>

          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 4 }}>Momento *</label>
          <select
            value={form.momento}
            onChange={(e) => setForm((f) => ({ ...f, momento: e.target.value }))}
            required
            style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          >
            {MOMENTOS_OPCIONES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 4 }}>Fecha y hora programada *</label>
          <input
            type="datetime-local"
            value={form.fecha_programada}
            onChange={(e) => setForm((f) => ({ ...f, fecha_programada: e.target.value }))}
            required
            style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
          />

          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 4 }}>Observaciones</label>
          <textarea
            value={form.observaciones}
            onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
            rows={3}
            style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 6, border: '1px solid #e5e7eb', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowProgramar(false)}
              style={{ padding: '10px 16px', borderRadius: 6, border: 'none', background: '#e5e7eb', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#3ca203',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {guardando ? 'Guardando...' : 'Programar reunión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return <div className="momentos-container"><p>Cargando momentos...</p></div>;
  }

  if (error) {
    return (
      <div className="momentos-container">
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={cargarMomentos}>Reintentar</button>
      </div>
    );
  }

  // Nivel 3: aprendices de una ficha
  if (fichaSeleccionada) {
    const filtered = (fichaSeleccionada.aprendices || []).filter(
      (ap) =>
        (ap.nombre || '').toLowerCase().includes(searchQueryAprendices.toLowerCase()) ||
        (ap.documento || '').toLowerCase().includes(searchQueryAprendices.toLowerCase())
    );

    return (
      <div className="momento-detalle-pantalla">
        {modalProgramar}
        <div className="detalle-header">
          <button className="btn-volver-lista" onClick={handleVolverFichas}>
            <i className="fas fa-arrow-left" /> Volver a fichas
          </button>
          <h2 className="detalle-titulo">Ficha {fichaSeleccionada.idFicha}</h2>
          <p className="detalle-subtitulo">{fichaSeleccionada.programa}</p>
        </div>

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar aprendiz..."
            value={searchTermAprendices}
            onChange={(e) => setSearchTermAprendices(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchAprendices()}
          />
          <button className="btn-search" onClick={handleSearchAprendices}>Buscar</button>
          <button className="btn-clear" onClick={handleClearAprendices}>Limpiar</button>
        </div>

        <div className="aprendices-lista">
          {filtered.length === 0 ? (
            <p className="sin-registros">No se encontraron aprendices.</p>
          ) : (
            filtered.map((ap, idx) => (
              <div key={idx} className="aprendiz-card">
                <div>
                  <strong>{ap.nombre}</strong>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{ap.documento || ''}</div>
                </div>
                <button className="btn-ver-detalle-aprendiz" onClick={() => handleVerDetalle(ap)}>
                  Ver detalle
                </button>
              </div>
            ))
          )}
        </div>

        {aprendizModal && (
          <div className="modal-overlay" onClick={handleCerrarModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={handleCerrarModal}>&times;</button>
              <h3 className="modal-title">Detalle de Seguimiento</h3>
              <div className="modal-aprendiz-info">
                <p><strong>{aprendizModal.nombre}</strong></p>
                <p>{aprendizModal.documento}</p>
              </div>
              <div className="modal-seguimiento-body">
                <p>{aprendizModal.seguimiento || 'Sin observaciones'}</p>
              </div>
              <div className="modal-actions">
                <button className="btn-cerrar-modal" onClick={handleCerrarModal}>Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Nivel 2: fichas de un momento
  if (momentoSeleccionado) {
    const filteredFichas = (momentoSeleccionado.fichas || []).filter(
      (f) =>
        String(f.idFicha).toLowerCase().includes(searchQueryFichas.toLowerCase()) ||
        (f.programa || '').toLowerCase().includes(searchQueryFichas.toLowerCase())
    );

    return (
      <div className="momento-detalle-pantalla">
        {modalProgramar}
        <div className="detalle-header">
          <button className="btn-volver-lista" onClick={handleVolverMomentos}>
            <i className="fas fa-arrow-left" /> Volver a momentos
          </button>
          <h2 className="detalle-titulo">{momentoSeleccionado.titulo}</h2>
          <p className="detalle-subtitulo">{momentoSeleccionado.descripcion}</p>
        </div>

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar ficha..."
            value={searchTermFichas}
            onChange={(e) => setSearchTermFichas(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchFichas()}
          />
          <button className="btn-search" onClick={handleSearchFichas}>Buscar</button>
          <button className="btn-clear" onClick={handleClearFichas}>Limpiar</button>
        </div>

        <div className="fichas-grid">
          {filteredFichas.length === 0 ? (
            <p className="sin-registros">No se encontraron fichas.</p>
          ) : (
            filteredFichas.map((f) => (
              <div key={f.idFicha} className="ficha-card-click" onClick={() => handleVerFicha(f.idFicha)}>
                <div className="ficha-card-header">
                  <span className="ficha-numero">{f.idFicha}</span>
                  <span className="ficha-cantidad">{(f.aprendices || []).length} aprendices</span>
                </div>
                <div className="ficha-card-body">
                  <span className="ficha-programa">{f.programa}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Nivel 1: tarjetas de momentos + botón programar
  return (
    <div className="momentos-container">
      {modalProgramar}

      <div className="momentos-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2>Seguimiento por Momentos</h2>
          <p className="subtitulo">Selecciona un momento o programa una nueva reunión (inicial, parcial o final).</p>
        </div>
        <button
          onClick={abrirProgramar}
          style={{
            background: '#3ca203',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className="fas fa-calendar-plus" /> Programar reunión
        </button>
      </div>

      <div className="momentos-grid">
        {momentos.map((momento) => (
          <div key={momento.id} className="momento-card-link" onClick={() => handleVerMomento(momento.id)}>
            <div className="momento-card-header">
              <h3>{momento.titulo}</h3>
              <span className="momento-cantidad">{(momento.fichas || []).length} fichas</span>
            </div>
            <p className="momento-descripcion-corta">{momento.descripcion}</p>
            <div className="momento-flecha">
              <i className="fas fa-chevron-right" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeguimientoMomentos;