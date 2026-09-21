const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let message = 'An error occurred';
    let code = 'unknown_error';
    let details = null;

    if (isJson && data.error) {
      message = data.error.message;
      code = data.error.code;
      details = data.error;
    } else if (typeof data === 'string') {
      message = data;
    }

    throw new ApiError(message, response.status, code, details);
  }

  return data;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Remove Content-Type for FormData (browser sets it with boundary)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);
  return handleResponse(response);
}

// Document API
export const documentsApi = {
  // Upload a document
  upload: async (file, title, tags = []) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

    return request('/documents', {
      method: 'POST',
      body: formData,
    });
  },

  // List documents with pagination and filtering
  list: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page);
    if (params.page_size) searchParams.set('page_size', params.page_size);
    if (params.tag) searchParams.set('tag', params.tag);

    const query = searchParams.toString();
    return request(`/documents${query ? `?${query}` : ''}`);
  },

  // Get a single document (if needed)
  get: async (docId) => {
    return request(`/documents/${docId}`);
  },

  // Update document metadata or content
  update: async (docId, data) => {
    return request(`/documents/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete a document
  delete: async (docId) => {
    return request(`/documents/${docId}`, {
      method: 'DELETE',
    });
  },
};

// Index API
export const indexApi = {
  // Trigger indexing for specific docs or all stale docs
  trigger: async (docIds = []) => {
    return request('/index', {
      method: 'POST',
      body: JSON.stringify({ doc_ids: docIds }),
    });
  },
};

// Search API
export const searchApi = {
  // Perform RAG search
  query: async (query, options = {}) => {
    return request('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        top_k: options.topK || 5,
        tags: options.tags || [],
      }),
    });
  },
};

// Health API
export const healthApi = {
  // Check system health
  check: async () => {
    return request('/health');
  },
};

// Metrics API
export const metricsApi = {
  // Get system metrics
  get: async () => {
    return request('/metrics');
  },
};

// Export error class for handling
export { ApiError };

// Default export for convenience
export default {
  documents: documentsApi,
  index: indexApi,
  search: searchApi,
  health: healthApi,
  metrics: metricsApi,
  ApiError,
};