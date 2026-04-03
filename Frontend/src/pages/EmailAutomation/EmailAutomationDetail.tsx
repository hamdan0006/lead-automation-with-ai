import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Globe, MapPin, Building, Phone, Mail, Link as LinkIcon, CheckCircle2, Send, BarChart3, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';

interface Lead {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  ownerName: string | null;
  company: string | null;
  source: string | null;
  leadType: string | null;
  status: string;
  area: string | null;
  city: string | null;
  country: string | null;
  state: string | null;
  linkedinUrl: string | null;
  address: string | null;
  website: string | null;
  contacted: boolean;
  emailExtracted: boolean;
  mapsScraped: boolean;
  keyword: string | null;
  createdAt: string;
}

const EmailAutomationDetail: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutomating, setIsAutomating] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, queued: 0, totalPages: 1 });

  const fetchLeads = async (page = 1, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/scraper/jobs/${jobId}/leads?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch leads');

      const data = await response.json();
      if (data.success) {
        setLeads(data.data);
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          queued: data.pagination.queued,
          totalPages: data.pagination.totalPages
        });
      }
    } catch (error) {
      console.error(error);
      if (!silent) toast.error('Failed to load batch leads');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && jobId) {
      fetchLeads(1);
    }
  }, [token, jobId]);

  // Handle polling when automation is in progress
  useEffect(() => {
    let interval: any;
    if (pagination.queued > 0) {
      interval = setInterval(() => {
        fetchLeads(pagination.page, true); // Silent poll
      }, 5000); // Poll every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pagination.queued, pagination.page, token, jobId]);

  const handleStartAutomation = async () => {
    if (!jobId) return;
    setIsAutomating(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/scraper/send-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId: Number(jobId) })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to start email automation');

      toast.success(data.message || 'Email automation started successfully!');
      fetchLeads(pagination.page);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to trigger email automation.');
    } finally {
      setIsAutomating(false);
    }
  };

  // Compute stats based on the current visible chunk for visual feedback
  const stats = useMemo(() => {
    const total = leads.length;
    if (total === 0) return { contacted: 0, emailsFound: 0, progress: 0 };
    const contacted = leads.filter(l => l.contacted || l.status === 'CONTACTED').length;
    const emailsFound = leads.filter(l => l.email || l.emailExtracted).length;
    return {
      contacted,
      emailsFound,
      progress: Math.round((contacted / total) * 100)
    };
  }, [leads]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLeads(newPage);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col mb-8 gap-6">
        <button
          onClick={() => navigate('/start-automation')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white w-fit transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Email Automation Batches
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-sm shrink-0">
              <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Batch #{jobId} Detail</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {pagination.total} leads total · Page {pagination.page} of {pagination.totalPages}
              </p>
            </div>
          </div>

          <button
            onClick={handleStartAutomation}
            disabled={isAutomating || pagination.total === 0 || pagination.queued > 0}
            className={`flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-xl transition-all shadow-md hover:shadow-lg w-full md:w-auto ${
              (isAutomating || pagination.queued > 0) 
              ? 'bg-gray-400 text-white cursor-not-allowed opacity-70' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Send className="w-4 h-4" />
            {isAutomating ? 'Triggering Workflow...' : pagination.queued > 0 ? 'Automation in Progress...' : 'Start Email Automation'}
          </button>
        </div>

        {/* Analytics & Progress Cards */}
        {!isLoading && leads.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Outreach Progress (This Page)</h3>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.progress}%</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{stats.contacted} / {leads.length} Contacted</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Emails Acquired</h3>
              </div>
              <div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.emailsFound}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">on current page</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Status Overview</h3>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{leads.length - stats.contacted}</span>
                  <span className="text-xs text-gray-500">Pending</span>
                </div>
                <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.contacted}</span>
                  <span className="text-xs text-gray-500">Contacted</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in duration-500 flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-4 sm:px-6 py-4">Business / Lead</th>
                <th className="px-4 sm:px-6 py-4">Contact Detail</th>
                <th className="px-4 sm:px-6 py-4">Address</th>
                <th className="px-4 sm:px-6 py-4">Type & Keyword</th>
                <th className="px-4 sm:px-6 py-4">Status</th>
                <th className="px-4 sm:px-6 py-4">Journey Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex justify-center flex-col items-center gap-3">
                       <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                       <p>Loading metadata...</p>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                         <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-400" />
                         </div>
                         <p className="text-gray-600 dark:text-gray-400 font-medium">No leads connected to this batch yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead.id} className={`hover:bg-blue-50/30 dark:hover:bg-gray-800/50 transition-colors ${lead.contacted ? 'bg-green-50/20 dark:bg-green-900/10' : ''}`}>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                           <Building className="w-4 h-4 text-blue-500 shrink-0" />
                           {lead.name || lead.company || 'Unknown Entity'}
                        </span>
                        {lead.ownerName && (
                           <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                             <Users className="w-3 h-3" /> {lead.ownerName}
                           </span>
                        )}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:text-blue-600 hover:underline flex items-center w-fit mt-1 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">
                            <Globe className="w-3 h-3 mr-1" /> {new URL(lead.website).hostname.replace('www.', '')}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md shrink-0 ${lead.email ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                             <Mail className="w-3 h-3" />
                          </div>
                          <span className={`${lead.email ? 'text-sm text-gray-900 dark:text-gray-200' : 'text-xs text-gray-400 italic'} truncate max-w-[140px] block`} title={lead.email || ''}>
                             {lead.email || 'No email found'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md shrink-0 ${lead.phone ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                             <Phone className="w-3 h-3" />
                          </div>
                          <span className={`${lead.phone ? 'text-xs text-gray-700 dark:text-gray-300' : 'text-xs text-gray-400 italic'}`}>
                             {lead.phone || 'No phone'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-1.5">
                        <div className="flex items-start gap-1">
                           <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                           <span className="line-clamp-2 leading-relaxed">
                             {[lead.address, lead.city, lead.state, lead.country].filter(Boolean).join(', ') || 'Unknown Location'}
                           </span>
                        </div>
                        {lead.linkedinUrl && (
                           <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline mt-1">
                             <LinkIcon className="w-3 h-3" /> View LinkedIn
                           </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <div className="flex flex-col gap-1.5 w-fit">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 uppercase">
                          {lead.leadType || lead.source || 'N/A'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 italic" title={lead.keyword || ''}>
                           "{lead.keyword || 'direct match'}"
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                       <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                           lead.status === 'NEW' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                           lead.status === 'CONTACTED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                           'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                       }`}>
                         {lead.status === 'CONTACTED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                         {lead.status}
                       </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                        <div className="flex flex-col gap-2 relative">
                            {/* Visual Journey Tracker Line */}
                            <div className="absolute left-1.5 top-3 bottom-3 w-px bg-gray-200 dark:bg-gray-700 z-0"></div>
                            
                            <span className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 relative z-10 bg-inherit">
                                <span className={`w-3 h-3 rounded-full shrink-0 ${lead.mapsScraped ? 'bg-green-500 shadow-[0_0_0_2px_rgba(255,255,255,1)] dark:shadow-[0_0_0_2px_rgba(31,41,55,1)]' : 'bg-gray-200 dark:bg-gray-600'}`}></span>
                                Maps Listed
                            </span>
                            <span className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 relative z-10 bg-inherit">
                                <span className={`w-3 h-3 rounded-full shrink-0 ${lead.emailExtracted || lead.email ? 'bg-blue-500 shadow-[0_0_0_2px_rgba(255,255,255,1)] dark:shadow-[0_0_0_2px_rgba(31,41,55,1)]' : 'bg-gray-200 dark:bg-gray-600'}`}></span>
                                Mail Discovered
                            </span>
                            <span className="flex items-center gap-2 text-xs font-medium relative z-10 bg-inherit">
                                <span className={`w-3 h-3 rounded-full shrink-0 ${lead.contacted ? 'bg-purple-500 shadow-[0_0_0_2px_rgba(255,255,255,1)] dark:shadow-[0_0_0_2px_rgba(31,41,55,1)]' : 'bg-gray-200 dark:bg-gray-600'}`}></span>
                                <span className={lead.contacted ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-500'}>
                                  Outreach Sent
                                </span>
                            </span>
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Improved Pagination Controls */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center sm:text-left">
            Showing <span className="text-gray-900 dark:text-white">{(pagination.page - 1) * pagination.limit + (leads.length > 0 ? 1 : 0)}</span> to <span className="text-gray-900 dark:text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-gray-900 dark:text-white">{pagination.total}</span> leads
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

export default EmailAutomationDetail;