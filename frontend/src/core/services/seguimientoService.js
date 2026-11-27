// src/core/services/seguimientoService.js
import { apiClient } from '../api/client';

export const seguimientoService = {
  getMomentos: async () => {
    return await apiClient.get('/reportes/momentos');
  },

  getMomentosByFicha: async (fichaId) => {
    return await apiClient.get(`/reportes/momentos/ficha/${fichaId}`);
  },

  // Lista reuniones (opcionalmente filtradas)
  getReuniones: async (params = {}) => {
    return await apiClient.get('/seguimientos', { params });
  },

  // Programar reunión (momento inicial / parcial / final)
  createReunion: async (data) => {
    return await apiClient.post('/seguimientos', data);
  },

  // Actualizar reunión
  updateReunion: async (id, data) => {
    return await apiClient.put(`/seguimientos/${id}`, data);
  },
};

export default seguimientoService;