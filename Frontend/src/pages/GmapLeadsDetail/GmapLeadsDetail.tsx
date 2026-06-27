import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, MapPin, Phone, Mail, Globe, Star,
  User, Briefcase, Linkedin, ChevronRight, Zap, Search,
  CheckCircle, XCircle, MessageSquare, Users, ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';

interface Lead {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: string;
  source: string | null;
  keyword: string | null;
  ownerName: string | null;
  leadType: string | null;
  rating: number | null;
  reviews: number | null;
  lastReview: string | null;
  contacted: boolean;
  interested: boolean;
  transcriptPulled: boolean;
  transferToTechTeam: boolean;
  personalContactNumber: string | null;
  personalEmail: string | null;
  emailExtracted: boolean;
  websiteVisited: boolean;
  hasWebsite: boolean | null;
  seoTitle: string | null;
  seoDescription: string | null;
  loadTime: number | null;
  isResponsive: boolean | null;
  icpScore: number | null;
  createdAt: string;
  scrapingJob: { id: number; status: string; leadType: string | null } | null;
}

interface ApolloPerson {
  name: string | null;
  title: string | null;
  email: string | null;
  linkedinUrl: string | null;
  photo: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  organization: string | null;
  seniority: string | null;
}

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  CONTACTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
  REPLIED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200',
  QUEUED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200',
  FOLLOW_UP: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200',
};

