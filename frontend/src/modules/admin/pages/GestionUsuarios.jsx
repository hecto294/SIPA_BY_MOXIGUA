// src/modules/admin/pages/GestionUsuarios.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { userService } from '@/core/services/userService';
import CargaMasivaUsuarios from './CargaMasivaUsuarios';
import './GestionUsuarios.css';

const GestionUsuarios = () => {
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalCargaMasiva, setModalCargaMasiva] = useState(false);
  const [tab, setTab] = useState('activos'); // 'activos' | 'inactivos' | 'eliminados'

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usuariosData, rolesData] = await Promise.all([
        userService.getUsers(),
        userService.getUsersByRole &&
          (async () => {
            try {
              const res = await fetch('http://localhost:8000/usuarios/roles', {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
              });
              return await res.json();
            } catch (e) {
              return [];
            }
          })(),
      ]);

      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const getNombreRol = (rolId) => {
    const rol = roles.find((r) => r.id === rolId);
    return rol ? rol.nombre : 'Sin rol';
  };

  const getNombreCompleto = (usuario) => {
    return `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.email;
  };

  const getColorRol = (rolId) => {
    const colores = {
      1: { bg: '#fce7f3', color: '#be185d' },
      2: { bg: '#e0f2fe', color: '#0ea5e9' },
      3: { bg: '#d1fae5', color: '#047857' },
      4: { bg: '#fef3c7', color: '#d97706' },
      5: { bg: '#ede9fe', color: '#7c3aed' },
      6: { bg: '#f3f4f6', color: '#374151' },
    };
    return colores[rolId] || { bg: '#f3f4f6', color: '#374151' };
  };

  // ==========================================================
  // ESTADOS (activos / inactivos / eliminados)
  // ==========================================================
  const getEstadoUsuario = (u) => {
    if (u.deleted_at) return 'eliminados';
    return u.is_active ? 'activos' : 'inactivos';
  };

  const conteo = {
    activos: usuarios.filter((u) => getEstadoUsuario(u) === 'activos').length,
    inactivos: usuarios.filter((u) => getEstadoUsuario(u) === 'inactivos').length,
    eliminados: usuarios.filter((u) => getEstadoUsuario(u) === 'eliminados').length,
  };

  const formatFecha = (f) =>
    f
      ? new Date(f).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

  const filteredUsuarios = usuarios.filter((u) => {
    if (getEstadoUsuario(u) !== tab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nombre = getNombreCompleto(u).toLowerCase();
    const email = (u.email || '').toLowerCase();
    const rol = getNombreRol(u.rol_id).toLowerCase();
    return nombre.includes(q) || email.includes(q) || rol.includes(q);
  });

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleClear = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  const handleCargaMasiva = () => {
    setModalCargaMasiva(true);
  };

  const handleUsuariosCargados = () => {
    cargarDatos();
  };

  // ==========================================================
  // CONFIGURACIÓN GLOBAL DEL MODAL (SIN SCROLL Y SIN ICONO)
  // ==========================================================
  const swalFitScreen = {
    width: '600px', // Más ancho para el grid de 2 columnas
    icon: undefined,
    heightAuto: false,
    scrollbarPadding: false,
    didOpen: (popup) => {
      // Forzado por JS para quitar scroll residual
      popup.style.overflow = 'hidden';
      popup.style.maxHeight = 'none';
      const htmlContainer = popup.querySelector('.swal2-html-container');
      if (htmlContainer) {
        htmlContainer.style.overflow = 'hidden';
        htmlContainer.style.maxHeight = 'none';
      }
      // Eliminar el icono del DOM por si acaso
      const icon = popup.querySelector('.swal2-icon');
      if (icon) icon.remove();

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    },
    willClose: () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    },
  };

  // ==========================================================
  // INACTIVAR / ELIMINAR / REACTIVAR (RF-019) con motivo
  // ==========================================================
  const pedirMotivo = async ({ title, text, confirmText, color }) => {
    const r = await Swal.fire({
      title,
      text,
      icon: 'warning',
      input: 'textarea',
      inputLabel: 'Motivo (obligatorio)',
      inputPlaceholder: 'Describe el motivo...',
      inputAttributes: { maxlength: 500 },
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: color,
      inputValidator: (v) =>
        !v || v.trim().length < 10
          ? 'Escribe un motivo de al menos 10 caracteres'
          : null,
    });
    return r.isConfirmed ? r.value.trim() : null;
  };

  const ejecutarAccion = async (accion, tituloOk) => {
    try {
      await accion();
      await Swal.fire({
        icon: 'success',
        title: tituloOk,
        timer: 1500,
        showConfirmButton: false,
      });
      await cargarDatos();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo completar',
        text: err.response?.data?.detail || err.message || 'Error inesperado',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  const handleInactivarUsuario = async (usuario) => {
    const motivo = await pedirMotivo({
      title: '¿Inactivar usuario?',
      text: `${getNombreCompleto(usuario)} no podrá iniciar sesión hasta que lo reactives.`,
      confirmText: 'Sí, inactivar',
      color: '#d97706',
    });
    if (!motivo) return;
    ejecutarAccion(
      () => userService.inactivarUser(usuario.id, motivo),
      'Usuario inactivado'
    );
  };

  const handleEliminarUsuario = async (usuario) => {
    const motivo = await pedirMotivo({
      title: '¿Eliminar usuario?',
      text: `${getNombreCompleto(usuario)} pasará a la lista de eliminados. Su información se conserva.`,
      confirmText: 'Sí, eliminar',
      color: '#dc2626',
    });
    if (!motivo) return;
    ejecutarAccion(
      () => userService.eliminarUser(usuario.id, motivo),
      'Usuario eliminado'
    );
  };

  const handleReactivarUsuario = async (usuario) => {
    const r = await Swal.fire({
      title: usuario.deleted_at ? '¿Restaurar usuario?' : '¿Reactivar usuario?',
      text: `${getNombreCompleto(usuario)} volverá a estar activo.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3ca203',
    });
    if (!r.isConfirmed) return;
    ejecutarAccion(
      () => userService.reactivarUser(usuario.id),
      'Usuario activo de nuevo'
    );
  };

  // ==========================================================
  // EDITAR USUARIO (Usando GRID de 2 columnas)
  // ==========================================================
  const handleEditarUsuario = (usuario) => {
    const rolesOptions = roles
      .map(
        (rol) =>
          `<option value="${rol.id}" ${usuario.rol_id === rol.id ? 'selected' : ''}>${rol.nombre}</option>`
      )
      .join('');

    Swal.fire({
      ...swalFitScreen,
      title: '✏️ Editar Usuario',
      html: `
        <div class="swal-form-grid">
          <div class="swal-form-group">
            <label class="swal-label">Nombre *</label>
            <input id="edit-nombre" value="${usuario.nombre || ''}" class="swal-input" />
          </div>
          <div class="swal-form-group">
            <label class="swal-label">Apellido *</label>
            <input id="edit-apellido" value="${usuario.apellido || ''}" class="swal-input" />
          </div>
          <div class="swal-form-group" style="grid-column: 1 / -1;">
            <label class="swal-label">Correo *</label>
            <input id="edit-email" value="${usuario.email || ''}" class="swal-input" />
          </div>
          <div class="swal-form-group" style="grid-column: 1 / -1;">
            <label class="swal-label">Rol *</label>
            <select id="edit-rol" class="swal-input">
              ${rolesOptions}
            </select>
          </div>
        </div>
      `,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: '💾 Guardar',
      cancelButtonText: '❌ Cancelar',
      confirmButtonColor: '#3ca203',
      cancelButtonColor: '#ef4444',
      preConfirm: () => {
        const nombre = document.getElementById('edit-nombre').value.trim();
        const apellido = document.getElementById('edit-apellido').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const rol_id = parseInt(document.getElementById('edit-rol').value);

        if (!nombre || !apellido || !email) {
          Swal.showValidationMessage('⚠️ Todos los campos son obligatorios');
          return false;
        }
        if (!email.includes('@')) {
          Swal.showValidationMessage('⚠️ Correo inválido');
          return false;
        }
        // is_active se conserva: el estado ahora se cambia con Inactivar/Eliminar/Reactivar
        return { nombre, apellido, email, rol_id, is_active: usuario.is_active };
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          await userService.updateUser(usuario.id, result.value);
          await cargarDatos();
          Swal.fire({
            title: '✅ ¡Usuario actualizado!',
            text: `Los datos de ${result.value.nombre} fueron actualizados.`,
            icon: 'success',
            confirmButtonColor: '#3ca203',
            timer: 2000,
          });
        } catch (err) {
          Swal.fire({
            title: '❌ Error',
            text: err.message || 'No se pudo actualizar el usuario',
            icon: 'error',
            confirmButtonColor: '#dc2626',
          });
        }
      }
    });
  };

  // ==========================================================
  // NUEVO USUARIO (Usando GRID de 2 columnas)
  // ==========================================================
  const handleNuevoUsuario = () => {
    const rolesOptions = roles
      .map((rol) => `<option value="${rol.id}">${rol.nombre}</option>`)
      .join('');

    Swal.fire({
      ...swalFitScreen,
      title: '👤 Nuevo Usuario',
      html: `
        <div class="swal-form-grid">
          <div class="swal-form-group">
            <label class="swal-label">Nombre *</label>
            <input id="new-nombre" placeholder="Ej: Juan" class="swal-input" />
          </div>
          <div class="swal-form-group">
            <label class="swal-label">Apellido *</label>
            <input id="new-apellido" placeholder="Ej: Pérez" class="swal-input" />
          </div>
          <div class="swal-form-group" style="grid-column: 1 / -1;">
            <label class="swal-label">Correo *</label>
            <input id="new-email" type="email" placeholder="juan.perez@sena.edu.co" class="swal-input" />
          </div>
          <div class="swal-form-group">
            <label class="swal-label">Contraseña * (mín. 6)</label>
            <input id="new-password" type="password" placeholder="••••••" class="swal-input" />
          </div>
          <div class="swal-form-group">
            <label class="swal-label">Rol *</label>
            <select id="new-rol" class="swal-input">
              ${rolesOptions}
            </select>
          </div>
        </div>
      `,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: '✅ Crear',
      cancelButtonText: '❌ Cancelar',
      confirmButtonColor: '#3ca203',
      cancelButtonColor: '#ef4444',
      preConfirm: () => {
        const nombre = document.getElementById('new-nombre').value.trim();
        const apellido = document.getElementById('new-apellido').value.trim();
        const email = document.getElementById('new-email').value.trim();
        const password = document.getElementById('new-password').value;
        const rol_id = parseInt(document.getElementById('new-rol').value);

        if (!nombre || !apellido || !email || !password) {
          Swal.showValidationMessage('⚠️ Todos los campos son obligatorios');
          return false;
        }
        if (!email.includes('@')) {
          Swal.showValidationMessage('⚠️ Correo inválido');
          return false;
        }
        if (password.length < 6) {
          Swal.showValidationMessage('⚠️ La contraseña debe tener al menos 6 caracteres');
          return false;
        }
        return { nombre, apellido, email, password, rol_id };
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          await userService.createUser(result.value);
          await cargarDatos();
          Swal.fire({
            title: '✅ ¡Usuario creado!',
            text: `${result.value.nombre} fue creado correctamente.`,
            icon: 'success',
            confirmButtonColor: '#3ca203',
            timer: 2000,
          });
        } catch (err) {
          Swal.fire({
            title: '❌ Error',
            text: err.message || 'No se pudo crear el usuario',
            icon: 'error',
            confirmButtonColor: '#dc2626',
          });
        }
      }
    });
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
        <p style={{ marginTop: '15px' }}>Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#dc2626' }}></i>
        <h3 style={{ color: '#dc2626', marginTop: '15px' }}>Error al cargar usuarios</h3>
        <p style={{ color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  const mostrarMotivo = tab !== 'activos';
  const totalColumnas = mostrarMotivo ? 6 : 5;

  return (
    <div className="gestion-usuarios-container">
      <nav className="breadcrumb">
        <ol>
          <li>
            <Link to="/admin" className="breadcrumb-link">
              <i className="fas fa-home"></i> Inicio
            </Link>
            <span className="separator"> &gt; </span>
          </li>
          <li className="active">
            <i className="fas fa-users"></i> Gestión de Usuarios
          </li>
        </ol>
      </nav>

      <div className="usuarios-header">
        <div>
          <h2>Gestión de Usuarios</h2>
          <p className="subtitulo">
            Administra los usuarios del sistema ({usuarios.length} usuarios).
          </p>
        </div>
        <div className="header-buttons">
          <button className="btn-carga-masiva" onClick={handleCargaMasiva}>
            <i className="fas fa-upload"></i> Carga Masiva
          </button>
          <button className="btn-nuevo-usuario" onClick={handleNuevoUsuario}>
            <i className="fas fa-plus"></i> Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por nombre, rol o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-search" onClick={handleSearch}>
          <i className="fas fa-search"></i> Buscar
        </button>
        <button className="btn-clear" onClick={handleClear}>
          <i className="fas fa-times"></i> Limpiar
        </button>
      </div>

      <div className="usuarios-tabs">
        <button
          className={`tab-btn tab-activos ${tab === 'activos' ? 'active' : ''}`}
          onClick={() => setTab('activos')}
        >
          <i className="fas fa-check-circle"></i> Activos ({conteo.activos})
        </button>
        <button
          className={`tab-btn tab-inactivos ${tab === 'inactivos' ? 'active' : ''}`}
          onClick={() => setTab('inactivos')}
        >
          <i className="fas fa-user-slash"></i> Inactivos ({conteo.inactivos})
        </button>
        <button
          className={`tab-btn tab-eliminados ${tab === 'eliminados' ? 'active' : ''}`}
          onClick={() => setTab('eliminados')}
        >
          <i className="fas fa-trash"></i> Eliminados ({conteo.eliminados})
        </button>
      </div>

      <div className="table-wrapper">
        <table className="usuarios-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Correo institucional</th>
              {mostrarMotivo && <th>Motivo</th>}
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} style={{ textAlign: 'center', padding: '40px' }}>
                  <i className="fas fa-exclamation-circle" style={{ color: '#dc2626', fontSize: '24px' }}></i>
                  <h3 style={{ color: '#dc2626', margin: '10px 0 5px 0' }}>Sin resultados</h3>
                  <p style={{ color: '#6b7280' }}>No se encontraron usuarios con ese criterio.</p>
                </td>
              </tr>
            ) : (
              filteredUsuarios.map((usuario) => {
                const colorRol = getColorRol(usuario.rol_id);
                const eliminado = !!usuario.deleted_at;
                return (
                  <tr key={usuario.id}>
                    <td className="usuario-nombre">{getNombreCompleto(usuario)}</td>
                    <td>
                      <span
                        className="rol-badge"
                        style={{
                          background: colorRol.bg,
                          color: colorRol.color,
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        {getNombreRol(usuario.rol_id)}
                      </span>
                    </td>
                    <td>{usuario.email}</td>
                    {mostrarMotivo && (
                      <td style={{ maxWidth: '260px', fontSize: '13px', color: '#4b5563' }}>
                        {eliminado ? usuario.motivo_eliminacion : usuario.motivo_inactivacion}
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                          {formatFecha(eliminado ? usuario.deleted_at : usuario.fecha_inactivacion)}
                        </div>
                      </td>
                    )}
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`estado-badge ${usuario.is_active ? 'activo' : 'inactivo'}`}
                        style={{
                          background: usuario.is_active ? '#d1fae515' : '#fef2f215',
                          color: usuario.is_active ? '#065f46' : '#dc2626',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        <i
                          className={`fas ${
                            eliminado
                              ? 'fa-trash'
                              : usuario.is_active
                              ? 'fa-check-circle'
                              : 'fa-times-circle'
                          }`}
                        ></i>{' '}
                        {eliminado ? 'Eliminado' : usuario.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {tab === 'activos' && (
                        <>
                          <button className="btn-editar" onClick={() => handleEditarUsuario(usuario)}>
                            <i className="fas fa-pen"></i> Editar
                          </button>
                          <button className="btn-inactivar" onClick={() => handleInactivarUsuario(usuario)}>
                            <i className="fas fa-user-slash"></i> Inactivar
                          </button>
                          <button className="btn-eliminar" onClick={() => handleEliminarUsuario(usuario)}>
                            <i className="fas fa-trash"></i> Eliminar
                          </button>
                        </>
                      )}
                      {tab === 'inactivos' && (
                        <>
                          <button className="btn-reactivar" onClick={() => handleReactivarUsuario(usuario)}>
                            <i className="fas fa-undo"></i> Reactivar
                          </button>
                          <button className="btn-eliminar" onClick={() => handleEliminarUsuario(usuario)}>
                            <i className="fas fa-trash"></i> Eliminar
                          </button>
                        </>
                      )}
                      {tab === 'eliminados' && (
                        <button className="btn-reactivar" onClick={() => handleReactivarUsuario(usuario)}>
                          <i className="fas fa-undo"></i> Restaurar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalCargaMasiva && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalCargaMasiva(false);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <CargaMasivaUsuarios
              onClose={() => setModalCargaMasiva(false)}
              onUsuariosCargados={handleUsuariosCargados}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUsuarios;