import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Search, RefreshCw, Eye, Send, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';

interface ScrapingJob {
  id: number;
  url: string;
  status: string;
  results: number;
  leadsWithEmail: number;
  leadType: string | null;
  city: string;
  state: string;
  isAutomationComplete: boolean;
  contactedCount: number;
  country: string;
  createdAt: string;
}

const EmailAutomation: React.FC = () => {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    
    const [jobs, setJobs] = useState<ScrapingJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    const fetchJobs = async (page = 1) => {
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/scraper/jobs?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch jobs');
            
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
            toast.error('Failed to load batches');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchJobs();
        }
    }, [token]);

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

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen relative">
            
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3 space-y-0">
                    <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                        <Send className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Automation Batches</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Select a batch to start sending automated emails</p>
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
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button 
                        onClick={() => fetchJobs()}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
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
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Automation Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="w-4 h-4 animate-spin" /> Loading batches...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                                <Send className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 font-medium text-base">No batches found</p>
                                            <p className="text-gray-500 dark:text-gray-500">Scrape some leads first to start automation.</p>
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
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
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
                                            <div className="text-xs text-gray-500">Scraped leads</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 dark:text-white font-medium">{job.leadsWithEmail ?? 0}</div>
                                            <div className="text-xs text-gray-500">Emails found</div>
                                        </td>

                                         <td className="px-6 py-4">
                                            {job.isAutomationComplete || job.contactedCount > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-lg text-xs font-bold w-fit">
                                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                        Running
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter ml-1">
                                                        {job.isAutomationComplete ? 'Monitoring Replies' : `${job.contactedCount} / ${job.results} Emailed`}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold w-fit border border-gray-200 dark:border-gray-600">
                                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                                    Not Running
                                                </span>
                                            )}
                                         </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => navigate(`/start-automation/${job.id}`)}
                                                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap ${
                                                    job.isAutomationComplete 
                                                        ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200'
                                                        : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                                                }`}
                                            >
                                                {job.isAutomationComplete ? (
                                                    <>
                                                        <Eye className="w-4 h-4" />
                                                        View Campaign
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-4 h-4" />
                                                        {job.contactedCount > 0 ? 'Continue' : 'Start'}
                                                    </>
                                                )}
                                            </button>
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
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-md">
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

export default EmailAutomation;