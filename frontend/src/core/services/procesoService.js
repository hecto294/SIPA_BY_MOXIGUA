// src/core/services/procesoService.js
import { apiClient } from '../api/client';

export const procesoService = {
  // Lista procesos (con filtros opcionales)
  getProcesos: async (params = {}) => {
    return await apiClient.get('/procesos', { params });
  },

  // Trae un proceso por ID
  getProcesoById: async (id) => {
    return await apiClient.get(`/procesos/${id}`);
  },

  // Actualiza un proceso (PUT)
  updateProceso: async (id, data) => {
    return await apiClient.put(`/procesos/${id}`, data);
  },

  // Trae los datos del aprendiz (nombre, email) dado su ID
  getUsuarioById: async (id) => {
    return await apiClient.get(`/usuarios/${id}`);
  },

  // 🔥 Obtener modalidades (alternativas) del backend
  getModalidades: async () => {
    return await apiClient.get('/modalidades/');
  },

  // 🔥 Asignar alternativa (modalidad) a un proceso
  asignarAlternativa: async (procesoId, modalidadId) => {
    return await apiClient.put(`/procesos/${procesoId}`, {
      modalidad_id: modalidadId,
    });
  },
};

export default procesoService;