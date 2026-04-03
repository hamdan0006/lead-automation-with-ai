import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, MapPin, Building, Phone, Mail, Link as LinkIcon, CheckCircle2, Circle, Zap, BarChart3, AlertCircle } from 'lucide-react';
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

const EnrichmentDetail: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  const fetchLeads = async (page = 1, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/scraper/jobs/${jobId}/leads?page=${page}&limit=50`, {
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

  // Polling effect - refresh data every 5 seconds if enrichment is in progress
  useEffect(() => {
    let interval: any;
    const total = leads.length;
    const emailsFound = leads.filter(l => l.email || l.emailExtracted).length;
    
    // Poll if there are leads and not all are enriched yet
    if (total > 0 && emailsFound < total) {
      interval = setInterval(() => {
        fetchLeads(pagination.page, true); // Silent poll
      }, 5000); // Poll every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [leads, pagination.page, token, jobId]);

  // Compute stats based on the current visible leads
  const stats = useMemo(() => {
    const total = leads.length;
    if (total === 0) return { emailsFound: 0, mapsScraped: 0, progress: 0 };
    const emailsFound = leads.filter(l => l.email || l.emailExtracted).length;
    const mapsScraped = leads.filter(l => l.mapsScraped).length;
    return {
      emailsFound,
      mapsScraped,
      progress: Math.round((emailsFound / total) * 100)
    };
  }, [leads]);

  const handleStartEnriching = async () => {
    if (!jobId) return;
    setIsEnriching(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/scraper/extract-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId: Number(jobId) })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to start enrichment');

      toast.success(data.message || 'Enrichment started successfully!');

      // Optionally refresh leads to show status changes if any update instantly
      fetchLeads(pagination.page);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to trigger enrichment.');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col mb-8 gap-4">
        <button
          onClick={() => navigate('/start-enrichment')}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white w-fit transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Enrichment Batches
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/20">
              <Zap className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch #{jobId} Enrichment</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {pagination.total} leads pending enrichment
              </p>
            </div>
          </div>

          <button
            onClick={handleStartEnriching}
            disabled={isEnriching || leads.length === 0}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm w-full md:w-auto"
          >
            <Zap className="w-4 h-4" />
            {isEnriching ? 'Triggering...' : 'Start Enriching'}
          </button>
        </div>

        {/* Analytics & Progress Cards */}
        {!isLoading && leads.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Enrichment Progress</h3>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.progress}%</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{stats.emailsFound} / {leads.length} Enriched</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-amber-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Emails Extracted</h3>
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
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{leads.length - stats.emailsFound}</span>
                  <span className="text-xs text-gray-500">Pending</span>
                </div>
                <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.emailsFound}</span>
                  <span className="text-xs text-gray-500">Enriched</span>
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
                        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium ${lead.status === 'NEW' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
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
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page === 1}
                onClick={() => fetchLeads(pagination.page - 1)}
                className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchLeads(pagination.page + 1)}
                className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrichmentDetail;
