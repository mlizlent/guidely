import { useState, useEffect, useCallback } from 'react';
import { documentsApi, indexApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Table, Pagination } from '../components/ui/Table';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { PageHeader } from '../components/layout/Header';
import { useToastHelpers } from '../components/ui/Toast';
import './Indexing.css';

export function Indexing() {
  const { success, error, warning, info } = useToastHelpers();

  // State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentsApi.list({
        page: currentPage,
        page_size: pageSize,
      });
      setDocuments(response.items || []);
      setTotalItems(response.total || 0);
      setTotalPages(Math.ceil((response.total || 0) / pageSize));
    } catch (err) {
      error('Failed to load documents', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, error]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Get documents that need indexing
  const staleDocuments = documents.filter(d =>
    d.status === 'uploaded' || d.status === 'failed' || d.status === 'indexing'
  );

  const indexedDocuments = documents.filter(d => d.status === 'indexed');

  // Handle indexing
  const handleIndexSelected = async () => {
    if (selectedDocs.length === 0) {
      warning('Please select documents to index');
      return;
    }

    setIndexing(true);
    try {
      const response = await indexApi.trigger(selectedDocs);
      setIndexResult(response);
      success('Indexing started', `${response.docs_queued} document(s) queued for indexing`);
      setSelectedDocs([]);
      // Refresh after a short delay
      setTimeout(fetchDocuments, 2000);
    } catch (err) {
      error('Indexing failed', err.message);
    } finally {
      setIndexing(false);
    }
  };

  const handleIndexAllStale = async () => {
    const staleIds = staleDocuments.map(d => d.id);
    if (staleIds.length === 0) {
      info('No stale documents', 'All documents are already indexed');
      return;
    }

    setIndexing(true);
    try {
      const response = await indexApi.trigger(staleIds);
      setIndexResult(response);
      success('Indexing started', `${response.docs_queued} stale document(s) queued`);
      setSelectedDocs([]);
      setTimeout(fetchDocuments, 2000);
    } catch (err) {
      error('Indexing failed', err.message);
    } finally {
      setIndexing(false);
    }
  };

  const handleIndexAll = async () => {
    const allIds = documents.map(d => d.id);
    if (allIds.length === 0) {
      warning('No documents to index');
      return;
    }

    setIndexing(true);
    try {
      const response = await indexApi.trigger(allIds);
      setIndexResult(response);
      success('Indexing started', `${response.docs_queued} document(s) queued`);
      setSelectedDocs([]);
      setTimeout(fetchDocuments, 2000);
    } catch (err) {
      error('Indexing failed', err.message);
    } finally {
      setIndexing(false);
    }
  };

  // Selection handlers
  const handleSelectAll = (selected) => {
    setSelectedDocs(selected);
  };

  const handleRowSelect = (docId) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  // Table columns
  const columns = [
    { key: 'title', header: 'Document', render: (row) => (
      <div className="index-doc-cell">
        <span className="index-doc-cell__title">{row.title}</span>
        <span className="index-doc-cell__filename">{row.filename}</span>
      </div>
    )},
    { key: 'status', header: 'Status', render: (row) => (
      <StatusBadge status={row.status} />
    )},
    { key: 'chunk_count', header: 'Chunks', render: (row) => (
      <span className="index-chunks">{row.chunk_count || 0}</span>
    )},
    { key: 'updated_at', header: 'Last Updated', render: (row) => formatDate(row.updated_at) },
  ];

  return (
    <div className="indexing-page">
      <PageHeader
        title="Indexing"
        subtitle="Manage document indexing and embedding generation"
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              onClick={handleIndexAllStale}
              disabled={indexing || staleDocuments.length === 0}
            >
              Index Stale ({staleDocuments.length})
            </Button>
            <Button
              variant="primary"
              onClick={handleIndexAll}
              disabled={indexing || documents.length === 0}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Re-index All
            </Button>
          </div>
        }
      />

      {/* Status Summary */}
      <div className="indexing-summary">
        <Card variant="outlined" className="indexing-summary__card">
          <CardBody padding="md" className="indexing-summary__grid">
            <div className="indexing-stat indexing-stat--indexed">
              <span className="indexing-stat__value">{indexedDocuments.length}</span>
              <span className="indexing-stat__label">Indexed</span>
            </div>
            <div className="indexing-stat indexing-stat--pending">
              <span className="indexing-stat__value">{staleDocuments.length}</span>
              <span className="indexing-stat__label">Need Indexing</span>
            </div>
            <div className="indexing-stat indexing-stat--total">
              <span className="indexing-stat__value">{documents.length}</span>
              <span className="indexing-stat__label">Total Documents</span>
            </div>
            <div className="indexing-stat indexing-stat--chunks">
              <span className="indexing-stat__value">{documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0)}</span>
              <span className="indexing-stat__label">Total Chunks</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Index Result */}
      {indexResult && (
        <Card variant="outlined" className="indexing-result">
          <CardHeader title="Last Indexing Result" />
          <CardBody>
            <div className="indexing-result__grid">
              <div className="indexing-result__item">
                <span className="indexing-result__label">Documents Processed</span>
                <span className="indexing-result__value">{indexResult.docs_processed}</span>
              </div>
              <div className="indexing-result__item">
                <span className="indexing-result__label">Chunks Created</span>
                <span className="indexing-result__value">{indexResult.chunks_created}</span>
              </div>
              <div className="indexing-result__item">
                <span className="indexing-result__label">Embeddings Generated</span>
                <span className="indexing-result__value">{indexResult.embeddings_generated}</span>
              </div>
              <div className="indexing-result__item">
                <span className="indexing-result__label">Embeddings Cached</span>
                <span className="indexing-result__value">{indexResult.embeddings_cached}</span>
              </div>
            </div>
            {indexResult.errors && indexResult.errors.length > 0 && (
              <div className="indexing-result__errors">
                <h4>Errors:</h4>
                <ul>
                  {indexResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Documents Table */}
      <Card variant="outlined" padding="none">
        <Table
          columns={columns}
          data={documents}
          keyField="id"
          loading={loading}
          emptyMessage="No documents found. Upload documents to get started."
          selectable
          selectedRows={selectedDocs}
          onSelectionChange={handleSelectAll}
        />
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </Card>

      {/* Selected Documents Actions */}
      {selectedDocs.length > 0 && (
        <Card variant="outlined" className="indexing-selected-actions">
          <CardBody padding="md" className="indexing-selected-actions__content">
            <span className="indexing-selected-actions__text">
              {selectedDocs.length} document{selectedDocs.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="primary"
              onClick={handleIndexSelected}
              disabled={indexing}
              loading={indexing}
            >
              Index Selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDocs([])}>
              Clear Selection
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Info Card */}
      <Card variant="outlined" className="indexing-info">
        <CardHeader title="How Indexing Works" />
        <CardBody>
          <ul className="indexing-info__list">
            <li>
              <strong>Uploaded:</strong> Document is stored but not yet processed for search.
            </li>
            <li>
              <strong>Indexing:</strong> Document is being chunked and embeddings are being generated.
            </li>
            <li>
              <strong>Indexed:</strong> Document is fully processed and searchable.
            </li>
            <li>
              <strong>Failed:</strong> Indexing encountered an error. Check logs and retry.
            </li>
            <li>
              Editing document content marks it as stale (back to <code>uploaded</code> status) until re-indexed.
            </li>
            <li>
              Embeddings are cached to avoid regenerating for unchanged content.
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}