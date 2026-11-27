import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { procesoService } from '@/core/services/procesoService';
import { apiClient } from '@/core/api/client';
import { showSuccess, showError } from '@/core/utils/sweetAlert';

const toList = (r) => (Array.isArray(r) ? r : r?.items || r?.data || []);

const CrearProceso = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aprendices, setAprendices] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [coordinadores, setCoordinadores] = useState([]);
  const [instructores, setInstructores] = useState([]);

  const [form, setForm] = useState({
    aprendiz_id: '',
    ficha_id: '',
    modalidad_id: '',
    empresa_id: '',
    coordinador_empresa_id: '',
    instructor_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
  });

  // Carga cada lista por separado: si una falla, las demás igual se muestran
  useEffect(() => {
    const cargar = async () => {
      const peticiones = [
        ['aprendices',   () => apiClient.get('/usuarios/', { params: { rol_id: 4, limit: 200 } }), setAprendices],
        ['fichas',       () => apiClient.get('/fichas', { params: { limit: 100 } }), setFichas],
        ['modalidades',  () => apiClient.get('/modalidades/'), setModalidades],
        ['empresas',     () => apiClient.get('/empresas/', { params: { limit: 100 } }), setEmpresas],
        ['instructores', () => apiClient.get('/usuarios/', { params: { rol_id: 3, limit: 200 } }), setInstructores],
      ];

      const resultados = await Promise.allSettled(peticiones.map(([, fn]) => fn()));
      const fallos = [];

      resultados.forEach((r, i) => {
        const [nombre, , setter] = peticiones[i];
        if (r.status === 'fulfilled') {
          setter(toList(r.value));
        } else {
          console.error(`Error cargando ${nombre}:`, r.reason?.response?.data || r.reason);
          fallos.push(nombre);
        }
      });

      if (fallos.length) {
        await showError(`No se pudieron cargar: ${fallos.join(', ')}`);
      }
    };
    cargar();
  }, []);

  // Coordinadores de la empresa elegida (prueba varias rutas posibles del backend)
  useEffect(() => {
    const cargarCoords = async () => {
      if (!form.empresa_id) {
        setCoordinadores([]);
        setForm((f) => ({ ...f, coordinador_empresa_id: '' }));
        return;
      }
      const rutas = [
        `/empresas/${form.empresa_id}/coordinadores`,
        `/empresas/${form.empresa_id}/coordinadores-empresa`,
      ];
      for (const ruta of rutas) {
        try {
          const res = await apiClient.get(ruta);
          setCoordinadores(toList(res));
          return;
        } catch (e) {
          console.error(`Error cargando coordinadores (${ruta}):`, e?.response?.data || e);
        }
      }
      setCoordinadores([]);
      await showError('No se pudieron cargar los coordinadores de la empresa');
    };
    cargarCoords();
  }, [form.empresa_id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.aprendiz_id || !form.ficha_id || !form.modalidad_id || !form.instructor_id || !form.fecha_inicio || !form.fecha_fin) {
      await showError('Completa aprendiz, ficha, modalidad, instructor y fechas');
      return;
    }
    if (form.fecha_fin < form.fecha_inicio) {
      await showError('La fecha fin no puede ser anterior a la fecha inicio');
      return;
    }
    if ((form.empresa_id && !form.coordinador_empresa_id) || (!form.empresa_id && form.coordinador_empresa_id)) {
      await showError('Empresa y coordinador de empresa deben ir juntos o ninguno');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        aprendiz_id: Number(form.aprendiz_id),
        ficha_id: Number(form.ficha_id),
        modalidad_id: Number(form.modalidad_id),
        instructor_id: Number(form.instructor_id),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        observaciones: form.observaciones || null,
        empresa_id: form.empresa_id ? Number(form.empresa_id) : null,
        coordinador_empresa_id: form.coordinador_empresa_id ? Number(form.coordinador_empresa_id) : null,
      };
      await procesoService.createProceso(payload);
      await showSuccess('Proceso creado correctamente');
      navigate('/coordinador/aprendices');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Error al crear el proceso';
      await showError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = { width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '12px' };
  const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 14 };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 0' }}>
      <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>Crear proceso de aprendiz</h2>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Asigna ficha, modalidad, empresa, coordinador de empresa, instructor y fechas.
      </p>

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <label style={labelStyle}>Aprendiz *</label>
        <select name="aprendiz_id" value={form.aprendiz_id} onChange={onChange} style={selectStyle} required>
          <option value="">-- Selecciona aprendiz --</option>
          {aprendices.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre} {a.apellido} ({a.email})</option>
          ))}
        </select>

        <label style={labelStyle}>Ficha *</label>
        <select name="ficha_id" value={form.ficha_id} onChange={onChange} style={selectStyle} required>
          <option value="">-- Selecciona ficha --</option>
          {fichas.map((f) => (
            <option key={f.id} value={f.id}>{f.numero_ficha} ({f.nivel || ''} - {f.jornada || ''})</option>
          ))}
        </select>

        <label style={labelStyle}>Modalidad *</label>
        <select name="modalidad_id" value={form.modalidad_id} onChange={onChange} style={selectStyle} required>
          <option value="">-- Selecciona modalidad --</option>
          {modalidades.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>

        <label style={labelStyle}>Empresa (opcional)</label>
        <select name="empresa_id" value={form.empresa_id} onChange={onChange} style={selectStyle}>
          <option value="">-- Sin empresa --</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.razon_social || e.nombre}</option>
          ))}
        </select>

        <label style={labelStyle}>Coordinador de empresa</label>
        <select
          name="coordinador_empresa_id"
          value={form.coordinador_empresa_id}
          onChange={onChange}
          style={selectStyle}
          disabled={!form.empresa_id}
        >
          <option value="">-- Selecciona coordinador --</option>
          {coordinadores.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre} {c.cargo ? `(${c.cargo})` : ''}</option>
          ))}
        </select>

        <label style={labelStyle}>Instructor *</label>
        <select name="instructor_id" value={form.instructor_id} onChange={onChange} style={selectStyle} required>
          <option value="">-- Selecciona instructor --</option>
          {instructores.map((i) => (
            <option key={i.id} value={i.id}>{i.nombre} {i.apellido}</option>
          ))}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Fecha inicio *</label>
            <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={onChange} style={selectStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Fecha fin *</label>
            <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={onChange} style={selectStyle} required />
          </div>
        </div>

        <label style={labelStyle}>Observaciones</label>
        <textarea
          name="observaciones"
          value={form.observaciones}
          onChange={onChange}
          rows={3}
          style={{ ...selectStyle, resize: 'vertical' }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="button"
            onClick={() => navigate('/coordinador/aprendices')}
            style={{ padding: '10px 18px', borderRadius: 6, border: 'none', background: '#e5e7eb', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '10px 18px', borderRadius: 6, border: 'none', background: '#3ca203', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Guardando...' : 'Crear proceso'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrearProceso;