import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Globe, MapPin, Building, Phone, Mail, Link as LinkIcon, CheckCircle2, Circle, Search, RefreshCw, BarChart3, AlertCircle } from 'lucide-react';
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

interface JobStats {
  totalLeads: number;
  scrapedLeads: number;
  emailsFound: number;
}

const LeadDetail: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterLeadType, setFilterLeadType] = useState('');
  const [jobStatus, setJobStatus] = useState('PROCESSING');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [jobStats, setJobStats] = useState<JobStats>({ totalLeads: 0, scrapedLeads: 0, emailsFound: 0 });

  const fetchLeads = async (page = 1, leadType = filterLeadType) => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      if (leadType) queryParams.append('leadType', leadType);

      const response = await fetch(`${apiUrl}/api/scraper/jobs/${jobId}/leads?${queryParams.toString()}`, {
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
          totalPages: data.pagination.totalPages
        });
        if (data.jobStatus) {
            setJobStatus(data.jobStatus);
        }
        // Update job stats if provided by API
        if (data.stats) {
          setJobStats({
            totalLeads: data.stats.totalLeads || data.pagination.total,
            scrapedLeads: data.stats.scrapedLeads || 0,
            emailsFound: data.stats.emailsFound || 0
          });
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load batch leads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (val: string) => {
    setFilterLeadType(val);
    fetchLeads(1, val);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
        fetchLeads(newPage);
    }
  };

  useEffect(() => {
    if (token && jobId) {
      fetchLeads(1);
    }
  }, [token, jobId]);

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col mb-8 gap-4">
        <button 
          onClick={() => navigate('/start-scraping')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white w-fit transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Batches
        </button>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Users className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch #{jobId} Detail</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {pagination.total} leads found in this execution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by Lead Type..."
                value={filterLeadType}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={() => fetchLeads(1)}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Analytics & Progress Cards */}
        {!isLoading && leads.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Search Keyword</h3>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white italic">"{leads[0]?.keyword || 'N/A'}"</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Target Location</h3>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{leads[0]?.city || 'Various'}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{[leads[0]?.state, leads[0]?.country].filter(Boolean).join(', ') || 'N/A'}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Scraping Progress</h3>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {jobStatus === 'COMPLETED' ? 'Completed' : jobStatus === 'PROCESSING' ? 'Running' : jobStatus}
                  </span>
                  {jobStatus === 'COMPLETED' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  {jobStatus === 'COMPLETED' ? (
                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
                  ) : (
                    <div className="bg-brand-600 h-2.5 rounded-full transition-all duration-500 animate-pulse" style={{ width: '100%' }}></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business / Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type / Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keyword</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Journey</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading data...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    No leads discovered for this batch yet.
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white group flex items-center gap-2">
                           <Building className="w-4 h-4 text-gray-400 shrink-0" />
                           {lead.name || lead.company || 'Unknown Entity'}
                        </span>
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center mt-1">
                            <Globe className="w-3 h-3 mr-1" /> {new URL(lead.website).hostname}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                         {lead.email ? (
                           <span className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1 truncate max-w-[150px]" title={lead.email}>
                             <Mail className="w-3 h-3" /> {lead.email}
                           </span>
                         ) : (
                           <span className="text-xs text-gray-400 dark:text-gray-600 italic">No Email</span>
                         )}
                         {lead.phone ? (
                           <span className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                             <Phone className="w-3 h-3" /> {lead.phone}
                           </span>
                         ) : null}
                         {lead.linkedinUrl ? (
                           <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-500 flex items-center gap-1 hover:underline">
                             <LinkIcon className="w-3 h-3" /> LinkedIn
                           </a>
                         ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-1">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 max-w-[200px] text-xs">
                          {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {lead.leadType || lead.source || 'N/A'}
                        </span>
                        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium ${
                            lead.status === 'NEW' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            lead.status === 'CONTACTED' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {lead.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md max-w-[150px] inline-block truncate" title={lead.keyword || ''}>
                            {lead.keyword || 'Unknown'}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5">
                                {lead.mapsScraped ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Circle className="w-3 h-3" />} Maps
                            </span>
                            <span className="flex items-center gap-1.5">
                                {lead.emailExtracted ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Circle className="w-3 h-3" />} Emails Found
                            </span>
                            <span className="flex items-center gap-1.5">
                                {lead.contacted ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Circle className="w-3 h-3" />} Reached Out
                            </span>
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

export default LeadDetail;
