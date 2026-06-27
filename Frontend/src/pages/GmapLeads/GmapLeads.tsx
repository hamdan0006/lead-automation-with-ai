import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Edit2, X, MapPin, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../stores/useAuthStore';

interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: string;
  contacted: boolean;
  interested: boolean;
  transcriptPulled: boolean;
  transferToTechTeam: boolean;
  personalContactNumber: string | null;
  personalEmail: string | null;
}

const GmapLeads: React.FC = () => {
    const { token } = useAuthStore();
    const navigate = useNavigate();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchLeads = async (page = 1, search = '') => {
        setIsLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/scraper/all-leads?page=${page}&limit=50&search=${encodeURIComponent(search)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch leads');

            const data = await response.json();
            if (data.success) {
                setLeads(data.data);
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
            toast.error('Failed to load leads');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchLeads(1, searchTerm);
        }
    }, [token]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchLeads(1, searchTerm);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLeads(newPage, searchTerm);
        }
    };

    const openEditModal = (lead: Lead) => {
        setEditingLead({ ...lead });
        setIsEditModalOpen(true);
    };

    const handleSaveCustomFields = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingLead) return;

        setIsSaving(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/scraper/leads/${editingLead.id}/custom-fields`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    contacted: editingLead.contacted,
                    interested: editingLead.interested,
                    transcriptPulled: editingLead.transcriptPulled,
                    transferToTechTeam: editingLead.transferToTechTeam,
                    personalContactNumber: editingLead.personalContactNumber,
                    personalEmail: editingLead.personalEmail
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Lead updated successfully!');
                setIsEditModalOpen(false);
                // Update local state to reflect changes without full refetch
                setLeads(leads.map(l => l.id === editingLead.id ? { ...l, ...editingLead } : l));
            } else {
                toast.error(data.message || 'Failed to update lead');
            }
        } catch (error) {
            toast.error('Network error during update');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen relative">
            
            {/* EDIT MODAL */}
            {isEditModalOpen && editingLead && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-brand-500" /> Edit Lead Details
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCustomFields} className="p-5 flex flex-col gap-4">
                            <div className="flex flex-col gap-2 mb-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <input 
                                        type="checkbox" 
                                        checked={editingLead.contacted}
                                        onChange={(e) => setEditingLead({...editingLead, contacted: e.target.checked})}
                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    Contacted
                                </label>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <input 
                                        type="checkbox" 
                                        checked={editingLead.interested}
                                        onChange={(e) => setEditingLead({...editingLead, interested: e.target.checked})}
                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    Interested
                                </label>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <input 
                                        type="checkbox" 
                                        checked={editingLead.transcriptPulled}
                                        onChange={(e) => setEditingLead({...editingLead, transcriptPulled: e.target.checked})}
                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    Transcript Pulled
                                </label>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <input 
                                        type="checkbox" 
                                        checked={editingLead.transferToTechTeam}
                                        onChange={(e) => setEditingLead({...editingLead, transferToTechTeam: e.target.checked})}
                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    Transfer to Tech Team
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personal Contact Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. +1 234 567 890"
                                    value={editingLead.personalContactNumber || ''}
                                    onChange={(e) => setEditingLead({...editingLead, personalContactNumber: e.target.value})}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personal Email</label>
                                <input
                                    type="email"
                                    placeholder="e.g. name@example.com"
                                    value={editingLead.personalEmail || ''}
                                    onChange={(e) => setEditingLead({...editingLead, personalEmail: e.target.value})}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            <div className="mt-4 flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">Cancel</button>
                                <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3 space-y-0">
                    <div className="w-12 h-12 bg-brand-500/10 dark:bg-brand-500/20 rounded-xl flex items-center justify-center border border-brand-500/20">
                        <MapPin className="w-6 h-6 text-brand-500 dark:text-brand-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Leads List</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">View and manage all leads and their custom tracking fields</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </form>
                    <button
                        onClick={() => fetchLeads(1, searchTerm)}
                        className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lead Info</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Flags</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Personal Contact</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="w-4 h-4 animate-spin" /> Loading leads...
                                        </div>
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                                <Search className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 font-medium text-base">No leads found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{lead.name || 'N/A'}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{lead.email || 'No email'}</div>
                                            <div className="text-xs text-gray-500 truncate">{lead.phone || 'No phone'}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm text-gray-900 dark:text-gray-300 truncate max-w-[200px]">{lead.company || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">
                                                {[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {lead.contacted && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200">
                                                        Contacted
                                                    </span>
                                                )}
                                                {lead.interested && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200">
                                                        Interested
                                                    </span>
                                                )}
                                                {lead.transcriptPulled && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200">
                                                        Transcript
                                                    </span>
                                                )}
                                                {lead.transferToTechTeam && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200">
                                                        Tech Team
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-xs text-gray-900 dark:text-gray-300">
                                                {lead.personalContactNumber ? (
                                                    <div><span className="text-gray-500">P:</span> {lead.personalContactNumber}</div>
                                                ) : <span className="text-gray-400">No personal phone</span>}
                                            </div>
                                            <div className="text-xs text-gray-900 dark:text-gray-300 mt-1">
                                                {lead.personalEmail ? (
                                                    <div><span className="text-gray-500">E:</span> {lead.personalEmail}</div>
                                                ) : <span className="text-gray-400">No personal email</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/gmap-leads/${lead.id}`)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors whitespace-nowrap"
                                                >
                                                    <Eye className="w-4 h-4" /> View
                                                </button>
                                                <button 
                                                    onClick={() => openEditModal(lead)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 rounded-lg transition-colors whitespace-nowrap"
                                                >
                                                    <Edit2 className="w-4 h-4" /> Edit
                                                </button>
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
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Showing <span className="text-gray-900 dark:text-white">{(pagination.page - 1) * pagination.limit + (leads.length > 0 ? 1 : 0)}</span> to <span className="text-gray-900 dark:text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-gray-900 dark:text-white">{pagination.total}</span> leads
                    </p>

                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm w-full sm:w-auto">
                        <button
                            disabled={pagination.page === 1}
                            onClick={() => handlePageChange(pagination.page - 1)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-40 transition-colors flex-1 sm:flex-none text-center"
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
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-40 transition-colors flex-1 sm:flex-none text-center"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GmapLeads;