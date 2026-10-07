// src/modules/coordinador/pages/ReporteFichaDetalle.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '@/modules/shared/components/Breadcrumb';
import Swal from 'sweetalert2';
import { reporteService } from '@/core/services/reporteService';

const ReporteFichaDetalle = () => {
  const navigate = useNavigate();
  const { idFicha } = useParams();

  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    cargarDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFicha]);

  const cargarDetalle = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reporteService.getFichaDetalleReporte(idFicha);
      console.log('📊 Detalle ficha:', data);
      setFicha(data);
    } catch (err) {
      console.error('Error al cargar detalle:', err);
      setError(err.message || 'Error al cargar el detalle');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleClear = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch {
      return fecha;
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'Completado' || estado === 'Subida' || estado === 'APROBADA' || estado === 'ENVIADA') return '#10b981';
    if (estado === 'En proceso' || estado === 'En revisión' || estado === 'BORRADOR' || estado === 'CON_OBSERVACIONES') return '#f59e0b';
    return '#ef4444';
  };

  const getEstadoBadge = (estado) => {
    const colors = {
      'Completado': { bg: '#d1fae5', text: '#047857' },
      'Subida': { bg: '#d1fae5', text: '#047857' },
      'APROBADA': { bg: '#d1fae5', text: '#047857' },
      'ENVIADA': { bg: '#d1fae5', text: '#047857' },
      'En proceso': { bg: '#fef3c7', text: '#d97706' },
      'En revisión': { bg: '#fef3c7', text: '#d97706' },
      'BORRADOR': { bg: '#fef3c7', text: '#d97706' },
      'CON_OBSERVACIONES': { bg: '#fef3c7', text: '#d97706' },
      'Pendiente': { bg: '#f3f4f6', text: '#6b7280' },
    };
    return colors[estado] || { bg: '#f3f4f6', text: '#6b7280' };
  };

  // 🔥 Badge para el estado del aprendiz (ACTIVO → En formación, APLAZADO → Condicionado)
  const getEstadoAprendizBadge = (estado) => {
    const normalized = (estado || '').toUpperCase();
    const configs = {
      'ACTIVO': { bg: '#d1fae5', text: '#047857', label: '🟢 En formación' },
      'FINALIZADO': { bg: '#dbeafe', text: '#1e40af', label: '🔵 Finalizado' },
      'APLAZADO': { bg: '#fef3c7', text: '#d97706', label: '🟡 Condicionado' },
      'RETIRADO': { bg: '#fee2e2', text: '#dc2626', label: '🔴 Retirado' },
    };
    return configs[normalized] || { bg: '#f3f4f6', text: '#6b7280', label: estado || 'Sin estado' };
  };

  // 🔥 Texto del estado para el modal (con los mismos textos)
  const getEstadoTexto = (estado) => {
    const normalized = (estado || '').toUpperCase();
    const textos = {
      'ACTIVO': 'En formación',
      'FINALIZADO': 'Finalizado',
      'APLAZADO': 'Condicionado',
      'RETIRADO': 'Retirado',
    };
    return textos[normalized] || estado || 'Sin estado';
  };

  const handleVerDetalle = (aprendiz) => {
    Swal.fire({
      title: `📋 ${aprendiz.nombre}`,
      html: `
        <div style="text-align: left; padding: 10px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><strong>Documento:</strong></div><div>${aprendiz.documento}</div>
            <div><strong>Email:</strong></div><div>${aprendiz.email}</div>
            <div><strong>Teléfono:</strong></div><div>${aprendiz.telefono}</div>
            <div><strong>Empresa:</strong></div><div>${aprendiz.empresa}</div>
            <div><strong>ARL:</strong></div><div>${aprendiz.arl}</div>
            <div><strong>Estado:</strong></div><div><span style="color: ${aprendiz.estado === 'ACTIVO' || aprendiz.estado === 'Activo' ? '#10b981' : '#ef4444'}; font-weight: bold;">${getEstadoTexto(aprendiz.estado)}</span></div>
            <div><strong>Fechas:</strong></div><div>${formatearFecha(aprendiz.fechaInicio)} - ${formatearFecha(aprendiz.fechaFin)}</div>
          </div>
          <hr style="border: 1px solid #e5e7eb; margin: 15px 0;" />
          <div style="margin-bottom: 10px;">
            <strong>📌 Momentos:</strong>
            <div style="display: flex; gap: 10px; margin-top: 5px; flex-wrap: wrap;">
              <span style="background: ${getEstadoColor(aprendiz.momentos.momento1)}20; padding: 2px 10px; border-radius: 12px; font-size: 12px; border: 1px solid ${getEstadoColor(aprendiz.momentos.momento1)};">M1: ${aprendiz.momentos.momento1}</span>
              <span style="background: ${getEstadoColor(aprendiz.momentos.momento2)}20; padding: 2px 10px; border-radius: 12px; font-size: 12px; border: 1px solid ${getEstadoColor(aprendiz.momentos.momento2)};">M2: ${aprendiz.momentos.momento2}</span>
              <span style="background: ${getEstadoColor(aprendiz.momentos.momento3)}20; padding: 2px 10px; border-radius: 12px; font-size: 12px; border: 1px solid ${getEstadoColor(aprendiz.momentos.momento3)};">M3: ${aprendiz.momentos.momento3}</span>
            </div>
          </div>
          <div>
            <strong>📖 Bitácoras:</strong>
            <div style="display: flex; gap: 10px; margin-top: 5px; flex-wrap: wrap;">
              <span style="background: ${getEstadoColor(aprendiz.bitacoras.bimestre1)}20; padding: 2px 10px; border-radius: 12px; font-size: 12px; border: 1px solid ${getEstadoColor(aprendiz.bitacoras.bimestre1)};">B1: ${aprendiz.bitacoras.bimestre1}</span>
              <span style="background: ${getEstadoColor(aprendiz.bitacoras.bimestre2)}20; padding: 2px 10px; border-radius: 12px; font-size: 12px; border: 1px solid ${getEstadoColor(aprendiz.bitacoras.bimestre2)};">B2: ${aprendiz.bitacoras.bimestre2}</span>
              <span style="background: ${getEstadoColor(aprendiz.bitacoras.bimestre3)}20; padding: 2px 10px; border-radius: 12px; font-size: 12px; border: 1px solid ${getEstadoColor(aprendiz.bitacoras.bimestre3)};">B3: ${aprendiz.bitacoras.bimestre3}</span>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>Avance General:</strong>
              <span style="font-weight: bold; color: ${getEstadoColor(aprendiz.avance >= 80 ? 'Completado' : aprendiz.avance >= 50 ? 'En proceso' : 'Pendiente')};">${aprendiz.avance}%</span>
            </div>
            <div style="width: 100%; height: 8px; background: #f3f4f6; border-radius: 10px; overflow: hidden; margin-top: 5px;">
              <div style="width: ${aprendiz.avance}%; height: 100%; background: ${getEstadoColor(aprendiz.avance >= 80 ? 'Completado' : aprendiz.avance >= 50 ? 'En proceso' : 'Pendiente')}; border-radius: 10px;"></div>
            </div>
          </div>
        </div>
      `,
      icon: 'info',
      iconColor: '#3ca203',
      confirmButtonColor: '#3ca203',
      confirmButtonText: 'Cerrar',
      width: '550px',
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
        <p style={{ marginTop: '15px' }}>Cargando detalle...</p>
      </div>
    );
  }

  if (error || !ficha) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#dc2626' }}></i>
        <h3 style={{ color: '#dc2626', marginTop: '15px' }}>Error al cargar detalle</h3>
        <p style={{ color: '#6b7280' }}>{error}</p>
        <button onClick={() => navigate('/coordinador/reportes')} style={{ background: '#3ca203', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', marginTop: '15px' }}>
          <i className="fas fa-arrow-left" /> Volver
        </button>
      </div>
    );
  }

  const filteredAprendices = (ficha.aprendices || []).filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.nombre || '').toLowerCase().includes(q) ||
      (a.documento || '').toLowerCase().includes(q) ||
      (a.empresa || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <Breadcrumb />

      <button
        onClick={() => navigate('/coordinador/reportes')}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#3ca203',
          cursor: 'pointer',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        <i className="fas fa-arrow-left" /> Volver a reportes
      </button>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          Ficha {ficha.numero_ficha} - {ficha.programa}
        </h2>
        <p style={{ color: '#6b7280', margin: '5px 0 0 0' }}>
          Instructor: {ficha.instructor} • {(ficha.aprendices || []).length} aprendices
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, documento o empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
        />
        <button onClick={handleSearch} style={{ background: '#3ca203', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Buscar</button>
        <button onClick={handleClear} style={{ background: '#e5e7eb', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Limpiar</button>
      </div>

      {filteredAprendices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <i className="fas fa-user-slash" style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '16px' }} />
          <h3 style={{ color: '#6b7280' }}>No hay aprendices registrados</h3>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280' }}>Aprendiz</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Documento</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Estado</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Empresa</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Momentos</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Bitácoras</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Avance</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredAprendices.map((a) => {
                const m1 = getEstadoBadge(a.momentos?.momento1);
                const m2 = getEstadoBadge(a.momentos?.momento2);
                const m3 = getEstadoBadge(a.momentos?.momento3);
                const b1 = getEstadoBadge(a.bitacoras?.bimestre1);
                const b2 = getEstadoBadge(a.bitacoras?.bimestre2);
                const b3 = getEstadoBadge(a.bitacoras?.bimestre3);
                const estadoAprendiz = getEstadoAprendizBadge(a.estado);

                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{a.nombre}</td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      {a.documento && a.documento !== '—' ? a.documento : 'Sin asignar'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <span
                        style={{
                          background: estadoAprendiz.bg,
                          color: estadoAprendiz.text,
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {estadoAprendiz.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>{a.empresa}</td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <span style={{ background: m1.bg, color: m1.text, padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>M1</span>
                        <span style={{ background: m2.bg, color: m2.text, padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>M2</span>
                        <span style={{ background: m3.bg, color: m3.text, padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>M3</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <span style={{ background: b1.bg, color: b1.text, padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>B1</span>
                        <span style={{ background: b2.bg, color: b2.text, padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>B2</span>
                        <span style={{ background: b3.bg, color: b3.text, padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>B3</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: a.avance >= 80 ? '#10b981' : a.avance >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {a.avance}%
                        </span>
                        <div style={{ width: '50px', height: '6px', background: '#f3f4f6', borderRadius: '10px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${a.avance}%`,
                              height: '100%',
                              background: a.avance >= 80 ? '#10b981' : a.avance >= 50 ? '#f59e0b' : '#ef4444',
                              borderRadius: '10px',
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px' }}>
                      <button
                        onClick={() => handleVerDetalle(a)}
                        style={{
                          background: '#e6f7ed',
                          color: '#047857',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="fas fa-eye" /> Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReporteFichaDetalle;