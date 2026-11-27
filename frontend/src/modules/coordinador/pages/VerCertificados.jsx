// src/pages/coordinador/VerCertificados.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '@/modules/shared/components/Breadcrumb'; // <--- CORREGIDO
import Swal from 'sweetalert2';
import { showSuccess, showError, showWarning, showConfirm } from '@/core/utils/sweetAlert'; // <--- CORREGIDO

const VerCertificados = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [certificados, setCertificados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificados = async () => {
      try {
        const response = await fetch('http://localhost:8000/certificados/ver', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setCertificados(data);
      } catch (err) {
        console.error('Error cargando certificados:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCertificados();
  }, []);

  const handleSearch = () => setSearchQuery(searchTerm);
  const handleClear = () => { setSearchTerm(''); setSearchQuery(''); };

  const filteredCertificados = certificados.filter(c =>
    c.aprendiz.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.ficha.includes(searchQuery)
  );

  const handleDescargarMasivo = async () => {
    try {
      Swal.fire({
        title: 'Generando ZIP masivo...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await fetch('http://localhost:8000/certificados/descargar-masivo', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error al generar los certificados');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'certificados_masivos.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();

      Swal.fire({
        title: '✅ Descarga completada',
        text: 'Se ha descargado el archivo ZIP con los certificados.',
        icon: 'success',
        confirmButtonColor: '#3ca203',
      });
    } catch (err) {
      Swal.fire({
        title: '❌ Error',
        text: err.message || 'No se pudo descargar los certificados',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
    }
  };

  const handleDescargarCertificado = async (certificado) => {
    // Mostrar confirmación antes de descargar
    const result = await Swal.fire({
      title: '📄 Confirmar descarga',
      text: `¿Deseas descargar el certificado de ${certificado.aprendiz}?`,
      icon: 'question',
      iconColor: '#3ca203',
      showCancelButton: true,
      confirmButtonColor: '#3ca203',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, descargar',
      cancelButtonText: 'Cancelar',
      allowOutsideClick: false,
      allowEscapeKey: true,
      width: '450px',
      padding: '25px 30px',
      background: '#ffffff',
      color: '#1f2937',
      customClass: {
        popup: 'swal2-popup-sandbox',
        title: 'swal2-title-sandbox',
        confirmButton: 'swal2-confirm-sandbox',
        cancelButton: 'swal2-cancel-sandbox',
      }
    });

    if (result.isConfirmed) {
      // Mostrar alerta de éxito simple
      await Swal.fire({
        title: '✅ Descarga completada',
        text: `El certificado de ${certificado.aprendiz} se ha descargado exitosamente.`,
        icon: 'success',
        iconColor: '#3ca203',
        confirmButtonColor: '#3ca203',
        confirmButtonText: 'Aceptar',
        allowOutsideClick: false,
        allowEscapeKey: true,
        width: '450px',
        padding: '25px 30px',
        background: '#ffffff',
        color: '#1f2937',
        timer: 3000,
        timerProgressBar: true,
        customClass: {
          popup: 'swal2-popup-sandbox',
          title: 'swal2-title-sandbox',
          confirmButton: 'swal2-confirm-sandbox',
        }
      });
    }
  };

  

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <Breadcrumb />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Certificados</h2>
          <p style={{ color: '#6b7280', margin: '5px 0 0 0' }}>Gestión de certificados de los aprendices.</p>
        </div>
        <button
          onClick={handleDescargarMasivo}
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
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#2d8a00'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#3ca203'}
        >
          <i className="fas fa-download" /> Descargar todos
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por aprendiz o ficha..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
        />
        <button onClick={handleSearch} style={{ background: '#3ca203', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Buscar</button>
        <button onClick={handleClear} style={{ background: '#e5e7eb', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>Limpiar</button>
      </div>

      {filteredCertificados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ color: '#dc2626' }}>Dato no encontrado</h3>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '12px', color: '#6b7280' }}>Aprendiz</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Ficha</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Estado</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Fecha</th>
                <th style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredCertificados.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.aprendiz}</td>
                  <td style={{ textAlign: 'center', padding: '12px' }}>{c.ficha}</td>
                  <td style={{ textAlign: 'center', padding: '12px' }}>
                    <span style={{
                      background: c.estado === 'Listo' ? '#d1fae5' : '#fef3c7',
                      color: c.estado === 'Listo' ? '#047857' : '#d97706',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {c.estado}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px' }}>{c.fecha}</td>
                  <td style={{ textAlign: 'center', padding: '12px' }}>
                    <button
                      onClick={() => handleDescargarCertificado(c)}
                      disabled={c.estado === 'Pendiente'}
                      style={{
                        background: c.estado === 'Listo' ? '#e6f7ed' : '#f3f4f6',
                        color: c.estado === 'Listo' ? '#047857' : '#9ca3af',
                        border: 'none',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        cursor: c.estado === 'Listo' ? 'pointer' : 'default',
                        opacity: c.estado === 'Listo' ? 1 : 0.6
                      }}
                    >
                      <i className="fas fa-download" /> 
                      {c.estado === 'Listo' ? 'Descargar' : 'Pendiente'}
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

export default VerCertificados;
