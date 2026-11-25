// src/modules/coordinador/pages/ProgramasFormacion.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { fichaService } from '@/core/services/fichaService';
import './ProgramasFormacion.css';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const ProgramasFormacion = () => {
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    cargarProgramas();
  }, []);

  const cargarProgramas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fichaService.getProgramas({ limit: 200 });
      setProgramas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al cargar programas');
    } finally {
      setLoading(false);
    }
  };

  const mensajeError = (err, defecto) => err.response?.data?.detail || err.message || defecto;

  const filtrados = programas.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.codigo || '').toLowerCase().includes(q) ||
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q)
    );
  });

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleClear = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  // ==================== CREAR ====================
  const handleNuevo = () => {
    Swal.fire({
      title: '📚 Nuevo Programa de Formación',
      width: '600px',
      html: `
        <div class="swal-form-grid">
          <div class="swal-form-group">
            <label class="swal-label">Código único *</label>
            <input id="prog-codigo" placeholder="Ej: 228106" class="swal-input" />
          </div>
          <div class="swal-form-group">
            <label class="swal-label">Nombre *</label>
            <input id="prog-nombre" placeholder="Ej: Gestión Empresarial" class="swal-input" />
          </div>
          <div class="swal-form-group" style="grid-column: 1 / -1;">
            <label class="swal-label">Descripción</label>
            <textarea id="prog-descripcion" rows="3" maxlength="500" class="swal-input"></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '✅ Crear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3ca203',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const codigo = document.getElementById('prog-codigo').value.trim();
        const nombre = document.getElementById('prog-nombre').value.trim();
        const descripcion = document.getElementById('prog-descripcion').value.trim();
        if (!codigo || !nombre) {
          Swal.showValidationMessage('⚠️ Código y nombre son obligatorios');
          return false;
        }
        if (codigo.length < 2) {
          Swal.showValidationMessage('⚠️ El código debe tener al menos 2 caracteres');
          return false;
        }
        if (nombre.length < 3) {
          Swal.showValidationMessage('⚠️ El nombre debe tener al menos 3 caracteres');
          return false;
        }
        return { codigo, nombre, descripcion: descripcion || null };
      },
    }).then(async (result) => {
      if (!result.isConfirmed || !result.value) return;
      try {
        await fichaService.createPrograma(result.value);
        await cargarProgramas();
        Swal.fire({
          icon: 'success',
          title: 'Programa creado',
          text: `${result.value.nombre} fue creado correctamente.`,
          timer: 1800,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo crear',
          text: mensajeError(err, 'Error al crear el programa'),
          confirmButtonColor: '#dc2626',
        });
      }
    });
  };

  // ==================== EDITAR ====================
  const handleEditar = (p) => {
    Swal.fire({
      title: '✏️ Editar Programa',
      width: '600px',
      html: `
        <div class="swal-form-grid">
          <div class="swal-form-group">
            <label class="swal-label">Código único *</label>
            <input id="prog-codigo" value="${esc(p.codigo)}" class="swal-input" />
          </div>
          <div class="swal-form-group">
            <label class="swal-label">Nombre *</label>
            <input id="prog-nombre" value="${esc(p.nombre)}" class="swal-input" />
          </div>
          <div class="swal-form-group" style="grid-column: 1 / -1;">
            <label class="swal-label">Descripción</label>
            <textarea id="prog-descripcion" rows="3" maxlength="500" class="swal-input">${esc(p.descripcion)}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '💾 Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3ca203',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const codigo = document.getElementById('prog-codigo').value.trim();
        const nombre = document.getElementById('prog-nombre').value.trim();
        const descripcion = document.getElementById('prog-descripcion').value.trim();
        if (!codigo || !nombre) {
          Swal.showValidationMessage('⚠️ Código y nombre son obligatorios');
          return false;
        }
        if (codigo.length < 2 || nombre.length < 3) {
          Swal.showValidationMessage('⚠️ Código mín. 2 caracteres y nombre mín. 3');
          return false;
        }
        return { codigo, nombre, descripcion: descripcion || null };
      },
    }).then(async (result) => {
      if (!result.isConfirmed || !result.value) return;
      try {
        await fichaService.updatePrograma(p.id, result.value);
        await cargarProgramas();
        Swal.fire({
          icon: 'success',
          title: 'Programa actualizado',
          timer: 1800,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo actualizar',
          text: mensajeError(err, 'Error al actualizar el programa'),
          confirmButtonColor: '#dc2626',
        });
      }
    });
  };

  // ==================== ELIMINAR ====================
  const handleEliminar = async (p) => {
    const r = await Swal.fire({
      title: '¿Eliminar programa?',
      html: `Se eliminará <b>${esc(p.nombre)}</b> (código ${esc(p.codigo)}).`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });
    if (!r.isConfirmed) return;
    try {
      await fichaService.deletePrograma(p.id);
      await cargarProgramas();
      Swal.fire({
        icon: 'success',
        title: 'Programa eliminado',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo eliminar',
        text: mensajeError(err, 'Error al eliminar el programa'),
        confirmButtonColor: '#dc2626',
      });
    }
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#3ca203' }}></i>
        <p style={{ marginTop: '15px' }}>Cargando programas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#dc2626' }}></i>
        <h3 style={{ color: '#dc2626', marginTop: '15px' }}>Error al cargar programas</h3>
        <p style={{ color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="programas-container">
      <nav className="breadcrumb">
        <ol>
          <li>
            <Link to="/coordinador/parametrizacion" className="breadcrumb-link">
              <i className="fas fa-cog"></i> Parametrización
            </Link>
            <span className="separator"> &gt; </span>
          </li>
          <li className="active">
            <i className="fas fa-book"></i> Programas de Formación
          </li>
        </ol>
      </nav>

      <div className="programas-header">
        <div>
          <h2>Programas de Formación</h2>
          <p className="subtitulo">
            Crea, edita y elimina programas con código único ({programas.length} programas).
          </p>
        </div>
        <button className="btn-nuevo-programa" onClick={handleNuevo}>
          <i className="fas fa-plus"></i> Nuevo Programa
        </button>
      </div>

      <div className="programas-search">
        <input
          type="text"
          placeholder="Buscar por código, nombre o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-buscar" onClick={handleSearch}>
          <i className="fas fa-search"></i> Buscar
        </button>
        <button className="btn-limpiar" onClick={handleClear}>
          <i className="fas fa-times"></i> Limpiar
        </button>
      </div>

      <div className="programas-table-wrapper">
        <table className="programas-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No se encontraron programas.
                </td>
              </tr>
            ) : (
              filtrados.map((p) => (
                <tr key={p.id}>
                  <td className="programa-codigo">{p.codigo}</td>
                  <td>{p.nombre}</td>
                  <td className="programa-desc">{p.descripcion || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="programa-estado">
                      <i className="fas fa-check-circle"></i> Activo
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button className="btn-prog-editar" onClick={() => handleEditar(p)}>
                      <i className="fas fa-pen"></i> Editar
                    </button>
                    <button className="btn-prog-eliminar" onClick={() => handleEliminar(p)}>
                      <i className="fas fa-trash"></i> Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProgramasFormacion;