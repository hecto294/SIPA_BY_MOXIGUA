// src/modules/shared/pages/GestionModalidades.jsx
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/core/api/client';
import Swal from 'sweetalert2';

const GestionModalidades = () => {
  const [modalidades, setModalidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/modalidades/');
      setModalidades(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await apiClient.put(`/modalidades/${editando.id}`, formData);
        Swal.fire('Actualizado', 'Modalidad actualizada', 'success');
      } else {
        await apiClient.post('/modalidades/', formData);
        Swal.fire('Creado', 'Modalidad creada', 'success');
      }
      setModalOpen(false);
      setEditando(null);
      setFormData({ nombre: '', descripcion: '' });
      cargar();
    } catch (err) {
      Swal.fire('Error', err.message || 'No se pudo guardar', 'error');
    }
  };

  const handleEliminar = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar modalidad?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar'
    });
    if (!confirm.isConfirmed) return;

    try {
      await apiClient.delete(`/modalidades/${id}`);
      Swal.fire('Eliminado', 'Modalidad eliminada', 'success');
      cargar();
    } catch (err) {
      Swal.fire('Error', 'No se pudo eliminar', 'error');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Gestión de Modalidades de Etapa Productiva</h2>
        <button onClick={() => { setEditando(null); setFormData({ nombre: '', descripcion: '' }); setModalOpen(true); }}
          style={{ background: '#3ca203', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <i className="fas fa-plus" /> Nueva Modalidad
        </button>
      </div>

      {loading ? <p>Cargando...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Descripción</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {modalidades.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{m.nombre}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{m.descripcion || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button onClick={() => { setEditando(m); setFormData({ nombre: m.nombre, descripcion: m.descripcion || '' }); setModalOpen(true); }}
                    style={{ background: '#3ca203', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>
                    <i className="fas fa-edit" /> Editar
                  </button>
                  <button onClick={() => handleEliminar(m.id)}
                    style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                    <i className="fas fa-trash" /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {modalidades.length === 0 && (
              <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No hay modalidades registradas.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '400px' }}>
            <h3>{editando ? 'Editar Modalidad' : 'Nueva Modalidad'}</h3>
            <form onSubmit={handleGuardar}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>Nombre:</label>
                <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px' }}>Descripción:</label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} rows="3"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '4px', background: '#3ca203', color: 'white', border: 'none', cursor: 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionModalidades;
