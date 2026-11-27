// src/modules/aprendiz/pages/Novedades.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Breadcrumb from '../../shared/components/Breadcrumb';
import { apiClient } from '@/core/api/client';
import { validarPdf } from '@/core/utils/validarPdf';
import novedadesService from '@/core/services/novedadesService';

const Novedades = () => {
  const [novedades, setNovedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==========================================================
  // HELPERS
  // ==========================================================
  const tituloDesdeTipo = (tipo) => {
    const map = {
      INCAPACIDAD: 'Incapacidad médica',
      RENUNCIA: 'Renuncia',
      CAMBIO_EMPRESA: 'Cambio de empresa',
      PRORROGA: 'Prórroga',
      OTRO: 'Otro',
    };
    return map[tipo] || tipo || 'Novedad';
  };

  const tipoBonito = (tipo) => {
    const map = {
      INCAPACIDAD: 'Incapacidad',
      RENUNCIA: 'Renuncia',
      CAMBIO_EMPRESA: 'Cambio de empresa',
      PRORROGA: 'Prórroga',
      OTRO: 'Otro',
    };
    return map[tipo] || tipo || 'Otro';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return d.toLocaleDateString('es-ES');
    } catch {
      return fecha;
    }
  };

  // ==========================================================
  // CARGAR NOVEDADES
  // ==========================================================
  const cargarNovedades = async () => {
    try {
      setLoading(true);
      setError(null);

      // Intentar endpoint del usuario
      let data = null;
      try {
        data = await apiClient.get('/usuarios/me/novedades');
      } catch {
        // Fallback: obtener proceso y listar novedades del proceso
        const me = await apiClient.get('/usuarios/me');
        const procesos = await apiClient.get('/procesos', {
          params: { aprendiz_id: me.id, solo_activos: true },
        });
        const lista = Array.isArray(procesos) ? procesos : (procesos?.items || []);
        if (lista.length > 0) {
          const novedadesProceso = await novedadesService.listarPorProceso(lista[0].id);
          data = { novedades: Array.isArray(novedadesProceso) ? novedadesProceso : [] };
        } else {
          data = { novedades: [] };
        }
      }

      const novedadesFormateadas = (data?.novedades || []).map((n) => ({
        id: n.id,
        titulo: tituloDesdeTipo(n.tipo_novedad || n.tipo),
        descripcion: n.descripcion,
        fecha: formatearFecha(n.fecha_novedad || n.fecha),
        tipo: tipoBonito(n.tipo_novedad || n.tipo),
        estado: n.estado || 'Registrada',
        archivo: n.archivo || null,
        documento_soporte_url: n.documento_soporte_url || null,
      }));

      setNovedades(novedadesFormateadas);
    } catch (err) {
      console.error('Error al cargar novedades:', err);
      setError(err.message || 'Error al cargar las novedades');
      setNovedades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNovedades();
  }, []);

  // ==========================================================
  // REPORTAR NUEVA NOVEDAD
  // ==========================================================
  const handleNuevaNovedad = async () => {
    // Obtener el proceso activo del aprendiz
    let procesoId = null;
    try {
      const me = await apiClient.get('/usuarios/me');
      if (me?.proceso_activo_id) {
        procesoId = me.proceso_activo_id;
      } else {
        const procesos = await apiClient.get('/procesos', {
          params: { aprendiz_id: me.id, solo_activos: true },
        });
        const lista = Array.isArray(procesos) ? procesos : (procesos?.items || []);
        if (lista.length > 0) {
          procesoId = lista[0].id;
        }
      }
    } catch (err) {
      console.error(err);
    }

    if (!procesoId) {
      Swal.fire({
        title: 'Sin proceso activo',
        text: 'No se encontró un proceso de etapa productiva activo para registrar la novedad.',
        icon: 'warning',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    Swal.fire({
      title: '📢 Reportar Novedad',
      html: `
        <div style="text-align: left; padding: 10px 0;">
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #1f2937; font-size: 14px;">
              <i class="fas fa-tags" style="color: #3ca203; margin-right: 8px;"></i> Tipo de Novedad *
            </label>
            <select id="tipoNovedad" class="swal2-select" style="width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px;">
              <option value="INCAPACIDAD">Incapacidad médica</option>
              <option value="RENUNCIA">Renuncia</option>
              <option value="CAMBIO_EMPRESA">Cambio de empresa</option>
              <option value="PRORROGA">Prórroga</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #1f2937; font-size: 14px;">
              <i class="fas fa-calendar-alt" style="color: #3ca203; margin-right: 8px;"></i> Fecha de la novedad
            </label>
            <input 
              type="date" 
              id="fechaNovedad" 
              value="${hoy}"
              class="swal2-input" 
              style="width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px;"
            />
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
              Por defecto es la fecha de hoy. Puedes cambiarla si es necesario.
            </p>
          </div>

          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #1f2937; font-size: 14px;">
              <i class="fas fa-align-left" style="color: #3ca203; margin-right: 8px;"></i> Justificación / Descripción *
            </label>
            <textarea id="descripcionNovedad" class="swal2-textarea" placeholder="Describe el motivo de tu novedad..." style="width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px; min-height: 100px;"></textarea>
          </div>

          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #1f2937; font-size: 14px;">
              <i class="fas fa-paperclip" style="color: #3ca203; margin-right: 8px;"></i> Adjuntar evidencia (PDF - opcional)
            </label>
            <input type="file" id="archivoNovedad" class="swal2-file" accept="application/pdf" style="width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px;">
            <p id="archivoNovedad-error" style="font-size: 12px; color: #dc2626; margin: 4px 0 0 0; display: none; font-weight: 600;">
              ❌ Solo se permiten archivos PDF
            </p>
          </div>
        </div>
      `,
      confirmButtonText: '📢 Reportar',
      confirmButtonColor: '#3ca203',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#6b7280',
      showCancelButton: true,
      width: '520px',
      showLoaderOnConfirm: true,

      didOpen: () => {
        const input = document.getElementById('archivoNovedad');
        const errorMsg = document.getElementById('archivoNovedad-error');
        if (input) {
          input.value = '';
          if (errorMsg) errorMsg.style.display = 'none';
          input.addEventListener('change', async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = await validarPdf(f, 5);
            if (!r.ok) {
              if (errorMsg) {
                errorMsg.textContent = r.msg;
                errorMsg.style.display = 'block';
              }
              input.value = '';
            } else {
              if (errorMsg) errorMsg.style.display = 'none';
            }
          });
        }
      },

      preConfirm: async () => {
        const tipo = document.getElementById('tipoNovedad').value;
        const fecha = document.getElementById('fechaNovedad').value;
        const descripcion = document.getElementById('descripcionNovedad').value.trim();
        const archivoInput = document.getElementById('archivoNovedad');
        const archivo = archivoInput.files[0];

        if (!tipo) {
          Swal.showValidationMessage('⚠️ Por favor selecciona el tipo de novedad');
          return false;
        }
        if (!descripcion) {
          Swal.showValidationMessage('⚠️ Por favor ingresa la justificación');
          return false;
        }
        if (archivo) {
          const r = await validarPdf(archivo, 5);
          if (!r.ok) {
            Swal.showValidationMessage(r.msg);
            return false;
          }
        }

        try {
          const payload = {
            tipo_novedad: tipo,
            fecha_novedad: fecha || hoy,
            descripcion: descripcion,
          };

          const creada = await novedadesService.crear(procesoId, payload);

          return {
            id: creada.id,
            tipo: tipo,
            descripcion: descripcion,
            fecha: creada.fecha_novedad || fecha || hoy,
            archivo: archivo ? archivo.name : null,
          };
        } catch (err) {
          Swal.showValidationMessage(err.message || 'No se pudo registrar la novedad');
          return false;
        }
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        cargarNovedades();

        Swal.fire({
          title: '✅ Novedad reportada',
          text: 'Tu novedad ha sido enviada y guardada correctamente.',
          icon: 'success',
          confirmButtonColor: '#3ca203',
          timer: 2200,
          timerProgressBar: true,
        });
      }
    });
  };

  // ==========================================================
  // VER ARCHIVO
  // ==========================================================
  const handleVerArchivo = (novedad) => {
    if (!novedad.archivo && !novedad.documento_soporte_url) {
      Swal.fire({
        title: '⚠️ Sin archivo adjunto',
        text: 'Esta novedad no tiene archivo adjunto.',
        icon: 'warning',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    if (novedad.documento_soporte_url) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = novedad.documento_soporte_url.startsWith('http')
        ? novedad.documento_soporte_url
        : `${baseUrl}${novedad.documento_soporte_url}`;
      window.open(url, '_blank');
      return;
    }

    Swal.fire({
      title: `📄 ${novedad.archivo}`,
      text: 'El archivo está registrado, pero no hay URL disponible para abrirlo.',
      icon: 'info',
      confirmButtonColor: '#3ca203',
    });
  };

  // ==========================================================
  // ESTADOS DE CARGA / ERROR
  // ==========================================================
  if (loading) {
    return (
      <div className="novedades-container" style={{ width: '100%', padding: '20px 0' }}>
        <Breadcrumb />
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '40px', color: '#3ca203' }}></i>
          <p style={{ marginTop: '15px', color: '#6b7280' }}>Cargando novedades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="novedades-container" style={{ width: '100%', padding: '20px 0' }}>
        <Breadcrumb />
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#dc2626' }}></i>
          <h3 style={{ color: '#dc2626' }}>Error</h3>
          <p style={{ color: '#6b7280' }}>{error}</p>
          <button
            onClick={cargarNovedades}
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
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER PRINCIPAL
  // ==========================================================
  return (
    <div className="novedades-container" style={{ width: '100%', padding: '20px 0' }}>
      <Breadcrumb />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          marginTop: '10px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Novedades</h2>
          <p style={{ color: '#6b7280', margin: '5px 0 0 0' }}>
            Reporta y visualiza las novedades de tu proceso.
          </p>
        </div>
        <button
          onClick={handleNuevaNovedad}
          style={{
            background: '#3ca203',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="fas fa-plus" /> Reportar Novedad
        </button>
      </div>

      <div
        style={{
          marginBottom: '20px',
          background: '#f8fafc',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
          <i className="fas fa-info-circle" style={{ color: '#3ca203', marginRight: '8px' }} />
          Las novedades reportadas serán revisadas por el Coordinador de Etapa Productiva.
        </p>
      </div>

      {novedades.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <i className="fas fa-folder-open" style={{ fontSize: '48px', color: '#9ca3af' }}></i>
          <h3 style={{ color: '#6b7280', marginTop: '15px' }}>No tienes novedades registradas</h3>
          <p style={{ color: '#9ca3af' }}>
            Haz clic en “Reportar Novedad” para crear la primera.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', color: '#6b7280' }}>
                  Tipo
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', color: '#6b7280' }}>
                  Descripción
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', color: '#6b7280' }}>
                  Fecha
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', color: '#6b7280' }}>
                  Estado
                </th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
                  Archivo
                </th>
              </tr>
            </thead>
            <tbody>
              {novedades.map((n) => (
                <tr key={n.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{n.tipo}</td>
                  <td style={{ padding: '14px 16px', color: '#374151', maxWidth: '320px' }}>
                    {n.descripcion}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280' }}>{n.fecha}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        background: '#d1fae5',
                        color: '#065f46',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {n.estado}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {(n.archivo || n.documento_soporte_url) && (
                      <button
                        onClick={() => handleVerArchivo(n)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#3ca203',
                          cursor: 'pointer',
                          fontSize: '16px',
                        }}
                        title="Ver archivo"
                      >
                        <i className="fas fa-paperclip" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Novedades;