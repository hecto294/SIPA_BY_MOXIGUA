// src/modules/instructor/components/Empresas.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Breadcrumb from '../../shared/components/Breadcrumb';
import instructorService from '../services/instructorService';
import './Empresas.css';

const Empresas = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getInstructorId = () => {
    try {
      const stored = localStorage.getItem('user');
      const instructor = stored ? JSON.parse(stored) : null;
      return instructor?.id || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  const cargarEmpresas = async () => {
    try {
      setLoading(true);
      setError(null);

      const instructorId = getInstructorId();
      if (!instructorId) {
        throw new Error('No se encontró el instructor logueado');
      }

      const data = await instructorService.getEmpresas(instructorId);
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar empresas:', err);
      setError(err.message || 'Error al cargar empresas');
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmpresas = empresas.filter(
    (empresa) =>
      (empresa.razon_social || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (empresa.arl || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (empresa.nit || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleClear = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  // ==========================================================
  // CREAR EMPRESA
  // ==========================================================
  const handleNuevaEmpresa = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Nueva Empresa',
      customClass: { popup: 'swal-form-popup' },
      html: `
        <div class="swal-form-container" style="text-align:left;">
          <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Nombre de la empresa *</label>
            <input id="nombreEmpresa" class="swal2-input" placeholder="Ej. TechSoft S.A.S." style="width:100%;">
          </div>
          <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">NIT *</label>
            <input id="nitEmpresa" class="swal2-input" placeholder="Ej. 900123456-7" style="width:100%;">
          </div>
          <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">ARL</label>
            <select id="arlEmpresa" class="swal2-input" style="width:100%;">
              <option value="">Sin ARL</option>
              <option value="SURA">SURA</option>
              <option value="Positiva">Positiva</option>
              <option value="Colmena">Colmena</option>
              <option value="Seguros Bolívar">Seguros Bolívar</option>
              <option value="La Equidad">La Equidad</option>
            </select>
          </div>
          <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Teléfono</label>
            <input id="telefonoEmpresa" class="swal2-input" placeholder="Ej. 3001234567" style="width:100%;">
          </div>
          <div style="margin-bottom:8px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Dirección</label>
            <input id="direccionEmpresa" class="swal2-input" placeholder="Dirección de la empresa" style="width:100%;">
          </div>
          <div style="margin-bottom:8px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Correo de contacto</label>
            <input id="correoEmpresa" type="email" class="swal2-input" placeholder="contacto@empresa.com" style="width:100%;">
          </div>
          <p style="font-size:12px;color:#6b7280;margin:8px 0 0 0;">* Campos obligatorios</p>
        </div>
      `,
      focusConfirm: false,
      confirmButtonText: 'Guardar Empresa',
      confirmButtonColor: '#3ca203',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#6b7280',
      showCancelButton: true,
      width: '520px',
      preConfirm: () => {
        const razon_social = document.getElementById('nombreEmpresa').value.trim();
        const nit = document.getElementById('nitEmpresa').value.trim();
        const arl = document.getElementById('arlEmpresa').value || null;
        const telefono = document.getElementById('telefonoEmpresa').value.trim() || null;
        const direccion = document.getElementById('direccionEmpresa').value.trim() || null;
        const correo_contacto = document.getElementById('correoEmpresa').value.trim() || null;

        if (!razon_social) {
          Swal.showValidationMessage('El nombre es obligatorio');
          return false;
        }
        if (!nit) {
          Swal.showValidationMessage('El NIT es obligatorio');
          return false;
        }
        return { razon_social, nit, arl, telefono, direccion, correo_contacto };
      },
    });

    if (!formValues) return;

    try {
      const nueva = await instructorService.crearEmpresa(formValues);
      setEmpresas((prev) => [...prev, nueva]);
      await Swal.fire({
        title: 'Empresa creada',
        text: `"${nueva.razon_social}" se registró correctamente.`,
        icon: 'success',
        confirmButtonColor: '#3ca203',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error('Error al crear empresa:', err);
      Swal.fire({
        title: 'Error',
        text: err.message || 'No se pudo crear la empresa.',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  // ==========================================================
  // EDITAR EMPRESA
  // ==========================================================
  const handleEditarEmpresa = async (empresa) => {
    const { value: formValues } = await Swal.fire({
      title: 'Editar Empresa',
      customClass: { popup: 'swal-form-popup' },
      html: `
        <div class="swal-form-container" style="text-align:left;">
          <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Nombre de la empresa *</label>
            <input id="editNombreEmpresa" class="swal2-input" value="${empresa.razon_social || ''}" style="width:100%;">
          </div>
          <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">NIT *</label>
            <input id="editNitEmpresa" class="swal2-input" value="${empresa.nit || ''}" style="width:100%;">
          </div>
          <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">ARL</label>
            <select id="editArlEmpresa" class="swal2-input" style="width:100%;">
              <option value="" ${!empresa.arl ? 'selected' : ''}>Sin ARL</option>
              <option value="SURA" ${empresa.arl === 'SURA' ? 'selected' : ''}>SURA</option>
              <option value="Positiva" ${empresa.arl === 'Positiva' ? 'selected' : ''}>Positiva</option>
              <option value="Colmena" ${empresa.arl === 'Colmena' ? 'selected' : ''}>Colmena</option>
              <option value="Seguros Bolívar" ${empresa.arl === 'Seguros Bolívar' ? 'selected' : ''}>Seguros Bolívar</option>
              <option value="La Equidad" ${empresa.arl === 'La Equidad' ? 'selected' : ''}>La Equidad</option>
            </select>
          </div>
          <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Teléfono</label>
            <input id="editTelefonoEmpresa" class="swal2-input" value="${empresa.telefono || ''}" style="width:100%;">
          </div>
          <div style="margin-bottom:12px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Dirección</label>
            <input id="editDireccionEmpresa" class="swal2-input" value="${empresa.direccion || ''}" style="width:100%;">
          </div>
          <div style="margin-bottom:8px;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Correo de contacto</label>
            <input id="editCorreoEmpresa" type="email" class="swal2-input" value="${empresa.correo_contacto || ''}" style="width:100%;">
          </div>
        </div>
      `,
      focusConfirm: false,
      confirmButtonText: 'Guardar cambios',
      confirmButtonColor: '#3ca203',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#6b7280',
      showCancelButton: true,
      width: '520px',
      preConfirm: () => {
        const razon_social = document.getElementById('editNombreEmpresa').value.trim();
        const nit = document.getElementById('editNitEmpresa').value.trim();
        const arl = document.getElementById('editArlEmpresa').value || null;
        const telefono = document.getElementById('editTelefonoEmpresa').value.trim() || null;
        const direccion = document.getElementById('editDireccionEmpresa').value.trim() || null;
        const correo_contacto = document.getElementById('editCorreoEmpresa').value.trim() || null;

        if (!razon_social) {
          Swal.showValidationMessage('El nombre es obligatorio');
          return false;
        }
        if (!nit) {
          Swal.showValidationMessage('El NIT es obligatorio');
          return false;
        }
        return { razon_social, nit, arl, telefono, direccion, correo_contacto };
      },
    });

    if (!formValues) return;

    try {
      const actualizada = await instructorService.actualizarEmpresa(empresa.id, formValues);
      setEmpresas((prev) =>
        prev.map((e) => (e.id === empresa.id ? { ...e, ...actualizada } : e))
      );
      await Swal.fire({
        title: 'Empresa actualizada',
        text: `"${actualizada.razon_social}" se actualizó correctamente.`,
        icon: 'success',
        confirmButtonColor: '#3ca203',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error('Error al actualizar:', err);
      Swal.fire({
        title: 'Error',
        text: err.message || 'No se pudo actualizar la empresa.',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  // ==========================================================
  // ELIMINAR EMPRESA
  // ==========================================================
  const handleEliminarEmpresa = async (empresa) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      html: `
        <div style="text-align:center;">
          <p style="font-size:16px;color:#374151;margin-bottom:10px;">
            ¿Deseas eliminar la empresa <strong>"${empresa.razon_social}"</strong>?
          </p>
          <p style="font-size:14px;color:#6b7280;">
            Solo se puede eliminar si no tiene procesos activos.
          </p>
        </div>
      `,
      icon: 'warning',
      iconColor: '#dc2626',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await instructorService.eliminarEmpresa(empresa.id);
      setEmpresas((prev) => prev.filter((e) => e.id !== empresa.id));
      await Swal.fire({
        title: 'Empresa eliminada',
        text: `"${empresa.razon_social}" fue eliminada.`,
        icon: 'success',
        confirmButtonColor: '#3ca203',
        timer: 2000,
        timerProgressBar: true,
      });
    } catch (err) {
      console.error('Error al eliminar:', err);
      Swal.fire({
        title: 'No se pudo eliminar',
        text: err.message || 'La empresa tiene procesos activos o no tienes permiso.',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================
  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
        <p style={{ marginTop: '15px' }}>Cargando empresas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#dc2626' }}></i>
        <h3 style={{ color: '#dc2626', marginTop: '15px' }}>Error</h3>
        <p style={{ color: '#6b7280' }}>{error}</p>
        <button
          onClick={cargarEmpresas}
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
    );
  }

  return (
    <div className="empresas-container" style={{ width: '100%', padding: '20px 0' }}>
      <Breadcrumb />

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
            <i className="fas fa-building" style={{ marginRight: '10px', color: '#3ca203' }} />
            Empresas
          </h2>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '14px' }}>
            Administra las empresas con las que trabajas
          </p>
        </div>

        <button
          onClick={handleNuevaEmpresa}
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
          <i className="fas fa-plus" /> Nueva empresa
        </button>
      </div>

      {/* Búsqueda */}
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
          placeholder="Buscar por nombre, NIT o ARL..."
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
          Buscar
        </button>
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
      </div>

      {filteredEmpresas.length === 0 ? (
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
          <i className="fas fa-building" style={{ fontSize: '40px', marginBottom: '12px', color: '#9ca3af' }} />
          <h3 style={{ margin: '0 0 6px 0', color: '#374151' }}>
            {searchQuery ? 'No se encontraron resultados' : 'Sin empresas'}
          </h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {searchQuery
              ? 'No existe ninguna empresa con los datos ingresados.'
              : 'Aún no tienes empresas asociadas a tus procesos. Puedes crear una nueva.'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>NIT</th>
                <th>ARL</th>
                <th>Teléfono</th>
                <th>Aprendices</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmpresas.map((empresa) => (
                <tr key={empresa.id}>
                  <td className="nombre-empresa" style={{ fontWeight: 600 }}>
                    {empresa.razon_social}
                  </td>
                  <td>{empresa.nit || '—'}</td>
                  <td>{empresa.arl || '—'}</td>
                  <td>{empresa.telefono || '—'}</td>
                  <td>{empresa.aprendices_count == null ? 0 : empresa.aprendices_count}</td>
                  <td>
                    <button
                      onClick={() => handleEditarEmpresa(empresa)}
                      style={{
                        background: '#e6f7ed',
                        color: '#047857',
                        border: 'none',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginRight: '6px',
                        fontSize: '13px',
                      }}
                    >
                      <i className="fas fa-edit" /> Editar
                    </button>
                    <button
                      onClick={() => handleEliminarEmpresa(empresa)}
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <i className="fas fa-trash" /> Eliminar
                    </button>
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

export default Empresas;