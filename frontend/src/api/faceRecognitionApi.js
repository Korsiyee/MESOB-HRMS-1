const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  'http://localhost:5000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = { ...(options.headers || {}) };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const payload = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(payload.message || payload.error || 'Request failed');
  }
  
  return payload;
}

export const FaceRecognitionApi = {
  /**
   * Register face images for an employee
   * @param {string} employeeUuid - Employee UUID
   * @param {Blob[]} images - Array of 7 face image blobs
   * @param {Array[]} descriptors - Array of 7 face descriptors
   */
  registerFaceImages: async (employeeUuid, images, descriptors) => {
    const formData = new FormData();
    formData.append('employee_uuid', employeeUuid);
    formData.append('descriptors', JSON.stringify(descriptors));
    
    images.forEach((image, index) => {
      formData.append('images', image, `face_${index + 1}.jpg`);
    });

    return request('/face-recognition/register', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Verify a face and get matching employee
   * @param {Array} descriptor - Face descriptor array
   */
  verifyFace: async (descriptor) => {
    return request('/face-recognition/verify', {
      method: 'POST',
      body: JSON.stringify({ descriptor }),
    });
  },

  /**
   * Log attendance via face recognition
   * @param {Array} descriptor - Face descriptor array
   * @param {string} type - 'CHECK_IN' or 'CHECK_OUT'
   * @param {string} timestamp - ISO timestamp
   */
  logAttendanceByFace: async (descriptor, type, timestamp) => {
    return request('/face-recognition/attendance', {
      method: 'POST',
      body: JSON.stringify({ descriptor, type, timestamp }),
    });
  },

  /**
   * Check if employee has face images registered
   * @param {string} employeeUuid - Employee UUID
   */
  getFaceRegistrationStatus: async (employeeUuid) => {
    return request(`/face-recognition/status/${encodeURIComponent(employeeUuid)}`);
  },

  /**
   * Delete face images for an employee
   * @param {string} employeeUuid - Employee UUID
   */
  deleteFaceImages: async (employeeUuid) => {
    return request(`/face-recognition/${encodeURIComponent(employeeUuid)}`, {
      method: 'DELETE',
    });
  },
};
