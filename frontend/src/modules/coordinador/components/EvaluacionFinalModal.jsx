import { useState, useEffect } from 'react';
import procesoService from '../../../core/services/procesoService';

export default function EvaluacionFinalModal({ isOpen, onClose, proceso, onSuccess }) {
  const [formData, setFormData] = useState({
    nota_empresa: '',
    nota_instructor: '',
    estado_sofia: 'PENDIENTE'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (proceso) {
      setFormData({
        nota_empresa: proceso.nota_empresa ?? '',
        nota_instructor: proceso.nota_instructor ?? '',
        estado_sofia: proceso.estado_sofia ?? 'PENDIENTE'
      });
    }
  }, [proceso]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const notaInstructor = parseFloat(formData.nota_instructor);

    if (isNaN(notaInstructor) || notaInstructor < 0 || notaInstructor > 10) {
      return setError('La nota del instructor debe estar entre 0 y 10.');
    }

    setLoading(true);
    try {
      await procesoService.registrarEvaluacionFinal(proceso.id, {
        nota_empresa: proceso.nota_empresa, // Conserva la nota que ya estaba
        nota_instructor: notaInstructor,
        estado_sofia: formData.estado_sofia
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const detalle = err.response?.data?.detail;
      if (Array.isArray(detalle)) {
        setError(detalle.map(d => d.msg).join(', '));
      } else {
        setError(detalle || 'Error al registrar la evaluación final.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '24px', borderRadius: '8px',
        width: '400px', maxWidth: '90%'
      }}>
        <h2>Registrar Evaluación Final</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Aprendiz: <strong>{proceso?.aprendiz_nombre || `Proceso #${proceso?.id}`}</strong>
        </p>

        {error && (
          <div style={{ background: '#fee', color: '#c00', padding: '8px', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Nota del Instructor (0-10):</label>
            <input type="number" name="nota_instructor" min="0" max="10" step="0.1"
              value={formData.nota_instructor} onChange={handleChange} required
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Estado:</label>
            <select name="estado_sofia" value={formData.estado_sofia} onChange={handleChange}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="PENDIENTE">Pendiente</option>
              <option value="POR_EVALUAR">Por Evaluar</option>
              <option value="APROBADO">Aprobado</option>
              <option value="NO_APROBADO">No Aprobado</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ padding: '8px 16px' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{
              padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px'
            }}>
              {loading ? 'Guardando...' : 'Guardar Evaluacion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
