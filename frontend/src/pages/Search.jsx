import { useState, useCallback, useRef, useEffect } from 'react';
import { searchApi, documentsApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { PageHeader } from '../components/layout/Header';
import { useToastHelpers } from '../components/ui/Toast';

export function Search() {
  const { success, error, info, warning } = useToastHelpers();

  // State
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [tagFilter, setTagFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const queryRef = useRef(null);
  const answerRef = useRef(null);

  // Fetch available tags for filter
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await documentsApi.list({ page_size: 100 });
        const allTags = [...new Set(response.items.flatMap(d => d.tags || []))].sort();
        setAvailableTags(allTags);
      } catch (err) {
        console.warn('Failed to fetch tags:', err);
      }
    };
    fetchTags();
  }, []);

  // Focus query input on mount
  useEffect(() => {
    queryRef.current?.focus();
  }, []);

  // Scroll answer into view when result loads
  useEffect(() => {
    if (result && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    if (!query.trim()) {
      warning('Please enter a question');
      return;
    }

    setLoading(true);
    try {
      const response = await searchApi.query(query, {
        topK,
        tags: tagFilter ? [tagFilter] : [],
      });
      setResult(response);
      // Add to history
      setHistory(prev => [
        { query, timestamp: new Date().toISOString(), result: response },
        ...prev.slice(0, 9)
      ]);
    } catch (err) {
      error('Search failed', err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [query, topK, tagFilter, error]);

  const handleExampleQuery = (exampleQuery) => {
    setQuery(exampleQuery);
    queryRef.current?.focus();
  };

  const handleHistorySelect = (item) => {
    setQuery(item.query);
    setResult(item.result);
    setShowHistory(false);
    queryRef.current?.focus();
  };

  const clearResult = () => {
    setResult(null);
    setQuery('');
    queryRef.current?.focus();
  };

  const copyAnswer = async () => {
    if (!result?.answer) return;
    try {
      await navigator.clipboard.writeText(result.answer);
      success('Copied', 'Answer copied to clipboard');
    } catch {
      error('Failed to copy');
    }
  };

  const exampleQueries = [
    'What is the vacation policy for new hires?',
    'How many sick days are allowed per year?',
    'What are the remote work guidelines?',
    'Explain the expense reimbursement process.',
    'What is the code of conduct?',
  ];

  return (
    <div className="search-page">
      <PageHeader
        title="Search"
        subtitle="Ask questions and get answers from your documents"
      />

      <div className="search-layout">
        {/* Main Search Area */}
        <div className="search-main">
          <Card variant="elevated" className="search-card">
            <CardBody padding="lg">
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-wrapper">
                  <svg className="search-input__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <textarea
                    ref={queryRef}
                    className="search-input__textarea"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a question about your documents..."
                    rows={3}
                    disabled={loading}
                    aria-label="Search query"
                  />
                  <kbd className="search-input__hint">Press Enter to search, Shift+Enter for new line</kbd>
                </div>

                <div className="search-options">
                  <div className="search-options__left">
                    <Select
                      value={topK}
                      onChange={(e) => setTopK(Number(e.target.value))}
                      options={[
                        { value: 3, label: 'Top 3 results' },
                        { value: 5, label: 'Top 5 results' },
                        { value: 10, label: 'Top 10 results' },
                      ]}
                      className="search-options__select"
                      disabled={loading}
                    />
                    {availableTags.length > 0 && (
                      <Select
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        options={[
                          { value: '', label: 'All tags' },
                          ...availableTags.map(tag => ({ value: tag, label: tag })),
                        ]}
                        className="search-options__select"
                        disabled={loading}
                      />
                    )}
                  </div>
                  <div className="search-options__right">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      disabled={!query.trim() || loading}
                    >
                      Search
                    </Button>
                    {result && (
                      <Button variant="ghost" size="lg" onClick={clearResult}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </form>

              {/* Example Queries */}
              {!result && !loading && (
                <div className="search-examples">
                  <p className="search-examples__label">Try asking:</p>
                  <div className="search-examples__list">
                    {exampleQueries.map((ex, i) => (
                      <button
                        key={i}
                        type="button"
                        className="search-example"
                        onClick={() => handleExampleQuery(ex)}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search History */}
              {history.length > 0 && (
                <div className="search-history">
                  <div className="search-history__header">
                    <p className="search-history__label">Recent searches</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
                      {showHistory ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  {showHistory && (
                    <div className="search-history__list">
                      {history.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          className="search-history__item"
                          onClick={() => handleHistorySelect(item)}
                        >
                          <span className="search-history__query">{item.query}</span>
                          <span className="search-history__time">{formatTime(item.timestamp)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Results */}
          {result && (
            <Card variant="elevated" className="search-result-card">
              <CardHeader
                title="Answer"
                subtitle={result.latency_ms ? `Generated in ${result.latency_ms}ms` : undefined}
                action={
                  <Button variant="ghost" size="sm" onClick={copyAnswer}>
                    Copy
                  </Button>
                }
              />
              <CardBody padding="lg">
                {result.answer ? (
                  <div ref={answerRef} className="search-answer">
                    <p className="search-answer__text">{result.answer}</p>
                    {result.query_id && (
                      <p className="search-answer__meta">Query ID: <code>{result.query_id}</code></p>
                    )}
                  </div>
                ) : (
                  <div className="search-no-results">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="search-no-results__icon">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h3>No results found</h3>
                    <p>{result.reason || 'No documents matched your query. Try different keywords or check if documents are indexed.'}</p>
                  </div>
                )}

                {/* Sources */}
                {result.sources && result.sources.length > 0 && (
                  <div className="search-sources">
                    <h4 className="search-sources__title">Sources ({result.sources.length})</h4>
                    <div className="search-sources__list">
                      {result.sources.map((source, i) => (
                        <div key={i} className="search-source">
                          <div className="search-source__header">
                            <div className="search-source__info">
                              <span className="search-source__title">{source.title}</span>
                              <span className="search-source__score">
                                Relevance: {(source.score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <Badge variant="default" size="sm">{i + 1}</Badge>
                          </div>
                          <p className="search-source__snippet">{source.snippet}</p>
                          <div className="search-source__meta">
                            <code className="search-source__doc-id">{source.doc_id}</code>
                            <code className="search-source__chunk-id">{source.chunk_id}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {loading && !result && (
            <Card variant="elevated" className="search-loading-card">
              <CardBody padding="lg" className="search-loading">
                <PageLoader message="Searching your documents..." />
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar with tips */}
        <aside className="search-sidebar">
          <Card variant="outlined" className="search-tips">
            <CardHeader title="Search Tips" />
            <CardBody>
              <ul className="search-tips__list">
                <li>Ask specific questions for better results</li>
                <li>Use natural language - no special syntax needed</li>
                <li>Filter by tags to narrow results</li>
                <li>Adjust "Top K" to control how many chunks are retrieved</li>
                <li>Documents must be indexed to appear in search</li>
              </ul>
            </CardBody>
          </Card>

          <Card variant="outlined" className="search-stats">
            <CardHeader title="Search Stats" />
            <CardBody>
              <div className="search-stats__grid">
                <div className="search-stat">
                  <span className="search-stat__value">{history.length}</span>
                  <span className="search-stat__label">Queries this session</span>
                </div>
                <div className="search-stat">
                  <span className="search-stat__value">{result?.latency_ms ? `${result.latency_ms}ms` : '—'}</span>
                  <span className="search-stat__label">Last query latency</span>
                </div>
                <div className="search-stat">
                  <span className="search-stat__value">{result?.sources?.length || 0}</span>
                  <span className="search-stat__label">Sources found</span>
                </div>
                <div className="search-stat">
                  <span className="search-stat__value">{topK}</span>
                  <span className="search-stat__label">Top K setting</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function formatTime(timestamp) {
  try {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}