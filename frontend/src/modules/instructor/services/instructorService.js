// src/modules/instructor/services/instructorService.js
import { apiClient } from '@/core/api/client';

export const instructorService = {
  // ---------- Aprendices disponibles ----------
  getAprendicesDisponibles: async (instructorId) => {
    return await apiClient.get(`/instructor/aprendices-disponibles/${instructorId}`);
  },

  // ---------- Empresas ----------
  getEmpresas: async (instructorId) => {
    return await apiClient.get(`/instructor/empresas/${instructorId}`);
  },

  crearEmpresa: async (data) => {
    return await apiClient.post('/instructor/empresas', data);
  },

  actualizarEmpresa: async (empresaId, data) => {
    return await apiClient.put(`/instructor/empresas/${empresaId}`, data);
  },

  eliminarEmpresa: async (empresaId) => {
    return await apiClient.delete(`/instructor/empresas/${empresaId}`);
  },

  // ---------- Fichas / Momentos ----------
  getFichas: async (instructorId) => {
    return await apiClient.get(`/instructor/fichas/${instructorId}`);
  },

  getMomentos: async (instructorId) => {
    return await apiClient.get(`/instructor/momentos/${instructorId}`);
  },
};

export default instructorService;