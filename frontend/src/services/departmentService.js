import api from './api';

export const listDepartments = (opts = {}) =>
  api.get('/departments', { params: opts }).then((r) => r.data || r);

export const createDepartment = (payload) =>
  api.post('/departments', payload).then((r) => r.data || r);

export const updateDepartment = (uuid, payload) =>
  api.put(`/departments/${encodeURIComponent(uuid)}`, payload).then((r) => r.data || r);

export const deleteDepartment = (uuid) =>
  api.delete(`/departments/${encodeURIComponent(uuid)}`).then((r) => r.data || r);

export const getDepartment = (uuid) =>
  api.get(`/departments/${encodeURIComponent(uuid)}`).then((r) => r.data || r);

export default {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartment,
};
