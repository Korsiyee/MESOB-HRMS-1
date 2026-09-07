const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "http://localhost:5000/api";

async function request(path, options = {}) {
  const headers = options.headers !== undefined 
    ? options.headers 
    : { "Content-Type": "application/json" };

  const token = localStorage.getItem("authToken");
  if (token && headers) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
  };

  // Only add headers if they exist (FormData sets its own Content-Type)
  if (headers && Object.keys(headers).length > 0) {
    fetchOptions.headers = headers;
  }

  const response = await fetch(`${API_BASE}${path}`, fetchOptions);

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Request failed");
  }
  return payload;
}

export const LetterApi = {
  // ── Templates ──────────────────────────────────────────
  listTemplates: () =>
    request("/letters/templates"),

  createTemplate: (body) =>
    request("/letters/templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createTemplateWithPDF: (formData) =>
    request("/letters/templates", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  updateTemplate: (uuid, body) =>
    request(`/letters/templates/${encodeURIComponent(uuid)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteTemplate: (uuid) =>
    request(`/letters/templates/${encodeURIComponent(uuid)}`, {
      method: "DELETE",
    }),

  // ── Letter generation & retrieval ──────────────────────
  generateLetter: (body) =>
    request("/letters/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listIssuedLetters: (employeeUuid) =>
    request(`/letters/employee/${encodeURIComponent(employeeUuid)}`),

  getLetterContent: (uuid) =>
    request(`/letters/${encodeURIComponent(uuid)}/content`),

  // ── PDF Preview ──────────────────────────────────────────
  getTemplatePDFPreview: (uuid) =>
    request(`/letters/templates/${encodeURIComponent(uuid)}/preview`),

  downloadTemplatePDF: (uuid) =>
    request(`/letters/templates/${encodeURIComponent(uuid)}/download`),

  // ── Placeholders ────────────────────────────────────────
  getPlaceholders: () =>
    request("/letters/placeholders"),

  // ── Letter Requests (Employee → HR workflow) ──────────────────
  requestLetter: (template_uuid) =>
    request("/letters/request", {
      method: "POST",
      body: JSON.stringify({ template_uuid }),
    }),

  getMyLetterRequests: () =>
    request("/letters/requests/my"),

  cancelLetterRequest: (uuid) =>
    request(`/letters/requests/${encodeURIComponent(uuid)}`, {
      method: "DELETE",
    }),

  // ── Letter Requests (HR Management) ────────────────────────────
  getPendingLetterRequests: () =>
    request("/letters/requests/pending"),

  getAllLetterRequests: () =>
    request("/letters/requests/all"),

  approveLetterRequest: (uuid) =>
    request(`/letters/requests/${encodeURIComponent(uuid)}/approve`, {
      method: "POST",
    }),

  rejectLetterRequest: (uuid, reason) =>
    request(`/letters/requests/${encodeURIComponent(uuid)}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // ── Enhanced Letter System (Centralized Templates) ────────────────────────────
  // Configuration
  getOrganizationConfig: () =>
    request("/letters/config/organization"),

  updateOrganizationConfig: (body) =>
    request("/letters/config/organization", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  uploadOrganizationLogo: (formData) =>
    request("/letters/config/organization/logo", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  getLetterLayouts: () =>
    request("/letters/config/layouts"),

  getActiveLetterLayout: () =>
    request("/letters/config/layouts/active"),

  activateLetterLayout: (id) =>
    request(`/letters/config/layouts/${id}/activate`, {
      method: "POST",
    }),

  getPlaceholdersList: () =>
    request("/letters/config/placeholders"),

  getLetterCategories: () =>
    request("/letters/config/categories"),

  // Enhanced Templates
  createEnhancedTemplate: (body) =>
    request("/letters/enhanced/templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateEnhancedTemplate: (uuid, body) =>
    request(`/letters/enhanced/templates/${encodeURIComponent(uuid)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getTemplatesByCategory: (category) =>
    request(`/letters/enhanced/templates/category/${encodeURIComponent(category)}`),

  getTemplateVersions: (uuid) =>
    request(`/letters/enhanced/templates/${encodeURIComponent(uuid)}/versions`),

  // Enhanced Letter Generation
  generateEnhancedLetter: async (body) => {
    try {
      const token = localStorage.getItem("authToken");
      console.log('[Frontend] Requesting PDF generation...');
      
      const response = await fetch(`${API_BASE}/letters/enhanced/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      console.log('[Frontend] Response status:', response.status);
      console.log('[Frontend] Response headers:', {
        contentType: response.headers.get('Content-Type'),
        contentDisposition: response.headers.get('Content-Disposition'),
        contentLength: response.headers.get('Content-Length')
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Generation failed' }));
        console.error('[Frontend] Generation failed:', error);
        throw new Error(error.message || "Generation failed");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `letter_${Date.now()}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      console.log('[Frontend] Downloading as:', filename);

      // Get the PDF blob
      const blob = await response.blob();
      console.log('[Frontend] Blob size:', blob.size, 'type:', blob.type);

      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('[Frontend] Download complete, cleaned up');
      }, 100);
      
      return { success: true, filename };
    } catch (error) {
      console.error('[Frontend] Download error:', error);
      throw error;
    }
  },

  previewEnhancedLetter: (body) => {
    // employee_uuid is optional - backend will use first active employee or mock data
    if (!body.template_uuid) {
      throw new Error('template_uuid is required for preview');
    }
    return request("/letters/enhanced/preview", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
