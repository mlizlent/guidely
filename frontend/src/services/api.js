// API base URL. In dev, Vite proxies /api to the backend. In production the
// frontend and backend are separate services, so the base is injected at
// build time via VITE_API_BASE.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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

// The backend tracks {doc_id, file_name, chunk_count, status, error, system,
// size_bytes} per document. Map those onto the shape the UI expects, filling
// in sensible defaults for fields the backend does not track (tags, timestamps).
function normalizeDocument({ doc_id, file_name, chunk_count, status, error, system, size_bytes }) {
  const title = file_name ? file_name.replace(/\.[^/.]+$/, '') : file_name;
  return {
    id: doc_id,
    doc_id,
    title: title || file_name,
    filename: file_name,
    file_name,
    status: status || 'uploaded',
    chunk_count: chunk_count ?? 0,
    size_bytes: size_bytes ?? 0,
    tags: [],
    created_at: null,
    updated_at: null,
    error: error || null,
    system: !!system,
  };
}

// Document API
export const documentsApi = {
  // Upload a document
  upload: async (file, title, tags = []) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (tags.length > 0) formData.append('tags', JSON.stringify(tags));

    return request('/documents/upload', {
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
    const items = await request(`/documents${query ? `?${query}` : ''}`);

    const normalized = Array.isArray(items) ? items.map(normalizeDocument) : [];
    return {
      items: normalized,
      total: normalized.length,
      page: params.page || 1,
      page_size: params.page_size || normalized.length,
    };
  },

  // Get a single document (if needed)
  get: async (docId) => {
    return request(`/documents/${docId}`);
  },

  // Get indexing status for a single document (async indexing flow)
  status: async (docId) => {
    return request(`/documents/${docId}/status`);
  },

  // Update document metadata or content.
  // NOTE: The backend's PUT /documents/{doc_id} currently accepts a file
  // upload only, so metadata-only updates will be rejected until the backend
  // supports them.
  update: async (docId, data) => {
    return request(`/documents/${docId}`, {
      method: 'PUT',
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
  // Trigger indexing for specific docs or all stale docs.
  // NOTE: The backend currently re-indexes every file in the uploads
  // directory and ignores the requested doc_ids.
  trigger: async (docIds = []) => {
    const data = await request('/documents/reindex', {
      method: 'POST',
      body: JSON.stringify({ doc_ids: docIds }),
    });
    return {
      ...data,
      docs_queued: data.documents_processed ?? 0,
      docs_processed: data.documents_processed ?? 0,
      chunks_created: data.chunks_reembedded ?? 0,
      embeddings_generated: data.chunks_reembedded ?? 0,
      embeddings_cached: data.chunks_reused ?? 0,
      errors: [],
    };
  },
};

// Search API
export const searchApi = {
  // Perform RAG search.
  // NOTE: The backend's /search/ask accepts { question } only (it rejects
  // unknown fields), so top_k / tag filtering are dropped until supported.
  query: async (query, _options = {}) => {
    const data = await request('/search/ask', {
      method: 'POST',
      body: JSON.stringify({ question: query }),
    });
    return {
      ...data,
      sources: (data.sources || []).map((source) => ({
        ...source,
        title: source.file_name || 'Document',
        doc_id: source.file_name || source.section || '',
        chunk_id: source.section || '',
      })),
    };
  },
};

// Health API
export const healthApi = {
  // Check system health
  check: async () => {
    const data = await request('/health');
    return {
      ...data,
      status: data.status === 'healthy' ? 'ok' : data.status,
    };
  },
};

// Metrics API
export const metricsApi = {
  // Get system metrics
  get: async () => {
    const data = await request('/metrics');
    return {
      ...data,
      docs_total: data.total_documents ?? data.documents ?? 0,
      chunks_total: data.active_chunks ?? data.chunks ?? 0,
      queries_served: data.queries_served ?? data.total_queries ?? 0,
      queries_last_24h: data.queries_served ?? data.total_queries ?? 0,
      latency_ms: {
        p50: data.latency_ms_median ?? 0,
        p95: data.latency_ms_p95 ?? 0,
      },
      cache_hit_rate: 0,
    };
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