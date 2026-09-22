import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, FileInput, Textarea } from '../components/ui/Input';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Table, Pagination } from '../components/ui/Table';
import { Spinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/layout/Header';
import { useToastHelpers } from '../components/ui/Toast';

const STATUS_OPTIONS = [
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'indexing', label: 'Indexing' },
  { value: 'indexed', label: 'Indexed' },
  { value: 'failed', label: 'Failed' },
];

const TAG_SUGGESTIONS = ['hr', 'finance', 'legal', 'engineering', 'marketing', 'operations', 'policy', 'guide', 'faq'];

export function Documents() {
  const navigate = useNavigate();
  const { success, error, warning } = useToastHelpers();

  // State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tagFilter, setTagFilter] = useState('');

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // View content modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentsApi.list({
        page: currentPage,
        page_size: pageSize,
        tag: tagFilter || undefined,
      });
      setDocuments(response.items || []);
      setTotalItems(response.total || 0);
      setTotalPages(Math.ceil((response.total || 0) / pageSize));
    } catch (err) {
      error('Failed to load documents', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, tagFilter, error]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handlers
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      warning('Please select a file');
      return;
    }

    setUploadLoading(true);
    try {
      const tags = uploadTags.split(',').map(t => t.trim()).filter(Boolean);
      await documentsApi.upload(uploadFile, uploadTitle || uploadFile.name, tags);
      success('Document uploaded', `${uploadFile.name} has been uploaded`);
      setUploadOpen(false);
      resetUploadForm();
      fetchDocuments();
    } catch (err) {
      error('Upload failed', err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadTags('');
  };

  const handleEditClick = (doc) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditTags(doc.tags?.join(', ') || '');
    setEditContent('');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editDoc) return;

    setEditLoading(true);
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
      const updateData = {
        title: editTitle,
        tags,
      };
      if (editContent.trim()) {
        updateData.content = editContent;
      }
      await documentsApi.update(editDoc.id, updateData);
      success('Document updated', 'Changes have been saved');
      setEditOpen(false);
      fetchDocuments();
    } catch (err) {
      error('Update failed', err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (doc) => {
    setDeleteDoc(doc);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;

    setDeleteLoading(true);
    try {
      await documentsApi.delete(deleteDoc.id);
      success('Document deleted', `${deleteDoc.title} has been removed`);
      setDeleteOpen(false);
      setDeleteDoc(null);
      fetchDocuments();
    } catch (err) {
      error('Delete failed', err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewContent = async (doc) => {
    setViewDoc(doc);
    setViewOpen(true);
  };

  const handleTagFilterChange = (tag) => {
    setTagFilter(tag);
    setCurrentPage(1);
  };

  const clearTagFilter = () => {
    setTagFilter('');
    setCurrentPage(1);
  };

  // Collect all unique tags from documents
  const allTags = [...new Set(documents.flatMap(d => d.tags || []))].sort();

  // Table columns
  const columns = [
    { key: 'title', header: 'Title', render: (row) => (
      <div className="doc-title-cell">
        <span className="doc-title-cell__name" onClick={() => handleViewContent(row)}>{row.title}</span>
        <span className="doc-title-cell__filename">{row.filename}</span>
      </div>
    )},
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'chunk_count', header: 'Chunks', render: (row) => (
      <span className="doc-chunks">{row.chunk_count || 0}</span>
    )},
    { key: 'size_bytes', header: 'Size', render: (row) => formatBytes(row.size_bytes) },
    { key: 'tags', header: 'Tags', render: (row) => (
      <div className="doc-tags">
        {(row.tags || []).slice(0, 3).map(tag => (
          <Badge key={tag} variant="default" size="sm">{tag}</Badge>
        ))}
        {(row.tags || []).length > 3 && (
          <Badge variant="default" size="sm">+{(row.tags || []).length - 3}</Badge>
        )}
      </div>
    )},
    { key: 'updated_at', header: 'Updated', render: (row) => formatDate(row.updated_at) },
  ];

  return (
    <div className="documents-page">
      <PageHeader
        title="Documents"
        subtitle="Manage your knowledge base documents"
        action={
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Upload Document
          </Button>
        }
      />

      {/* Tag Filter */}
      <div className="documents-filter">
        <div className="documents-filter__tags">
          <span className="documents-filter__label">Filter by tag:</span>
          <Badge
            variant={tagFilter ? 'primary' : 'default'}
            size="sm"
            onClick={clearTagFilter}
            className="documents-filter__clear"
            style={{ cursor: tagFilter ? 'pointer' : 'default', opacity: tagFilter ? 1 : 0.5 }}
          >
            All
          </Badge>
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={tagFilter === tag ? 'primary' : 'default'}
              size="sm"
              onClick={() => handleTagFilterChange(tag)}
              className="documents-filter__tag"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <Card variant="outlined" padding="none">
        <Table
          columns={columns}
          data={documents}
          keyField="id"
          loading={loading}
          emptyMessage="No documents found. Upload your first document to get started."
          onRowClick={handleViewContent}
          selectable
          selectedRows={[]}
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

      {/* Upload Modal */}
      <Modal
        isOpen={uploadOpen}
        onClose={() => { setUploadOpen(false); resetUploadForm(); }}
        title="Upload Document"
        size="md"
        footer={
          <div className="modal__footer-actions">
            <Button variant="ghost" onClick={() => { setUploadOpen(false); resetUploadForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleUpload} loading={uploadLoading} disabled={!uploadFile}>
              Upload
            </Button>
          </div>
        }
      >
        <div className="upload-form">
          <FileInput
            label="File"
            value={uploadFile ? [uploadFile] : []}
            onChange={handleFileSelect}
            accept=".txt,.md,.pdf"
            required
            helperText="Supported formats: .txt, .md, .pdf"
          />
          <Input
            label="Title (optional)"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Defaults to filename"
            helperText="Leave empty to use the filename"
          />
          <Input
            label="Tags (optional)"
            value={uploadTags}
            onChange={(e) => setUploadTags(e.target.value)}
            placeholder="hr, policy, benefits"
            helperText="Comma-separated tags for categorization"
          />
          <div className="tag-suggestions">
            <span className="tag-suggestions__label">Suggestions:</span>
            {TAG_SUGGESTIONS.map(tag => (
              <button
                key={tag}
                type="button"
                className="tag-suggestion"
                onClick={() => addTag(uploadTags, tag, setUploadTags)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Document"
        size="lg"
        footer={
          <div className="modal__footer-actions">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSave} loading={editLoading}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="edit-form">
          <Input
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <Input
            label="Tags"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="hr, policy, benefits"
            helperText="Comma-separated tags"
          />
          <Textarea
            label="Replace Content (optional)"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Enter new content to replace the document. This will mark the document for re-indexing."
            rows={6}
            helperText="Leave empty to only update metadata"
          />
          {editDoc && (
            <div className="edit-form__warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Replacing content will mark the document as stale and exclude it from search until re-indexed.</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteDoc(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteDoc?.title}"? This will remove the document, its file, chunks, and vectors. This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleteLoading}
      />

      {/* View Content Modal */}
      <Modal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        title={viewDoc?.title}
        size="lg"
      >
        {viewDoc && (
          <div className="view-content">
            <div className="view-content__meta">
              <div className="view-content__meta-item">
                <span className="view-content__meta-label">ID</span>
                <code className="view-content__meta-value">{viewDoc.id}</code>
              </div>
              <div className="view-content__meta-item">
                <span className="view-content__meta-label">Filename</span>
                <span className="view-content__meta-value">{viewDoc.filename}</span>
              </div>
              <div className="view-content__meta-item">
                <span className="view-content__meta-label">Size</span>
                <span className="view-content__meta-value">{formatBytes(viewDoc.size_bytes)}</span>
              </div>
              <div className="view-content__meta-item">
                <span className="view-content__meta-label">Status</span>
                <StatusBadge status={viewDoc.status} />
              </div>
              <div className="view-content__meta-item">
                <span className="view-content__meta-label">Chunks</span>
                <span className="view-content__meta-value">{viewDoc.chunk_count || 0}</span>
              </div>
              <div className="view-content__meta-item">
                <span className="view-content__meta-label">Created</span>
                <span className="view-content__meta-value">{formatDate(viewDoc.created_at)}</span>
              </div>
              <div className="view-content__meta-item">
                <span className="view-content__meta-label">Updated</span>
                <span className="view-content__meta-value">{formatDate(viewDoc.updated_at)}</span>
              </div>
              {(viewDoc.tags || []).length > 0 && (
                <div className="view-content__meta-item">
                  <span className="view-content__meta-label">Tags</span>
                  <div className="view-content__tags">
                    {viewDoc.tags.map(tag => (
                      <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="view-content__actions">
              <Button variant="secondary" onClick={() => { setViewOpen(false); handleEditClick(viewDoc); }}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => { setViewOpen(false); handleDeleteClick(viewDoc); }}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function addTag(currentTags, newTag, setter) {
  const tags = currentTags.split(',').map(t => t.trim()).filter(Boolean);
  if (!tags.includes(newTag)) {
    setter([...tags, newTag].join(', '));
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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