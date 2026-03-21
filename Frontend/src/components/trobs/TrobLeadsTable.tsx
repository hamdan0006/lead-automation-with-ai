import React from 'react';
import {
    MapPin,
    Building,
    Award,
    ExternalLink,
    Linkedin,
    Clock,
    CheckCircle2,
    Users,
} from 'lucide-react';

import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
} from '../ui/table';

/* =======================
   Types
======================= */

export interface Lead {
    id: string;
    name: string;
    title: string;
    company: string;
    location: string;
    profileImage?: string;

    follower_count: number;
    mutual_connection_count?: number;
    is_following_back: boolean;
    profile_url: string;

    foundAt: string;
}

interface TrobLeadsTableProps {
    leads: Lead[];
    isLoading?: boolean;
}

/* =======================
   Utils
======================= */

const truncateText = (text: string, maxLength = 30) => {
    if (!text) return '';
    return text.length > maxLength
        ? text.slice(0, maxLength) + '...'
        : text;
};

/* =======================
   Component
======================= */

const TrobLeadsTable: React.FC<TrobLeadsTableProps> = ({
    leads,
    isLoading = false,
}) => {
    /* ---------- Loading ---------- */
    if (isLoading) {
        return (
            <div className="w-full space-y-3 animate-pulse">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg"
                    />
                ))}
            </div>
        );
    }

    /* ---------- Empty State ---------- */
    if (leads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 px-4 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="w-12 h-12 bg-brand-500/10 rounded-full flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-brand-500 animate-pulse" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    Searching for leads...
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                    The automation is scanning LinkedIn profiles. Results will appear here.
                </p>
            </div>
        );
    }

    /* ---------- Table ---------- */
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                <Table>
                    {/* ===== Header ===== */}
                    <TableHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                        <TableRow>
                            <TableCell
                                isHeader
                                className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 w-[35%]"
                            >
                                Lead Information
                            </TableCell>

                            <TableCell
                                isHeader
                                className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 w-[25%]"
                            >
                                Role
                            </TableCell>

                            <TableCell
                                isHeader
                                className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 w-[25%]"
                            >
                                Stats
                            </TableCell>

                            <TableCell
                                isHeader
                                className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 text-end w-[15%]"
                            >
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHeader>

                    {/* ===== Body ===== */}
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {leads.map((lead) => (
                            <TableRow
                                key={lead.id}
                                className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                            >
                                {/* ===== Lead Info ===== */}
                                <TableCell className="px-3 py-2.5">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-shrink-0">
                                            {lead.profileImage ? (
                                                <img
                                                    src={lead.profileImage}
                                                    alt={lead.name}
                                                    className="w-9 h-9 rounded-full object-cover border border-white dark:border-gray-800 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold shadow-sm text-xs">
                                                    {lead.name.charAt(0)}
                                                </div>
                                            )}

                                            <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-gray-900 rounded-full p-[1.5px] shadow-sm">
                                                <div className="w-3 h-3 bg-[#0077b5] rounded-full flex items-center justify-center">
                                                    <Linkedin size={8} className="text-white fill-current" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <span
                                                className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[140px]"
                                                title={lead.name}
                                            >
                                                {lead.name}
                                            </span>

                                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-[10px]">
                                                <MapPin size={10} />
                                                <span className="truncate max-w-[120px]" title={lead.location}>{lead.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* ===== Company & Role ===== */}
                                <TableCell className="px-3 py-2.5">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                                            <Award size={12} className="text-brand-500 flex-shrink-0" />
                                            <span className="text-xs truncate max-w-[160px]" title={lead.title}>
                                                {truncateText(lead.title)}
                                            </span>
                                        </div>

                                        {lead.company && (
                                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-0.5">
                                                <Building size={12} className="flex-shrink-0" />
                                                <span className="text-[10px] truncate max-w-[160px]" title={lead.company}>
                                                    {lead.company}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>

                                {/* ===== LinkedIn Stats ===== */}
                                <TableCell className="px-3 py-2.5">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-[11px] text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                <Users size={10} className="text-gray-500" />
                                                <span className="font-semibold">
                                                    {lead.follower_count.toLocaleString()}
                                                </span>
                                            </div>

                                            {(lead.mutual_connection_count !== undefined && lead.mutual_connection_count > 0) && (
                                                <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400" title={`${lead.mutual_connection_count} mutual connections`}>
                                                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                    <span>{lead.mutual_connection_count} mutuals</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                                            {lead.is_following_back ? (
                                                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded">
                                                    <CheckCircle2
                                                        size={10}
                                                    />
                                                    <span>Following</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-gray-400 px-1.5 py-0.5">
                                                    <span className="text-[10px]">Not following</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>

                                {/* ===== Actions ===== */}
                                <TableCell className="px-3 py-2.5 text-end">
                                    <a
                                        href={lead.profile_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-all"
                                        title="Open on LinkedIn"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default TrobLeadsTable;
