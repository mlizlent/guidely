import { useState, useEffect, useCallback } from 'react';
import { metricsApi, healthApi } from '../services/api';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { PageHeader } from '../components/layout/Header';
import { useToastHelpers } from '../components/ui/Toast';
import './Metrics.css';

export function Metrics() {
  const { error, warning } = useToastHelpers();

  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [metricsData, healthData] = await Promise.all([
        metricsApi.get(),
        healthApi.check(),
      ]);
      setMetrics(metricsData);
      setHealth(healthData);
      setLastUpdated(new Date());
    } catch (err) {
      error('Failed to load metrics', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [error]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="metrics-page">
        <PageHeader title="Metrics" subtitle="System performance and health overview" />
        <Card variant="elevated">
          <CardBody padding="lg" className="metrics-loading">
            <PageLoader message="Loading metrics..." />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="metrics-page">
      <PageHeader
        title="Metrics"
        subtitle="System performance and health overview"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {lastUpdated && (
              <span className="metrics-last-updated">
                Updated {formatRelativeTime(lastUpdated)}
              </span>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh metrics"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={refreshing ? 'spinning' : ''}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
        }
      />

      {/* Health Status */}
      <div className="metrics-grid">
        <Card variant="elevated" className="metrics-health">
          <CardHeader
            title="System Health"
            action={
              <Badge variant={health?.status === 'ok' ? 'success' : 'error'} dot>
                {health?.status === 'ok' ? 'Healthy' : 'Degraded'}
              </Badge>
            }
          />
          <CardBody>
            <div className="health-checks">
              {health && Object.entries(health).map(([key, value]) => (
                <div key={key} className="health-check">
                  <div className="health-check__info">
                    <span className="health-check__name">{formatHealthName(key)}</span>
                    <Badge
                      variant={value === 'ok' ? 'success' : value === 'degraded' ? 'warning' : 'error'}
                      size="sm"
                    >
                      {value}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Key Metrics */}
        <Card variant="elevated" className="metrics-key">
          <CardHeader title="Key Metrics" />
          <CardBody>
            <div className="metrics-key__grid">
              <MetricCard
                label="Total Documents"
                value={metrics?.docs_total || 0}
                icon={<DocIcon />}
                trend="+12%"
                trendPositive
              />
              <MetricCard
                label="Total Chunks"
                value={metrics?.chunks_total || 0}
                icon={<ChunkIcon />}
                trend="+45"
                trendPositive
              />
              <MetricCard
                label="Queries Served"
                value={formatNumber(metrics?.queries_served || 0)}
                icon={<QueryIcon />}
                trend="+23%"
                trendPositive
              />
              <MetricCard
                label="Queries (24h)"
                value={metrics?.queries_last_24h || 0}
                icon={<ClockIcon />}
              />
            </div>
          </CardBody>
        </Card>

        {/* Latency Metrics */}
        <Card variant="elevated" className="metrics-latency">
          <CardHeader title="Query Latency" />
          <CardBody>
            <div className="latency-bars">
              <LatencyBar
                label="P50 (median)"
                value={metrics?.latency_ms?.p50 || 0}
                max={metrics?.latency_ms?.p95 || 1000}
                unit="ms"
                color="var(--success)"
              />
              <LatencyBar
                label="P95"
                value={metrics?.latency_ms?.p95 || 0}
                max={metrics?.latency_ms?.p95 || 1000}
                unit="ms"
                color="var(--warning)"
              />
              <LatencyBar
                label="Cache Hit Rate"
                value={(metrics?.cache_hit_rate || 0) * 100}
                max={100}
                unit="%"
                color="var(--info)"
              />
            </div>
          </CardBody>
        </Card>

        {/* System Info */}
        <Card variant="outlined" className="metrics-system">
          <CardHeader title="System Information" />
          <CardBody>
            <div className="system-info">
              <div className="system-info__item">
                <span className="system-info__label">Vector Store</span>
                <span className="system-info__value">{health?.vector_store || 'unknown'}</span>
              </div>
              <div className="system-info__item">
                <span className="system-info__label">Database</span>
                <span className="system-info__value">{health?.db || 'unknown'}</span>
              </div>
              <div className="system-info__item">
                <span className="system-info__label">API Status</span>
                <Badge variant={health?.status === 'ok' ? 'success' : 'error'} size="sm">
                  {health?.status || 'unknown'}
                </Badge>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card variant="outlined" className="metrics-detailed">
        <CardHeader title="Detailed Metrics" />
        <CardBody>
          <pre className="metrics-json">{JSON.stringify(metrics, null, 2)}</pre>
        </CardBody>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon, trend, trendPositive }) {
  return (
    <div className="metric-card">
      <div className="metric-card__header">
        <div className="metric-card__icon">{icon}</div>
        <span className="metric-card__label">{label}</span>
      </div>
      <div className="metric-card__value">{formatNumber(value)}</div>
      {trend && (
        <div className={`metric-card__trend ${trendPositive ? 'metric-card__trend--positive' : 'metric-card__trend--negative'}`}>
          {trend}
        </div>
      )}
    </div>
  );
}

function LatencyBar({ label, value, max, unit, color }) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="latency-bar">
      <div className="latency-bar__header">
        <span className="latency-bar__label">{label}</span>
        <span className="latency-bar__value">{value.toLocaleString()}{unit}</span>
      </div>
      <div className="latency-bar__track">
        <div
          className="latency-bar__fill"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
    </div>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ChunkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function QueryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function formatHealthName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}