import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow, Search, RefreshCw, Eye, Plus, X, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';
import Flowbtn from '../../components/ui/flowbtns/Flowbtn';

interface ScrapingJob {
    id: number;
    url: string;
    status: string;
    results: number;
    leadsWithEmail: number;
    leadType: string | null;
    city: string;
    state: string;
    country: string;
    createdAt: string;
}

const Leads: React.FC = () => {
    const navigate = useNavigate();
    const { token } = useAuthStore();

    const [jobs, setJobs] = useState<ScrapingJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    // Modal state for triggering new jobs
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [newJobQuery, setNewJobQuery] = useState('');
    const [newJobLeadType, setNewJobLeadType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState<number | null>(null);

    const fetchJobs = async (page = 1) => {
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/scraper/jobs?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch scraping batches');

            const data = await response.json();
            if (data.success) {
                setJobs(data.jobs);
                if (data.pagination) {
                    setPagination({
                        page: data.pagination.page,
                        limit: data.pagination.limit,
                        total: data.pagination.total,
                        totalPages: data.pagination.totalPages
                    });
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load scraping batches');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchJobs();
        }
    }, [token]);

    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newJobQuery) return toast.error('Query is required!');

        setIsSubmitting(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/scraper/google-maps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: newJobQuery,
                    leadType: newJobLeadType || null
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Background scraper started successfully!');
                setIsMenuOpen(false);
                setNewJobQuery('');
                setNewJobLeadType('');
                fetchJobs(); // Refresh the table
            } else {
                toast.error(data.message || 'Failed to start job.');
            }
        } catch (error) {
            toast.error('Network error starting job.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getKeyword = (url: string) => {
        try {
            const parts = url.split('search/');
            if (parts.length > 1) {
                const query = parts[1].split('/')[0];
                return decodeURIComponent(query).replace(/\+/g, ' ');
            }
            return 'N/A';
        } catch (e) {
            return 'N/A';
        }
    };

    const filteredJobs = jobs.filter(job => {
        const keyword = getKeyword(job.url).toLowerCase();
        const matchesSearch = job.id.toString().includes(searchTerm) ||
            (job.leadType && job.leadType.toLowerCase().includes(searchTerm.toLowerCase())) ||
            keyword.includes(searchTerm.toLowerCase()) ||
            job.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.country.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchJobs(newPage);
        }
    };

    const handleDeleteBatch = async (jobId: number) => {
        setDeletingId(jobId);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/scraper/jobs/${jobId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                toast.success(data.message || 'Batch deleted successfully');
                setJobs(jobs.filter(j => j.id !== jobId));
                setIsConfirmingDelete(null);
            } else {
                toast.error(data.message || 'Failed to delete batch');
            }
        } catch (error) {
            toast.error('Network error during deletion');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen relative">

            {/* NEW BATCH MODAL OVERLAY */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Workflow className="w-5 h-5 text-brand-500" /> Start New Batch
                            </h2>
                            <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateJob} className="p-5 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search Query <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. top realtors in Miami Beach Florida"
                                    value={newJobQuery}
                                    onChange={(e) => setNewJobQuery(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead Type</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Real Estate"
                                    value={newJobLeadType}
                                    onChange={(e) => setNewJobLeadType(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">This tags the batch so you can filter it later.</p>
                            </div>
                            <div className="mt-4 flex gap-3">
                                <button type="button" onClick={() => setIsMenuOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                                    {isSubmitting ? 'Starting...' : 'Start Scraping'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3 space-y-0">
                    <div className="w-12 h-12 bg-brand-500/10 dark:bg-brand-500/20 rounded-xl flex items-center justify-center border border-brand-500/20">
                        <Workflow className="w-6 h-6 text-brand-500 dark:text-brand-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Batches</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">View and manage your scraped lead batches</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by ID or Lead Type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <button
                        onClick={() => fetchJobs()}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <Flowbtn onClick={() => setIsMenuOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" /> New Batch
                    </Flowbtn>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lead Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Region</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keyword</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Leads</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Emails Found</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="w-4 h-4 animate-spin" /> Loading batches...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                                <Workflow className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 font-medium text-base">No batches found</p>
                                            <p className="text-gray-500 dark:text-gray-500">You haven't run any scraping jobs yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredJobs.map(job => (
                                    <tr key={job.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 font-mono">
                                                #{job.id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 rounded-full bg-brand-500 mr-2"></div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                                    {job.leadType || 'Uncategorized'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-gray-100 font-medium">
                                                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                    {job.city !== 'N/A' ? job.city : 'Various'}
                                                </div>
                                                <div className="text-xs text-gray-500 ml-5">
                                                    {[job.state, job.country].filter(s => s && s !== 'N/A').join(', ') || 'Online/Global'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <Search className="w-3.5 h-3.5 text-gray-400 mr-2" />
                                                <span className="text-sm text-gray-600 dark:text-gray-300 italic">
                                                    "{getKeyword(job.url)}"
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white font-medium">{job.results}</div>
                                            <div className="text-xs text-gray-500">Extracted leads</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-sm font-bold ${job.leadsWithEmail > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                                    {job.leadsWithEmail}
                                                </span>
                                                <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                                    <div 
                                                        className="bg-green-500 h-1.5 rounded-full"
                                                        style={{ width: `${Math.min((job.leadsWithEmail / (job.results || 1)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight mt-0.5">Valid Discovery</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold w-fit ${
                                                    job.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200' :
                                                    job.status === 'SCRAPING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200' :
                                                    'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200'
                                                }`}>
                                                    {job.status === 'SCRAPING' && (
                                                         <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                                    )}
                                                    {job.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {isConfirmingDelete === job.id ? (
                                                    <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteBatch(job.id);
                                                            }}
                                                            disabled={deletingId === job.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all"
                                                        >
                                                            {deletingId === job.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                            Confirm?
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsConfirmingDelete(null);
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button 
                                                            onClick={() => navigate(`/start-scraping/${job.id}`)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 rounded-lg transition-colors whitespace-nowrap"
                                                        >
                                                            <Eye className="w-4 h-4" /> View List
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsConfirmingDelete(job.id);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                                            title="Delete Batch"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center sm:text-left">
                        Showing <span className="text-gray-900 dark:text-white">{(pagination.page - 1) * pagination.limit + (jobs.length > 0 ? 1 : 0)}</span> to <span className="text-gray-900 dark:text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-gray-900 dark:text-white">{pagination.total}</span> batches
                    </p>

                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm overflow-x-auto w-full sm:w-auto">
                        <button
                            disabled={pagination.page === 1}
                            onClick={() => handlePageChange(pagination.page - 1)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex-1 sm:flex-none text-center"
                        >
                            Prev
                        </button>

                        <div className="hidden sm:flex items-center px-2">
                            <span className="text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-md">
                                Page {pagination.page} / {pagination.totalPages}
                            </span>
                        </div>

                        <button
                            disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0}
                            onClick={() => handlePageChange(pagination.page + 1)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex-1 sm:flex-none text-center"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leads;