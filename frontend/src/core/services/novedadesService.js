// src/core/services/novedadesService.js
import { apiClient } from '../api/client';

export const novedadesService = {
  getStats: async () => {
    return await apiClient.get('/novedades/stats');
  },

  listar: async (search = '', tipo = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tipo) params.append('tipo', tipo);
    const url = params.toString()
      ? `/novedades/?${params.toString()}`
      : '/novedades/';
    return await apiClient.get(url);
  },

  obtenerDetalle: async (novedadId) => {
    return await apiClient.get(`/novedades/${novedadId}`);
  },

  /**
   * Crea una novedad en un proceso.
   * tipo_novedad: RENUNCIA | INCAPACIDAD | CAMBIO_EMPRESA | PRORROGA | OTRO
   * fecha_novedad: opcional (si no se envía, el backend pone la fecha de hoy)
   */
  crear: async (procesoId, data) => {
    return await apiClient.post(`/procesos/${procesoId}/novedades`, data);
  },

  listarPorProceso: async (procesoId) => {
    return await apiClient.get(`/procesos/${procesoId}/novedades`);
  },
};

export default novedadesService;