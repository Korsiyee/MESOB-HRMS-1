const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  'http://localhost:5000/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type':'application/json', ...(options.headers||{}) };
  const token = localStorage.getItem('authToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const payload = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(payload.message||payload.error||'Request failed');
  return payload;
}

export const HolidayApi = {
  getByYear:    (year)              => request(`/holidays/year/${encodeURIComponent(year)}`),
  getRange:     (start,end)         => request(`/holidays/range?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`),
  check:        (date)              => request(`/holidays/check/${encodeURIComponent(date)}`),
  getStats:     ()                  => request('/holidays/statistics'),
  create:       (body)              => request('/holidays',{method:'POST',body:JSON.stringify(body)}),
  update:       (uuid,body)         => request(`/holidays/item/${encodeURIComponent(uuid)}`,{method:'PATCH',body:JSON.stringify(body)}),
  delete:       (uuid)              => request(`/holidays/item/${encodeURIComponent(uuid)}`,{method:'DELETE'}),
  toggleStatus: (date,isActive)     => request(`/holidays/${encodeURIComponent(date)}/status`,{method:'PATCH',body:JSON.stringify({isActive})}),
  initialize:   (startYear,endYear,overwriteManual=false) => request('/holidays/initialize',{method:'POST',body:JSON.stringify({startYear,endYear,overwriteManual})}),
  sync:         (ethiopianYear,overwriteManual=false)     => request(`/holidays/sync/${encodeURIComponent(ethiopianYear)}`,{method:'POST',body:JSON.stringify({overwriteManual})}),
};
