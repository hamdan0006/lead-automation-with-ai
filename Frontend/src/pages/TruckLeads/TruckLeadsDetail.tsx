import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';

interface TruckingLead {
    id: number;
    usdotNumber: number;
    legalName: string | null;
    dbaName: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
    phone: string | null;
    mcNumber: string | null;
    entityType: string | null;
    operatingStatus: string | null;
    driverCount: number | null;
    powerUnits: number | null;
    carrierOperation: string | null;
    operationClass: string | null;
    contacted: boolean;
    createdAt: string;
}

interface BatchInfo {
    fromDot: number;
    toDot: number;
    results: number;
    status: string;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const TruckLeadsDetail: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const { token } = useAuthStore();
    const navigate = useNavigate();

    const [leads, setLeads] = useState<TruckingLead[]>([]);
    const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const fetchLeads = async (page = 1) => {
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/trucking/jobs/${jobId}/leads?page=${page}&limit=50`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch leads');
            const data = await res.json();
            if (data.success) {
                setLeads(data.leads);
                setPagination(data.pagination);
            }
        } catch {
            toast.error('Failed to load leads');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBatchInfo = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/trucking/jobs?page=1&limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                const job = data.jobs.find((j: BatchInfo & { id: number }) => j.id === parseInt(jobId!));
                if (job) setBatchInfo(job);
            }
        } catch { /* non-critical */ }
    };

    useEffect(() => {
        if (token && jobId) {
            fetchLeads(1);
            fetchBatchInfo();
        }
    }, [token, jobId]);

    const handleToggleContacted = async (lead: TruckingLead) => {
        setTogglingId(lead.id);
        const newValue = !lead.contacted;
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/trucking/leads/${lead.id}/contacted`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ contacted: newValue }),
            });
            if (!res.ok) throw new Error('Failed to update');
            // Optimistic update in local state
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, contacted: newValue } : l));
            toast.success(newValue ? 'Marked as contacted' : 'Marked as not contacted');
        } catch {
            toast.error('Failed to update contacted status');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDownloadCSV = async () => {
        setIsDownloading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            // Fetch all pages for this batch
            let allLeads: TruckingLead[] = [];
            let page = 1;
            let totalPages = 1;
            do {
                const res = await fetch(`${apiUrl}/api/trucking/jobs/${jobId}/leads?page=${page}&limit=200`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) {
                    allLeads = allLeads.concat(data.leads);
                    totalPages = data.pagination.totalPages;
                }
                page++;
            } while (page <= totalPages);

            const headers = [
                'USDOT', 'MC Number', 'Legal Name', 'DBA Name',
                'Phone', 'Address', 'City', 'State', 'Zip', 'Country',
                'Entity Type', 'Operating Status', 'Drivers', 'Power Units',
                'Carrier Operation', 'Operation Class', 'Contacted',
            ];
            const csv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const rows = allLeads.map(l => [
                l.usdotNumber, csv(l.mcNumber), csv(l.legalName), csv(l.dbaName),
                csv(l.phone), csv(l.address), csv(l.city), csv(l.state), csv(l.zip), csv(l.country),
                csv(l.entityType), csv(l.operatingStatus), l.driverCount ?? 0, l.powerUnits ?? 0,
                csv(l.carrierOperation), csv(l.operationClass), l.contacted ? 'Yes' : 'No',
            ].join(','));

            const content = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `truck_leads_batch_${jobId}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success(`Downloaded ${allLeads.length} leads`);
        } catch {
            toast.error('Failed to download CSV');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/truck-leads')}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                        <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {batchInfo
                                ? `DOT ${batchInfo.fromDot.toLocaleString()} → ${batchInfo.toDot.toLocaleString()}`
                                : `Batch #${jobId}`}
                        </h1>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {pagination.total.toLocaleString()} leads
                            </span>
                            {batchInfo && (
                                <>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(batchInfo.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        batchInfo.status === 'COMPLETED'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    }`}>
                                        {batchInfo.status}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchLeads(pagination.page)}
                        disabled={isLoading}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleDownloadCSV}
                        disabled={isDownloading || pagination.total === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        {isDownloading ? 'Exporting...' : 'Download CSV'}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[620px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 shadow-sm">
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="px-5 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">USDOT / MC</th>
                                <th className="px-5 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
                                <th className="px-5 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                                <th className="px-5 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                                <th className="px-5 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Drivers / Units</th>
                                <th className="px-5 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Contacted</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" /> Loading leads...
                                        </div>
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                                <Truck className="w-7 h-7 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">No leads in this batch yet</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 w-fit">
                                                    DOT: {lead.usdotNumber}
                                                </span>
                                                {lead.mcNumber && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 w-fit">
                                                        MC: {lead.mcNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {lead.legalName || 'N/A'}
                                            </div>
                                            {lead.dbaName && lead.dbaName !== lead.legalName && (
                                                <div className="text-xs text-gray-500">DBA: {lead.dbaName}</div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {[lead.city, lead.state].filter(Boolean).join(', ') || 'N/A'}
                                            </div>
                                            {lead.zip && <div className="text-xs text-gray-500">{lead.zip}</div>}
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-900 dark:text-white">
                                            {lead.phone || <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                lead.operatingStatus === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                                {lead.operatingStatus || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3 text-sm text-gray-900 dark:text-white">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-400">Drivers</span>
                                                    <span className="font-medium">{lead.driverCount ?? 0}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-400">Units</span>
                                                    <span className="font-medium">{lead.powerUnits ?? 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleContacted(lead)}
                                                disabled={togglingId === lead.id}
                                                title={lead.contacted ? 'Mark as not contacted' : 'Mark as contacted'}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    lead.contacted
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {togglingId === lead.id ? (
                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <span className={`w-2 h-2 rounded-full ${lead.contacted ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                )}
                                                {lead.contacted ? 'Contacted' : 'Not Contacted'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/30">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Page {pagination.page} of {pagination.totalPages} · {pagination.total.toLocaleString()} leads
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchLeads(pagination.page - 1)}
                                disabled={pagination.page <= 1 || isLoading}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            <button
                                onClick={() => fetchLeads(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages || isLoading}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TruckLeadsDetail;
