// src/core/services/cartaPresentacionService.js
import { apiClient } from '../api/client';

export const cartaPresentacionService = {
  // Listar cartas (según el rol del usuario logueado)
  listar: async (params = {}) => {
    return await apiClient.get('/cartas-presentacion/', { params });
  },

  // Coordinador sube el PDF firmado
  subir: async (procesoId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await apiClient.post(
      `/cartas-presentacion/subir?proceso_id=${procesoId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  // Actualizar estado (APROBADA / RECHAZADA / CARGADA)
  actualizarEstado: async (cartaId, estado, observaciones = null) => {
    return await apiClient.patch(`/cartas-presentacion/${cartaId}/estado`, {
      estado,
      observaciones,
    });
  },

  // Eliminar (soft delete)
  eliminar: async (cartaId) => {
    return await apiClient.delete(`/cartas-presentacion/${cartaId}`);
  },
};

export default cartaPresentacionService;