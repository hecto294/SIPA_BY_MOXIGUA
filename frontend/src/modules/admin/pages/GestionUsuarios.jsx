// src/modules/admin/pages/GestionUsuarios.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { userService } from '@/core/services/userService';
import CargaMasivaUsuarios from './CargaMasivaUsuarios';
import './GestionUsuarios.css';

const GestionUsuarios = () => {
  const navigate = useNavigate();

  // Estados
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalCargaMasiva, setModalCargaMasiva] = useState(false);

  // Cargar usuarios y roles al montar
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usuariosData, rolesData] = await Promise.all([
        userService.getUsers(),
        userService.getUsersByRole && (async () => {
          try {
            const res = await fetch('http://localhost:8000/usuarios/roles', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
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

  // Mapear rol_id → nombre
  const getNombreRol = (rolId) => {
    const rol = roles.find((r) => r.id === rolId);
    return rol ? rol.nombre : 'Sin rol';
  };

  // Nombre completo
  const getNombreCompleto = (usuario) => {
    return `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.email;
  };

  // Color por rol
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

  // Filtrado local
  const filteredUsuarios = usuarios.filter((u) => {
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

  // ==========================================================
  // CARGA MASIVA (abre el componente real)
  // ==========================================================
  const handleCargaMasiva = () => {
    setModalCargaMasiva(true);
  };

  const handleUsuariosCargados = () => {
    // Recargar la lista después de la carga masiva
    cargarDatos();
  };

  // ==========================================================
  // EDITAR USUARIO
  // ==========================================================
  const handleEditarUsuario = (usuario) => {
    const rolesOptions = roles
      .map(
        (rol) =>
          `<option value="${rol.id}" ${usuario.rol_id === rol.id ? 'selected' : ''}>${rol.nombre}</option>`
      )
      .join('');

    Swal.fire({
      title: '✏️ Editar Usuario',
      html: `
        <div style="text-align: left; padding: 5px 0;">
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Nombre *
            </label>
            <input id="edit-nombre" 
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
              value="${usuario.nombre || ''}"
            />
          </div>
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Apellido *
            </label>
            <input id="edit-apellido" 
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
              value="${usuario.apellido || ''}"
            />
          </div>
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Correo *
            </label>
            <input id="edit-email" 
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
              value="${usuario.email || ''}"
            />
          </div>
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Rol *
            </label>
            <select id="edit-rol" 
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
            >
              ${rolesOptions}
            </select>
          </div>
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Estado *
            </label>
            <select id="edit-estado" 
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
            >
              <option value="true" ${usuario.is_active ? 'selected' : ''}>Activo</option>
              <option value="false" ${!usuario.is_active ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: '💾 Guardar Cambios',
      confirmButtonColor: '#3ca203',
      showCancelButton: true,
      cancelButtonText: '❌ Cancelar',
      cancelButtonColor: '#ef4444',
      width: '520px',
      preConfirm: () => {
        const nombre = document.getElementById('edit-nombre').value.trim();
        const apellido = document.getElementById('edit-apellido').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const rol_id = parseInt(document.getElementById('edit-rol').value);
        const is_active = document.getElementById('edit-estado').value === 'true';

        if (!nombre || !apellido || !email) {
          Swal.showValidationMessage('⚠️ Todos los campos son obligatorios');
          return false;
        }
        if (!email.includes('@')) {
          Swal.showValidationMessage('⚠️ Correo inválido');
          return false;
        }

        return { nombre, apellido, email, rol_id, is_active };
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
  // NUEVO USUARIO
  // ==========================================================
  const handleNuevoUsuario = () => {
    const rolesOptions = roles
      .map((rol) => `<option value="${rol.id}">${rol.nombre}</option>`)
      .join('');

    Swal.fire({
      title: '👤 Nuevo Usuario',
      html: `
        <div style="text-align: left; padding: 5px 0;">
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Nombre *
            </label>
            <input id="new-nombre" 
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
              placeholder="Ej: Juan"
            />
          </div>
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Apellido *
            </label>
            <input id="new-apellido" 
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
              placeholder="Ej: Pérez"
            />
          </div>
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Correo *
            </label>
            <input id="new-email" type="email"
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
              placeholder="juan.perez@sena.edu.co"
            />
          </div>
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Contraseña * (mínimo 6 caracteres)
            </label>
            <input id="new-password" type="password"
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
              placeholder="••••••"
            />
          </div>
          <div style="margin: 12px 0;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px;">
              Rol *
            </label>
            <select id="new-rol" 
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
            >
              ${rolesOptions}
            </select>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: '✅ Crear Usuario',
      confirmButtonColor: '#3ca203',
      showCancelButton: true,
      cancelButtonText: '❌ Cancelar',
      cancelButtonColor: '#ef4444',
      width: '520px',
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

  return (
    <div className="gestion-usuarios-container">
      {/* MIGA DE PAN */}
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

      {/* ENCABEZADO */}
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

      {/* BUSCADOR */}
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

      {/* TABLA */}
      <div className="table-wrapper">
        <table className="usuarios-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Correo institucional</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                  <i className="fas fa-exclamation-circle" style={{ color: '#dc2626', fontSize: '24px' }}></i>
                  <h3 style={{ color: '#dc2626', margin: '10px 0 5px 0' }}>Sin resultados</h3>
                  <p style={{ color: '#6b7280' }}>No se encontraron usuarios con ese criterio.</p>
                </td>
              </tr>
            ) : (
              filteredUsuarios.map((usuario) => {
                const colorRol = getColorRol(usuario.rol_id);
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
                          display: 'inline-block',
                        }}
                      >
                        {getNombreRol(usuario.rol_id)}
                      </span>
                    </td>
                    <td>{usuario.email}</td>
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
                        <i className={`fas ${usuario.is_active ? 'fa-check-circle' : 'fa-times-circle'}`}></i>{' '}
                        {usuario.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-editar" onClick={() => handleEditarUsuario(usuario)}>
                        <i className="fas fa-pen"></i> Editar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CARGA MASIVA */}
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