const BoolBadge: React.FC<{ value: boolean; label: string }> = ({ value, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
    value
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
      : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'
  }`}>
    {value ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {label}
  </span>
);

const GmapLeadsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoadingLead, setIsLoadingLead] = useState(true);

  const [apolloPeople, setApolloPeople] = useState<ApolloPerson[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [hasEnriched, setHasEnriched] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const fetchLead = async () => {
    setIsLoadingLead(true);
    try {
      const res = await fetch(`${apiUrl}/api/scraper/leads/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLead(data.lead);
      } else {
        toast.error(data.message || 'Lead not found');
        navigate('/gmap-leads');
      }
    } catch {
      toast.error('Failed to load lead');
      navigate('/gmap-leads');
    } finally {
      setIsLoadingLead(false);
    }
  };

  const handleApolloEnrich = async () => {
    setIsEnriching(true);
    try {
      const res = await fetch(`${apiUrl}/api/scraper/leads/${id}/apollo-enrich`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setApolloPeople(data.people);
        setHasEnriched(true);
        if (data.people.length === 0) {
          toast('No matching contacts found on Apollo.', { icon: '🔍' });
        } else {
          toast.success(`Found ${data.people.length} contact${data.people.length > 1 ? 's' : ''} on Apollo!`);
        }
      } else {
        toast.error(data.message || 'Apollo enrichment failed');
      }
    } catch {
      toast.error('Failed to query Apollo');
    } finally {
      setIsEnriching(false);
    }
  };

  useEffect(() => {
    if (token && id) fetchLead();
  }, [token, id]);

  if (isLoadingLead) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading lead data...</p>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const ratingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
      />
    ));
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/gmap-leads')}
          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span className="cursor-pointer hover:text-brand-600" onClick={() => navigate('/gmap-leads')}>Gmap Leads</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-800 dark:text-gray-200 font-medium truncate">{lead.name || `Lead #${lead.id}`}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{lead.name || 'Unnamed Lead'}</h1>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusColors[lead.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
          {lead.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Main Info */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Basic Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Business Information</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Business Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Lead Type</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{lead.leadType || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Phone</p>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-sm text-gray-900 dark:text-white">{lead.phone || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Email</p>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-sm text-gray-900 dark:text-white truncate">{lead.email || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Website</p>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  {lead.website ? (
                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer"
                      className="text-sm text-brand-600 dark:text-brand-400 hover:underline truncate flex items-center gap-1">
                      {lead.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : <p className="text-sm text-gray-500">No website</p>}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Address</p>
                <p className="text-sm text-gray-900 dark:text-white">{lead.address || [lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Keyword</p>
                <p className="text-sm text-gray-900 dark:text-white">{lead.keyword || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Owner Name (Scraped)</p>
                <p className="text-sm text-gray-900 dark:text-white">{lead.ownerName || '—'}</p>
              </div>
            </div>
          </div>

          {/* Ratings & Reviews */}
          {(lead.rating !== null || lead.reviews !== null || lead.lastReview) && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Reviews & Ratings</h2>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  {lead.rating !== null && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">{ratingStars(lead.rating)}</div>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">{lead.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {lead.reviews !== null && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">({lead.reviews.toLocaleString()} reviews)</span>
                  )}
                </div>
                {lead.lastReview && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-2 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Latest Review
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{lead.lastReview}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Website Analysis */}
          {(lead.seoTitle || lead.seoDescription || lead.loadTime !== null) && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Website Analysis</h2>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lead.seoTitle && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">SEO Title</p>
                    <p className="text-sm text-gray-900 dark:text-white">{lead.seoTitle}</p>
                  </div>
                )}
                {lead.seoDescription && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Meta Description</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{lead.seoDescription}</p>
                  </div>
                )}
                {lead.loadTime !== null && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Load Time</p>
                    <p className={`text-sm font-medium ${lead.loadTime < 3 ? 'text-emerald-600' : lead.loadTime < 5 ? 'text-amber-600' : 'text-red-600'}`}>
                      {lead.loadTime.toFixed(2)}s
                    </p>
                  </div>
                )}
                {lead.isResponsive !== null && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Mobile Responsive</p>
                    <BoolBadge value={lead.isResponsive!} label={lead.isResponsive ? 'Yes' : 'No'} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Apollo Enrichment */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Owner / Contact Finder</h2>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium border border-indigo-100 dark:border-indigo-800">via Apollo</span>
              </div>
              <button
                onClick={handleApolloEnrich}
                disabled={isEnriching}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnriching ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Searching...</>
                ) : (
                  <><Search className="w-4 h-4" /> {hasEnriched ? 'Re-search Apollo' : 'Find Owner'}</>
                )}
              </button>
            </div>

            <div className="p-5">
              {!hasEnriched && !isEnriching && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-3">
                    <Users className="w-7 h-7 text-indigo-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Click "Find Owner" to search Apollo for the business owner and key contacts.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Searches by website domain or business name.</p>
                </div>
              )}

              {isEnriching && (
                <div className="flex flex-col items-center justify-center py-10">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Querying Apollo database...</p>
                </div>
              )}

              {hasEnriched && !isEnriching && apolloPeople.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No matching contacts found on Apollo.</p>
                  <p className="text-xs text-gray-400 mt-1">Try adding the website URL to help Apollo find the right company.</p>
                </div>
              )}

              {hasEnriched && apolloPeople.length > 0 && (
                <div className="flex flex-col gap-4">
                  {apolloPeople.map((person, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                      {person.photo ? (
                        <img src={person.photo} alt={person.name || ''} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow shrink-0">
                          {person.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{person.name || 'Unknown'}</p>
                            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{person.title || '—'}</p>
                            {person.seniority && (
                              <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded border border-purple-100 dark:border-purple-800 mt-1">
                                {person.seniority}
                              </span>
                            )}
                          </div>
                          {person.linkedinUrl && (
                            <a href={person.linkedinUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded-lg hover:bg-blue-100 transition-colors shrink-0">
                              <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                            </a>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {person.email && (
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {person.email}</span>
                          )}
                          {person.organization && (
                            <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {person.organization}</span>
                          )}
                          {(person.city || person.country) && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {[person.city, person.country].filter(Boolean).join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Sidebar */}
        <div className="flex flex-col gap-6">

          {/* Status Flags */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Tracking Flags</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <BoolBadge value={lead.contacted} label="Contacted" />
              <BoolBadge value={lead.interested} label="Interested" />
              <BoolBadge value={lead.transcriptPulled} label="Transcript Pulled" />
              <BoolBadge value={lead.transferToTechTeam} label="Transfer to Tech Team" />
              <BoolBadge value={lead.emailExtracted} label="Email Extracted" />
              <BoolBadge value={lead.websiteVisited} label="Website Visited" />
            </div>
          </div>

          {/* Personal Contact */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Personal Contact</h2>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Personal Phone</p>
                <p className="text-sm text-gray-900 dark:text-white font-medium">
                  {lead.personalContactNumber || <span className="text-gray-400 font-normal">Not added</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Personal Email</p>
                <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                  {lead.personalEmail || <span className="text-gray-400 font-normal">Not added</span>}
                </p>
              </div>
            </div>
          </div>

          {/* ICP Score */}
          {lead.icpScore !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">ICP Score</h2>
              </div>
              <div className="p-5">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-black text-gray-900 dark:text-white">{lead.icpScore.toFixed(0)}</span>
                  <span className="text-gray-400 text-sm mb-1">/ 100</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${lead.icpScore >= 70 ? 'bg-emerald-500' : lead.icpScore >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(lead.icpScore, 100)}%` }}
                  />
                </div>
                <p className={`text-xs font-semibold mt-1 ${lead.icpScore >= 70 ? 'text-emerald-600' : lead.icpScore >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                  {lead.icpScore >= 70 ? 'Strong Fit' : lead.icpScore >= 40 ? 'Medium Fit' : 'Weak Fit'}
                </p>
              </div>
            </div>
          )}

          {/* Scraping Job Ref */}
          {lead.scrapingJob && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">From Scraping Job</h2>
              </div>
              <div className="p-5 text-sm">
                <p className="text-gray-500 dark:text-gray-400">Batch <span className="font-semibold text-gray-900 dark:text-white">#{lead.scrapingJob.id}</span></p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Status: <span className="font-medium text-gray-800 dark:text-gray-200">{lead.scrapingJob.status}</span></p>
                {lead.scrapingJob.leadType && <p className="text-gray-500 dark:text-gray-400 mt-1">Type: <span className="capitalize font-medium text-gray-800 dark:text-gray-200">{lead.scrapingJob.leadType}</span></p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GmapLeadsDetail;