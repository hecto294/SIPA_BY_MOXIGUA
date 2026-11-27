// src/core/services/bitacoraService.js
import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

export const bitacoraService = {
  getBitacoras: async (params = {}) => {
    return await apiClient.get(API_ENDPOINTS.BITACORAS.GET_ALL, { params });
  },

  getBitacoraById: async (id) => {
    return await apiClient.get(API_ENDPOINTS.BITACORAS.GET_BY_ID(id));
  },

  getBitacorasByFicha: async (fichaId) => {
    return await apiClient.get(API_ENDPOINTS.BITACORAS.GET_BY_FICHA(fichaId));
  },

  getBitacorasByAprendiz: async (aprendizId) => {
    return await apiClient.get(API_ENDPOINTS.BITACORAS.GET_BY_APRENDIZ(aprendizId));
  },

  getEvidencias: async (bitacoraId) => {
    return await apiClient.get(API_ENDPOINTS.BITACORAS.GET_EVIDENCIAS(bitacoraId));
  },

  createBitacora: async (data) => {
    return await apiClient.post(API_ENDPOINTS.BITACORAS.CREATE, data);
  },

  updateBitacora: async (id, data) => {
    return await apiClient.put(API_ENDPOINTS.BITACORAS.UPDATE(id), data);
  },

  /**
   * Envía la bitácora al instructor (BORRADOR / CON_OBSERVACIONES → ENVIADA)
   */
  enviarBitacora: async (id) => {
    return await apiClient.post(`/bitacoras/${id}/enviar`);
  },

  /**
   * Elimina una bitácora (solo BORRADOR, solo el aprendiz dueño)
   */
  deleteBitacora: async (id) => {
    return await apiClient.delete(API_ENDPOINTS.BITACORAS.DELETE(id));
  },

  // RF-083: descargar el archivo real de una evidencia (con sesion)
  descargarEvidencia: async (evidenciaId, nombreArchivo = 'archivo') => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = localStorage.getItem('token');

    const response = await fetch(`${base}/bitacoras/evidencias/${evidenciaId}/descargar`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'No se pudo descargar el archivo');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default bitacoraService;