import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Truck, Eye, Trash2, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';

interface TruckingJob {
    id: number;
    fromDot: number;
    toDot: number;
    currentDot: number;
    status: string;
    results: number;
    createdAt: string;
    updatedAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const statusColors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    RUNNING:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    PENDING:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    FAILED:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const TruckLeads: React.FC = () => {
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<TruckingJob[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });

    // New batch modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fromDot, setFromDot] = useState('');
    const [toDot, setToDot] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchJobs = async (page = 1) => {
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/trucking/jobs?page=${page}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            if (data.success) {
                setJobs(data.jobs);
                setPagination(data.pagination);
            }
        } catch {
            toast.error('Failed to load scraping batches');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchJobs(1);
    }, [token]);

    const handleDelete = async (jobId: number) => {
        if (!window.confirm('Delete this batch and all its leads?')) return;
        setDeletingId(jobId);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/trucking/jobs/${jobId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Batch deleted');
            fetchJobs(pagination.page);
        } catch {
            toast.error('Failed to delete batch');
        } finally {
            setDeletingId(null);
        }
    };

    const progress = (job: TruckingJob) => {
        if (job.status === 'COMPLETED') return 100;
        if (!job.currentDot || job.currentDot <= job.fromDot) return 0;
        const total = job.toDot - job.fromDot;
        if (total <= 0) return 0;
        return Math.min(100, Math.round(((job.currentDot - job.fromDot) / total) * 100));
    };

    const handleStartScrape = async (e: React.FormEvent) => {
        e.preventDefault();
        const from = parseInt(fromDot);
        const to   = parseInt(toDot);
        if (!from || !to) return toast.error('Both DOT numbers are required');
        if (from > to)    return toast.error('From DOT must be less than To DOT');
        if (to - from > 5000) return toast.error('Range cannot exceed 5000 DOT numbers per job');

        setIsSubmitting(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${apiUrl}/api/trucking/fmcsa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ fromDot: from, toDot: to }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Scraper started! Job #${data.jobId}`);
                setIsModalOpen(false);
                setFromDot('');
                setToDot('');
                fetchJobs(1);
            } else {
                toast.error(data.message || 'Failed to start scraper');
            }
        } catch {
            toast.error('Network error — could not start scraper');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">

            {/* New Batch Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Truck className="w-5 h-5 text-blue-500" /> Start FMCSA Scrape
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleStartScrape} className="p-5 flex flex-col gap-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Enter a USDOT number range to scrape. Maximum 5,000 DOT numbers per batch.
                            </p>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        From DOT <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 1002330"
                                        value={fromDot}
                                        onChange={(e) => setFromDot(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                        min={1}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        To DOT <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 1003830"
                                        value={toDot}
                                        onChange={(e) => setToDot(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                        min={1}
                                    />
                                </div>
                            </div>

                            {fromDot && toDot && parseInt(toDot) > parseInt(fromDot) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-lg px-3 py-2">
                                    Range: <span className="font-semibold text-blue-700 dark:text-blue-300">{(parseInt(toDot) - parseInt(fromDot)).toLocaleString()}</span> DOT numbers
                                </div>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting
                                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Starting…</>
                                        : <><Plus className="w-4 h-4" /> Start Scrape</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                        <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Truck Leads Batches</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {pagination.total} batch{pagination.total !== 1 ? 'es' : ''} — click a batch to view its leads
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchJobs(pagination.page)}
                        disabled={isLoading}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New Batch
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">DOT Range</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leads Found</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" /> Loading batches...
                                        </div>
                                    </td>
                                </tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                                <Truck className="w-7 h-7 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">No scraping batches yet</p>
                                            <p className="text-xs text-gray-400">Start the FMCSA scraper to create your first batch</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                jobs.map(job => {
                                    const pct = progress(job);
                                    return (
                                        <tr
                                            key={job.id}
                                            className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                                        >
                                            {/* DOT Range */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                                                        {job.fromDot.toLocaleString()} → {job.toDot.toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Range: {(job.toDot - job.fromDot).toLocaleString()} DOTs
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Leads count */}
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                                    {job.results.toLocaleString()}
                                                </span>
                                            </td>

                                            {/* Progress bar */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 min-w-[120px]">
                                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                        <div
                                                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{pct}%</span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[job.status] || statusColors['PENDING']}`}>
                                                    {job.status}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                                    {new Date(job.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 justify-end">
                                                    <button
                                                        onClick={() => navigate(`/truck-leads/${job.id}`)}
                                                        disabled={job.results === 0}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View Leads
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(job.id)}
                                                        disabled={deletingId === job.id}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40"
                                                        title="Delete batch"
                                                    >
                                                        {deletingId === job.id
                                                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                            : <Trash2 className="w-4 h-4" />
                                                        }
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/30">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Page {pagination.page} of {pagination.totalPages} · {pagination.total} batches
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchJobs(pagination.page - 1)}
                                disabled={pagination.page <= 1 || isLoading}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            <button
                                onClick={() => fetchJobs(pagination.page + 1)}
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

export default TruckLeads;
