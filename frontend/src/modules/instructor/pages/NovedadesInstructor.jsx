// src/modules/instructor/pages/NovedadesInstructor.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Breadcrumb from '@/modules/shared/components/Breadcrumb';
import { apiClient } from '@/core/api/client';
import novedadesService from '@/core/services/novedadesService';

const TIPOS_NOVEDAD = [
  { value: 'INCAPACIDAD', label: 'Incapacidad médica' },
  { value: 'RENUNCIA', label: 'Renuncia' },
  { value: 'CAMBIO_EMPRESA', label: 'Cambio de empresa' },
  { value: 'PRORROGA', label: 'Prórroga' },
  { value: 'OTRO', label: 'Otro' },
];

const NovedadesInstructor = () => {
  const [procesos, setProcesos] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroProceso, setFiltroProceso] = useState('');

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

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch {
      return fecha;
    }
  };

  const getInstructorId = () => {
    try {
      const stored = localStorage.getItem('user');
      const user = stored ? JSON.parse(stored) : null;
      return user?.id || null;
    } catch {
      return null;
    }
  };

  // ==========================================================
  // CARGAR PROCESOS ASIGNADOS AL INSTRUCTOR
  // ==========================================================
  const cargarProcesos = async () => {
    const instructorId = getInstructorId();
    if (!instructorId) {
      setError('No se encontró el instructor logueado');
      return;
    }

    try {
      const data = await apiClient.get('/procesos', {
        params: {
          instructor_id: instructorId,
          solo_activos: true,
        },
      });

      const lista = Array.isArray(data) ? data : data?.items || [];
      setProcesos(lista);
    } catch (err) {
      console.error('Error al cargar procesos:', err);
      setError(err.message || 'Error al cargar los procesos asignados');
      setProcesos([]);
    }
  };

  // ==========================================================
  // CARGAR NOVEDADES DE LOS PROCESOS DEL INSTRUCTOR
  // ==========================================================
  const cargarNovedades = async () => {
    const instructorId = getInstructorId();
    if (!instructorId) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Obtener procesos del instructor
      const dataProcesos = await apiClient.get('/procesos', {
        params: {
          instructor_id: instructorId,
          solo_activos: true,
        },
      });
      const listaProcesos = Array.isArray(dataProcesos)
        ? dataProcesos
        : dataProcesos?.items || [];

      setProcesos(listaProcesos);

      // 2. Por cada proceso, obtener sus novedades
      const todas = [];
      for (const p of listaProcesos) {
        try {
          const novs = await novedadesService.listarPorProceso(p.id);
          const listaNovs = Array.isArray(novs) ? novs : [];
          for (const n of listaNovs) {
            todas.push({
              ...n,
              proceso_id: p.id,
              aprendiz_nombre: p.aprendiz_nombre || n.aprendiz_nombre || 'Sin nombre',
              ficha_numero: p.ficha_numero || n.ficha_numero || '—',
            });
          }
        } catch (err) {
          console.warn(`Error cargando novedades del proceso ${p.id}:`, err);
        }
      }

      // Ordenar por fecha descendente
      todas.sort((a, b) => {
        const fa = a.fecha_novedad || a.created_at || '';
        const fb = b.fecha_novedad || b.created_at || '';
        return fb.localeCompare(fa);
      });

      setNovedades(todas);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al cargar novedades');
      setNovedades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNovedades();
  }, []);

  // ==========================================================
  // REGISTRAR NUEVA NOVEDAD
  // ==========================================================
  const handleNuevaNovedad = () => {
    if (procesos.length === 0) {
      Swal.fire({
        title: 'Sin procesos asignados',
        text: 'No tienes procesos activos asignados para registrar novedades.',
        icon: 'warning',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }

    const hoy = new Date().toISOString().slice(0, 10);

    const opcionesProcesos = procesos
      .map(
        (p) =>
          `<option value="${p.id}">${p.aprendiz_nombre || 'Aprendiz'} — Ficha ${p.ficha_numero || p.ficha_id}</option>`
      )
      .join('');

    Swal.fire({
      title: 'Registrar Novedad',
      html: `
        <div style="text-align: left; padding: 8px 0;">
          <div style="margin-bottom: 14px;">
            <label style="display:block; font-weight:600; margin-bottom:5px; font-size:14px;">
              <i class="fas fa-user-graduate" style="color:#3ca203; margin-right:6px;"></i>
              Proceso / Aprendiz *
            </label>
            <select id="procesoNovedad" class="swal2-select" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:6px; font-size:14px;">
              <option value="">Selecciona un proceso...</option>
              ${opcionesProcesos}
            </select>
            <p style="font-size:12px; color:#6b7280; margin:4px 0 0 0;">
              Solo aparecen los procesos que tienes asignados.
            </p>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display:block; font-weight:600; margin-bottom:5px; font-size:14px;">
              <i class="fas fa-tags" style="color:#3ca203; margin-right:6px;"></i>
              Tipo de novedad *
            </label>
            <select id="tipoNovedad" class="swal2-select" style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:6px; font-size:14px;">
              <option value="INCAPACIDAD">Incapacidad médica</option>
              <option value="RENUNCIA">Renuncia</option>
              <option value="CAMBIO_EMPRESA">Cambio de empresa</option>
              <option value="PRORROGA">Prórroga</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display:block; font-weight:600; margin-bottom:5px; font-size:14px;">
              <i class="fas fa-calendar-alt" style="color:#3ca203; margin-right:6px;"></i>
              Fecha de la novedad
            </label>
            <input type="date" id="fechaNovedad" value="${hoy}" class="swal2-input"
              style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:6px; font-size:14px;" />
            <p style="font-size:12px; color:#6b7280; margin:4px 0 0 0;">
              Por defecto es la fecha de hoy.
            </p>
          </div>

          <div style="margin-bottom: 10px;">
            <label style="display:block; font-weight:600; margin-bottom:5px; font-size:14px;">
              <i class="fas fa-align-left" style="color:#3ca203; margin-right:6px;"></i>
              Descripción *
            </label>
            <textarea id="descripcionNovedad" class="swal2-textarea"
              placeholder="Describe la novedad..."
              style="width:100%; padding:10px; border:1px solid #e5e7eb; border-radius:6px; font-size:14px; min-height:90px;"></textarea>
          </div>
        </div>
      `,
      confirmButtonText: 'Registrar',
      confirmButtonColor: '#3ca203',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#6b7280',
      showCancelButton: true,
      width: '540px',
      showLoaderOnConfirm: true,

      preConfirm: async () => {
        const procesoId = document.getElementById('procesoNovedad').value;
        const tipo = document.getElementById('tipoNovedad').value;
        const fecha = document.getElementById('fechaNovedad').value;
        const descripcion = document.getElementById('descripcionNovedad').value.trim();

        if (!procesoId) {
          Swal.showValidationMessage('Selecciona un proceso / aprendiz');
          return false;
        }
        if (!tipo) {
          Swal.showValidationMessage('Selecciona el tipo de novedad');
          return false;
        }
        if (!descripcion || descripcion.length < 5) {
          Swal.showValidationMessage('La descripción debe tener al menos 5 caracteres');
          return false;
        }

        try {
          const payload = {
            tipo_novedad: tipo,
            fecha_novedad: fecha || hoy,
            descripcion: descripcion,
          };

          const creada = await novedadesService.crear(Number(procesoId), payload);
          return creada;
        } catch (err) {
          Swal.showValidationMessage(err.message || 'No se pudo registrar la novedad');
          return false;
        }
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        cargarNovedades();
        Swal.fire({
          title: 'Novedad registrada',
          text: 'La novedad se guardó correctamente en el proceso seleccionado.',
          icon: 'success',
          confirmButtonColor: '#3ca203',
          timer: 2200,
          timerProgressBar: true,
        });
      }
    });
  };

  // ==========================================================
  // FILTRO
  // ==========================================================
  const novedadesFiltradas = filtroProceso
    ? novedades.filter((n) => String(n.proceso_id) === String(filtroProceso))
    : novedades;

  // ==========================================================
  // RENDER
  // ==========================================================
  if (loading) {
    return (
      <div style={{ width: '100%', padding: '20px 0' }}>
        <Breadcrumb />
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px' }} />
          <p>Cargando novedades de tus procesos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100%', padding: '20px 0' }}>
        <Breadcrumb />
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
            onClick={cargarNovedades}
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
    <div style={{ width: '100%', padding: '20px 0' }}>
      <Breadcrumb />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            <i className="fas fa-bullhorn" style={{ marginRight: '10px', color: '#3ca203' }} />
            Novedades
          </h2>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>
            Solo puedes registrar novedades en los procesos que tienes asignados
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
          <i className="fas fa-plus" /> Registrar novedad
        </button>
      </div>

      {/* Filtro por proceso */}
      {procesos.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <select
            value={filtroProceso}
            onChange={(e) => setFiltroProceso(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              minWidth: '260px',
              background: 'white',
            }}
          >
            <option value="">Todos los procesos asignados</option>
            {procesos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.aprendiz_nombre || 'Aprendiz'} — Ficha {p.ficha_numero || p.ficha_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabla */}
      {novedadesFiltradas.length === 0 ? (
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
          <i className="fas fa-folder-open" style={{ fontSize: '40px', marginBottom: '12px', color: '#9ca3af' }} />
          <h3 style={{ margin: '0 0 6px 0', color: '#374151' }}>
            {procesos.length === 0
              ? 'No tienes procesos asignados'
              : 'No hay novedades registradas'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {procesos.length === 0
              ? 'Cuando te asignen procesos podrás registrar novedades aquí.'
              : 'Haz clic en “Registrar novedad” para crear la primera.'}
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
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '13px', color: '#6b7280' }}>
                  Aprendiz
                </th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '13px', color: '#6b7280' }}>
                  Ficha
                </th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '13px', color: '#6b7280' }}>
                  Tipo
                </th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '13px', color: '#6b7280' }}>
                  Descripción
                </th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '13px', color: '#6b7280' }}>
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody>
              {novedadesFiltradas.map((n) => (
                <tr key={n.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '13px 16px', fontWeight: 600 }}>
                    {n.aprendiz_nombre || '—'}
                  </td>
                  <td style={{ padding: '13px 16px', color: '#6b7280' }}>
                    {n.ficha_numero || '—'}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span
                      style={{
                        background: '#ecfdf5',
                        color: '#065f46',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {tituloDesdeTipo(n.tipo_novedad)}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '13px 16px',
                      color: '#374151',
                      maxWidth: '280px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={n.descripcion}
                  >
                    {n.descripcion}
                  </td>
                  <td style={{ padding: '13px 16px', color: '#6b7280' }}>
                    {formatearFecha(n.fecha_novedad)}
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

export default NovedadesInstructor;