import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  FileText,
  CheckCircle2,
  ShoppingCart,
  Receipt,
  Users,
  Shield,
  Search,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Filter,
  X,
  Layers,
} from 'lucide-react';
import { activityApi, ActivityFilterParams } from '../services/activityApi';
import { ActivityLogItem, Role } from '../types';

type CategoryFilter = 'ALL' | 'RFQ' | 'APPROVAL' | 'PO' | 'INVOICE' | 'VENDOR' | 'AUTH';
type DatePreset = 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS';

const CATEGORY_TABS: Array<{ id: CategoryFilter; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'ALL', label: 'All Events', icon: Layers },
  { id: 'RFQ', label: 'RFQs', icon: FileText },
  { id: 'APPROVAL', label: 'Approvals', icon: CheckCircle2 },
  { id: 'PO', label: 'Purchase Orders', icon: ShoppingCart },
  { id: 'INVOICE', label: 'Invoices', icon: Receipt },
  { id: 'VENDOR', label: 'Vendors', icon: Users },
  { id: 'AUTH', label: 'Authentication', icon: Shield },
];

export const ActivityPage: React.FC = () => {
  const navigate = useNavigate();

  // Data states
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [expandedMetadataIds, setExpandedMetadataIds] = useState<Set<string>>(new Set());

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Derive date bounds from preset
  const dateRange = useMemo<{ startDate?: string; endDate?: string }>(() => {
    const now = new Date();
    if (datePreset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === 'LAST_7_DAYS') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === 'LAST_30_DAYS') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    return {};
  }, [datePreset]);

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: ActivityFilterParams = {
        page,
        limit,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        search: debouncedSearch.trim() || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      const res = await activityApi.getActivityLogs(params);
      if (res.success) {
        setActivities(res.activities || []);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCount(res.pagination.total || 0);
      } else {
        throw new Error('API reported unsuccessful response');
      }
    } catch (err: any) {
      console.error('Failed to fetch activity logs:', err);
      setError(err.message || 'Unable to load activity timeline. Please verify network and server status.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedCategory, debouncedSearch, dateRange]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Toggle metadata accordion
  const toggleMetadata = (id: string) => {
    setExpandedMetadataIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setSearchInput('');
    setDebouncedSearch('');
    setDatePreset('ALL');
    setPage(1);
  };

  // Helper for category icons and styles
  const getCategoryMeta = (category: string) => {
    switch (category) {
      case 'RFQ':
        return {
          icon: FileText,
          bg: 'bg-[#36C9A5]/10',
          text: 'text-[#36C9A5]',
          border: 'border-[#36C9A5]/30',
          badgeLabel: 'RFQ',
        };
      case 'APPROVAL':
        return {
          icon: CheckCircle2,
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          badgeLabel: 'Approval',
        };
      case 'PO':
        return {
          icon: ShoppingCart,
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          badgeLabel: 'Purchase Order',
        };
      case 'INVOICE':
        return {
          icon: Receipt,
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30',
          badgeLabel: 'Invoice',
        };
      case 'VENDOR':
        return {
          icon: Users,
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          border: 'border-purple-500/30',
          badgeLabel: 'Vendor',
        };
      case 'AUTH':
        return {
          icon: Shield,
          bg: 'bg-sky-500/10',
          text: 'text-sky-400',
          border: 'border-sky-500/30',
          badgeLabel: 'Security',
        };
      default:
        return {
          icon: Activity,
          bg: 'bg-slate-500/10',
          text: 'text-slate-400',
          border: 'border-slate-500/30',
          badgeLabel: 'System',
        };
    }
  };

  // Helper for role badge styling
  const renderRoleBadge = (role: Role | null) => {
    if (!role) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          System
        </span>
      );
    }
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Admin
          </span>
        );
      case 'PROCUREMENT_OFFICER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#36C9A5]/10 text-[#36C9A5] border border-[#36C9A5]/30">
            Procurement Officer
          </span>
        );
      case 'MANAGER_APPROVER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Approver
          </span>
        );
      case 'VENDOR':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Vendor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {role}
          </span>
        );
    }
  };

  // Entity navigation resolution
  const handleEntityClick = (entityType: string, entityId: string | null) => {
    if (!entityId) return;
    switch (entityType) {
      case 'RFQ':
        navigate(`/rfqs/${entityId}`);
        break;
      case 'QUOTATION':
        navigate('/quotations');
        break;
      case 'APPROVAL':
        navigate('/approvals');
        break;
      case 'PURCHASE_ORDER':
        navigate('/purchase-orders');
        break;
      case 'INVOICE':
        navigate('/invoices');
        break;
      case 'VENDOR':
        navigate('/vendors');
        break;
      default:
        break;
    }
  };

  // Relative time helper
  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasActiveFilters = selectedCategory !== 'ALL' || debouncedSearch.trim() !== '' || datePreset !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
              Activity & Logs
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#36C9A5]/10 text-[#36C9A5] border border-[#36C9A5]/30">
              Live Audit Trail
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Immutable, tamper-evident audit trail capturing real-time procurement actions, approvals, purchase orders, and system state changes.
          </p>
        </div>

        <button
          onClick={fetchActivities}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-[#1E293B] border border-[#334155] rounded-lg hover:bg-[#273449] hover:text-white transition-colors self-start md:self-auto shadow-sm"
          title="Refresh activity timeline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#36C9A5]' : ''}`} />
          Refresh Timeline
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 shadow-sm space-y-4">
        {/* Search & Date Controls Row */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by actor, action, details, or entity identifier (e.g. RFQ-2026-0001)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#36C9A5] transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Presets */}
          <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Date:
            </span>
            {(['ALL', 'TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS'] as DatePreset[]).map((preset) => {
              const labels: Record<DatePreset, string> = {
                ALL: 'All Time',
                TODAY: 'Today',
                LAST_7_DAYS: '7 Days',
                LAST_30_DAYS: '30 Days',
              };
              const active = datePreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => {
                    setDatePreset(preset);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#36C9A5]/10 text-[#36C9A5] border border-[#36C9A5]/40'
                      : 'bg-[#0F172A] text-slate-400 border border-[#334155] hover:text-slate-200'
                  }`}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-between border-t border-[#334155] pt-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1">
            {CATEGORY_TABS.map((tab) => {
              const active = selectedCategory === tab.id;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedCategory(tab.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    active
                      ? 'bg-[#36C9A5] text-[#0F172A] font-semibold shadow-sm'
                      : 'bg-[#0F172A] text-slate-300 border border-[#334155] hover:bg-[#1E293B] hover:text-white'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${active ? 'text-[#0F172A]' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Reset Filters Pill */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors self-end md:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-12 text-center">
          <div className="inline-flex p-3 rounded-full bg-[#36C9A5]/10 text-[#36C9A5] animate-spin mb-3">
            <RefreshCw className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-300">Loading audit timeline...</p>
          <p className="text-xs text-slate-500 mt-1">Fetching authenticated immutable activity records</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-rose-300">Failed to Load Activity</h3>
          <p className="text-xs text-rose-400/80 mt-1 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchActivities}
            className="mt-4 px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3 border border-slate-700">
            <Filter className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-[#F8FAFC]">No Activity Records Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'No audit log entries matched your current category, search query, or date filter.'
              : 'There are currently no recorded procurement activities in the timeline.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-4 px-3.5 py-1.5 bg-[#36C9A5]/10 hover:bg-[#36C9A5]/20 text-[#36C9A5] border border-[#36C9A5]/30 text-xs font-semibold rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Timeline Feed Container */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-sm divide-y divide-[#334155]">
            {activities.map((item) => {
              const meta = getCategoryMeta(item.category);
              const CategoryIcon = meta.icon;
              const isExpanded = expandedMetadataIds.has(item.id);
              const hasMetadata = item.metadata && Object.keys(item.metadata).length > 0;
              const hasNavigableEntity = item.entityId && ['RFQ', 'QUOTATION', 'APPROVAL', 'PURCHASE_ORDER', 'INVOICE', 'VENDOR'].includes(item.entityType);

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-[#243144] transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3"
                >
                  {/* Left: Category Icon + Content */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Icon Pill */}
                    <div className={`p-2 rounded-lg ${meta.bg} ${meta.border} border shrink-0 mt-0.5`}>
                      <CategoryIcon className={`w-4 h-4 ${meta.text}`} />
                    </div>

                    {/* Event Body */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* Top Row: Actor, Role Badge, Action Pill */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-semibold text-white truncate">{item.actorName}</span>
                        {renderRoleBadge(item.actorRole)}
                        <span className="text-slate-500">•</span>
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-[#0F172A] text-slate-300 border border-[#334155]">
                          {item.action}
                        </span>
                      </div>

                      {/* Human-Readable Details */}
                      <p className="text-sm text-slate-300 leading-relaxed break-words">
                        {item.details || 'Operation executed.'}
                      </p>

                      {/* Entity Reference & Metadata Accordion Trigger */}
                      <div className="flex items-center gap-2 pt-0.5 flex-wrap text-xs">
                        {/* Entity Badge */}
                        {item.entityIdentifier && (
                          <div
                            onClick={() => hasNavigableEntity && handleEntityClick(item.entityType, item.entityId)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                              hasNavigableEntity
                                ? 'bg-[#0F172A] text-[#36C9A5] border border-[#36C9A5]/30 hover:border-[#36C9A5] cursor-pointer'
                                : 'bg-[#0F172A] text-slate-400 border border-[#334155]'
                            }`}
                            title={hasNavigableEntity ? `Navigate to ${item.entityType}` : undefined}
                          >
                            <span>{item.entityIdentifier}</span>
                            {hasNavigableEntity && <ExternalLink className="w-3 h-3 text-[#36C9A5]" />}
                          </div>
                        )}

                        {/* Metadata Toggle */}
                        {hasMetadata && (
                          <button
                            onClick={() => toggleMetadata(item.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
                          >
                            <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expanded Metadata Box */}
                      {isExpanded && hasMetadata && (
                        <div className="mt-2.5 p-3 rounded-lg bg-[#0F172A] border border-[#334155] text-xs font-mono text-slate-300 space-y-1 overflow-x-auto">
                          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                            Structured Event Payload
                          </div>
                          {Object.entries(item.metadata!).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-slate-400 shrink-0">{k}:</span>
                              <span className="text-[#36C9A5] break-all">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Timestamp */}
                  <div className="flex md:flex-col md:items-end items-center justify-between gap-1 text-xs text-slate-400 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-[#334155]/50">
                    <span className="font-medium text-slate-300">{formatTimeAgo(item.createdAt)}</span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1" title={item.createdAt}>
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-2 text-xs text-slate-400">
            <div>
              Showing <span className="font-semibold text-white">{activities.length}</span> of{' '}
              <span className="font-semibold text-white">{totalCount}</span> total activity records
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1E293B] border border-[#334155] hover:bg-[#273449] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <span className="px-2 py-1 font-mono text-slate-300">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1E293B] border border-[#334155] hover:bg-[#273449] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ActivityPage;
