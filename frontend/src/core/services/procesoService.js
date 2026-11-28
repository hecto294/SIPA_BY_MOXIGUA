// src/core/services/procesoService.js
import { apiClient } from '../api/client';

export const procesoService = {
  getProcesos: async (params = {}) => {
    return await apiClient.get('/procesos', { params });
  },

  getProcesoById: async (id) => {
    return await apiClient.get(`/procesos/${id}`);
  },

  updateProceso: async (id, data) => {
    return await apiClient.put(`/procesos/${id}`, data);
  },

  getUsuarioById: async (id) => {
    return await apiClient.get(`/usuarios/${id}`);
  },

  getModalidades: async () => {
    return await apiClient.get('/modalidades/');
  },

  asignarAlternativa: async (procesoId, modalidadId) => {
    return await apiClient.put(`/procesos/${procesoId}`, {
      modalidad_id: modalidadId,
    });
  },

  inactivarProceso: async (procesoId) => {
    return await apiClient.patch(`/procesos/${procesoId}/inactivar`);
  },

  reactivarProceso: async (procesoId) => {
    return await apiClient.put(`/procesos/${procesoId}`, {
      is_active: true,
      estado: 'ACTIVO',
    });
  },

  createProceso: async (data) => {
    return await apiClient.post('/procesos', data);
  },

  // ========== CHECKLIST ==========
  getChecklist: async (procesoId) => {
    return await apiClient.get(`/procesos/${procesoId}/checklist`);
  },

  createChecklistItem: async (procesoId, data) => {
    return await apiClient.post(`/procesos/${procesoId}/checklist`, data);
  },

  updateChecklistItem: async (itemId, data) => {
    return await apiClient.put(`/procesos/checklist/${itemId}`, data);
  },

  /**
   * Sube un archivo y lo asocia a un ítem del checklist.
   * El backend cambia el estado a ENTREGADO automáticamente.
   */
  subirEvidenciaChecklist: async (itemId, file) => {
    const formData = new FormData();
    formData.append('archivo', file);

    return await apiClient.post(
      `/procesos/checklist/${itemId}/evidencia`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  // RF-050: Registrar evaluacion final (notas y estado SOFIA)
  registrarEvaluacionFinal: async (procesoId, data) => {
    return await apiClient.patch(`/procesos/${procesoId}/evaluacion`, data);
  },
};

export default procesoService;