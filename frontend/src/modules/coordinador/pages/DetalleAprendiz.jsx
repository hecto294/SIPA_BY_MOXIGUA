// src/modules/coordinador/pages/DetalleAprendiz.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Breadcrumb from '@/modules/shared/components/Breadcrumb';
import { procesoService } from '@/core/services/procesoService';
import EvaluacionFinalModal from '../components/EvaluacionFinalModal';

const ESTADOS_PROCESO = [
  { value: 'ACTIVO', label: 'Activo (En formación)' },
  { value: 'CONDICIONADO', label: 'Condicionado' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'APLAZADO', label: 'Aplazado' },
  { value: 'RETIRADO', label: 'Retirado' },
];

const DetalleAprendiz = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const procesoOriginal = location.state?.proceso;
  const [proceso, setProceso] = useState(procesoOriginal);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(
    procesoOriginal?.estado || 'ACTIVO'
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState([]);
  const [cargandoChecklist, setCargandoChecklist] = useState(false);
  const [subiendoId, setSubiendoId] = useState(null); // id del ítem que se está subiendo
  const [mensajeChecklist, setMensajeChecklist] = useState({ tipo: '', texto: '' });

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch {
      return fecha;
    }
  };

  const getEstadoConfig = (estado) => {
    switch (estado) {
      case 'ACTIVO':
        return { color: '#10b981', icono: 'fa-check-circle', etiqueta: 'En formación' };
      case 'CONDICIONADO':
        return { color: '#f59e0b', icono: 'fa-exclamation-triangle', etiqueta: 'Condicionado' };
      case 'FINALIZADO':
        return { color: '#3b82f6', icono: 'fa-flag-checkered', etiqueta: 'Finalizado' };
      case 'APLAZADO':
        return { color: '#8b5cf6', icono: 'fa-pause-circle', etiqueta: 'Aplazado' };
      case 'RETIRADO':
        return { color: '#ef4444', icono: 'fa-times-circle', etiqueta: 'Retirado' };
      default:
        return { color: '#6b7280', icono: 'fa-circle', etiqueta: estado || 'Sin estado' };
    }
  };

  const getEstadoDocConfig = (estado) => {
    switch (estado) {
      case 'ENTREGADO':
        return { color: '#10b981', bg: '#d1fae5', label: 'Entregado' };
      case 'PENDIENTE':
        return { color: '#f59e0b', bg: '#fef3c7', label: 'Pendiente' };
      case 'NO_APLICA':
        return { color: '#6b7280', bg: '#f3f4f6', label: 'No aplica' };
      default:
        return { color: '#6b7280', bg: '#f3f4f6', label: estado || '—' };
    }
  };

  const getIniciales = (nombre) => {
    if (!nombre) return '??';
    const partes = nombre.split(' ');
    if (partes.length >= 2) {
      return `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  };

  // Cargar checklist al montar
  useEffect(() => {
    if (!proceso?.id) return;

    const cargar = async () => {
      setCargandoChecklist(true);
      try {
        const data = await procesoService.getChecklist(proceso.id);
        setChecklist(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error cargando checklist:', err);
        setChecklist([]);
      } finally {
        setCargandoChecklist(false);
      }
    };

    cargar();
  }, [proceso?.id]);

  const handleGuardarEstado = async () => {
    if (!proceso?.id) return;
    if (estadoSeleccionado === proceso.estado) {
      setMensaje({ tipo: 'info', texto: 'El estado ya está seleccionado.' });
      return;
    }

    setGuardando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const actualizado = await procesoService.updateProceso(proceso.id, {
        estado: estadoSeleccionado,
      });

      setProceso({ ...proceso, estado: actualizado.estado || estadoSeleccionado });
      setMensaje({
        tipo: 'success',
        texto: `Estado actualizado a "${ESTADOS_PROCESO.find((e) => e.value === estadoSeleccionado)?.label}" correctamente.`,
      });
    } catch (error) {
      console.error(error);
      setMensaje({
        tipo: 'error',
        texto: error.message || 'No se pudo actualizar el estado. Intenta de nuevo.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleSubirEvidencia = async (itemId, file) => {
    if (!file) return;

    setSubiendoId(itemId);
    setMensajeChecklist({ tipo: '', texto: '' });

    try {
      const actualizado = await procesoService.subirEvidenciaChecklist(itemId, file);

      // Actualizar el ítem en el estado local
      setChecklist((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                estado: actualizado.estado || 'ENTREGADO',
                evidencia_archivo_id: actualizado.evidencia_archivo_id,
              }
            : item
        )
      );

      setMensajeChecklist({
        tipo: 'success',
        texto: `Evidencia asociada correctamente a "${actualizado.tipo_documento || 'el documento'}".`,
      });
    } catch (error) {
      console.error(error);
      setMensajeChecklist({
        tipo: 'error',
        texto: error.message || 'No se pudo subir la evidencia. Intenta de nuevo.',
      });
    } finally {
      setSubiendoId(null);
    }
  };

  if (!proceso) {
    return (
      <div style={{ width: '100%', padding: '20px 0' }}>
        <Breadcrumb />
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            border: '1px solid #e5e7eb',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <i className="fas fa-user-slash" style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px' }} />
          <h3 style={{ color: '#dc2626' }}>Aprendiz no encontrado</h3>
          <p style={{ color: '#6b7280' }}>
            Por favor, vuelve a la lista de aprendices y haz clic en "Ver".
          </p>
          <button
            onClick={() => navigate('/coordinador/aprendices')}
            style={{
              background: '#3ca203',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              marginTop: '16px',
            }}
          >
            Volver a aprendices
          </button>
        </div>
      </div>
    );
  }

  const config = getEstadoConfig(proceso.estado);
  const nombreCompleto = proceso.aprendiz_nombre || 'Sin nombre';

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <Breadcrumb />

      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* ==================== CABECERA ==================== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
          <div
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: '#3ca203',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
            }}
          >
            {getIniciales(nombreCompleto)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>{nombreCompleto}</h2>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              {proceso.aprendiz_documento || 'Sin documento'} · {proceso.aprendiz_email || 'Sin correo'}
            </p>
          </div>
        </div>

        {/* ==================== DATOS DEL PROCESO ==================== */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '16px', color: '#374151', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
            Información del proceso
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Ficha</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px' }}>{proceso.ficha_numero || '-'}</p>
            </div>
            <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Programa</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px' }}>{proceso.programa_nombre || '-'}</p>
            </div>
            <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Modalidad</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px' }}>{proceso.modalidad_nombre || '-'}</p>
            </div>
            <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Empresa</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px' }}>{proceso.empresa_nombre || 'Sin asignar'}</p>
            </div>
            <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>ARL</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px' }}>{proceso.arl || 'Sin asignar'}</p>
            </div>
            <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Estado actual</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px', color: config.color }}>
                <i className={`fas ${config.icono}`} style={{ marginRight: '6px' }} />
                {config.etiqueta}
              </p>
            </div>
            <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Fecha Inicio</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px' }}>{formatearFecha(proceso.fecha_inicio)}</p>
            </div>
            <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Fecha Fin</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px' }}>{formatearFecha(proceso.fecha_fin)}</p>
            </div>
          </div>
        </div>

        {/* ==================== CAMBIAR ESTADO (Tarea 1) ==================== */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#166534', fontWeight: '600' }}>
            <i className="fas fa-exchange-alt" style={{ marginRight: '8px' }} />
            Cambiar estado del proceso
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <select
              value={estadoSeleccionado}
              onChange={(e) => setEstadoSeleccionado(e.target.value)}
              disabled={guardando}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                minWidth: '220px',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              {ESTADOS_PROCESO.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleGuardarEstado}
              disabled={guardando || estadoSeleccionado === proceso.estado}
              style={{
                background: guardando || estadoSeleccionado === proceso.estado ? '#9ca3af' : '#3ca203',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: guardando || estadoSeleccionado === proceso.estado ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {guardando ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-save" /> Guardar estado
                </>
              )}
            </button>
          </div>

          {mensaje.texto && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                background:
                  mensaje.tipo === 'success' ? '#d1fae5' : mensaje.tipo === 'error' ? '#fee2e2' : '#e0f2fe',
                color:
                  mensaje.tipo === 'success' ? '#065f46' : mensaje.tipo === 'error' ? '#991b1b' : '#075985',
              }}
            >
              {mensaje.texto}
            </div>
          )}
        </div>

        {/* ==================== CHECKLIST DOCUMENTAL (Tarea 2) ==================== */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#1e293b', fontWeight: '600' }}>
            <i className="fas fa-clipboard-list" style={{ marginRight: '8px' }} />
            Checklist documental – Asociar evidencias
          </h3>

          {cargandoChecklist ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              <i className="fas fa-spinner fa-spin" /> Cargando checklist...
            </p>
          ) : checklist.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              No hay ítems de checklist registrados para este proceso.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {checklist.map((item) => {
                const docConfig = getEstadoDocConfig(item.estado);
                const estaSubiendo = subiendoId === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                        {item.tipo_documento}
                      </p>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '4px',
                          padding: '2px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: docConfig.bg,
                          color: docConfig.color,
                        }}
                      >
                        {docConfig.label}
                      </span>
                      {item.evidencia_archivo_id && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#64748b' }}>
                          <i className="fas fa-paperclip" /> Evidencia cargada
                        </span>
                      )}
                    </div>

                    <div>
                      <label
                        style={{
                          background: estaSubiendo ? '#94a3b8' : '#3ca203',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          cursor: estaSubiendo ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {estaSubiendo ? (
                          <>
                            <i className="fas fa-spinner fa-spin" /> Subiendo...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-upload" /> Subir evidencia
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          style={{ display: 'none' }}
                          disabled={estaSubiendo}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleSubirEvidencia(item.id, file);
                              e.target.value = ''; // reset
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mensajeChecklist.texto && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                background:
                  mensajeChecklist.tipo === 'success'
                    ? '#d1fae5'
                    : mensajeChecklist.tipo === 'error'
                    ? '#fee2e2'
                    : '#e0f2fe',
                color:
                  mensajeChecklist.tipo === 'success'
                    ? '#065f46'
                    : mensajeChecklist.tipo === 'error'
                    ? '#991b1b'
                    : '#075985',
              }}
            >
              {mensajeChecklist.texto}
            </div>
          )}
        </div>


        {/* ==================== RF-050: EVALUACIÓN FINAL ==================== */}
        <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: '20px', marginTop: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-clipboard-check" style={{ color: '#3ca203' }} />
            Evaluación Final 
          </h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ background: '#f9fafb', padding: '12px 20px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Nota Empresa</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px', color: '#3ca203' }}>{proceso.nota_empresa != null ? proceso.nota_empresa : 'Sin evaluar'}</p>
            </div>
            <div style={{ background: '#f9fafb', padding: '12px 20px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Nota Instructor</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px', color: '#3ca203' }}>{proceso.nota_instructor != null ? proceso.nota_instructor : 'Sin evaluar'}</p>
            </div>
            <div style={{ background: '#f9fafb', padding: '12px 20px', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold' }}>Estado SOFIA-HEC</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '16px', color: '#3ca203' }}>{proceso.estado_sofia || 'PENDIENTE'}</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} style={{ background: '#3ca203', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-edit" /> Registrar / Actualizar Evaluación
            </button>
          </div>
        </div>


        {/* ==================== BOTÓN VOLVER ==================== */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '10px',
            paddingTop: '20px',
            borderTop: '2px solid #e5e7eb',
          }}
        >
          <button
            onClick={() => navigate('/coordinador/aprendices')}
            style={{
              background: '#e5e7eb',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
            }}
          >
            <i className="fas fa-arrow-left" /> Volver
          </button>
        </div>
      </div>

      {/* RF-050: Modal de Evaluación Final */}
      <EvaluacionFinalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        proceso={proceso}
        onSuccess={() => {
          setIsModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
};

export default DetalleAprendiz;