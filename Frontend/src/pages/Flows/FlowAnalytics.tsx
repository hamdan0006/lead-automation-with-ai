import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  MessageCircle,
  Clock,
  Calendar,
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  Eye,
  ThumbsUp,
  UserPlus,
  Mail,
  Zap
} from 'lucide-react';
import { getFlow, getFlowAnalytics } from '../../api/flows';
import Flowbtn from '../../components/ui/flowbtns/Flowbtn';

import { toast } from 'react-hot-toast';

// Type definitions
interface Flow {
  _id?: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | string;
  nextScheduledRun?: string;
  [key: string]: any; // For any additional properties
}

interface ExecutionStats {
  totalRuns?: number;
  successRate?: string;
  successfulRuns?: number;
  failedRuns?: number;
  lastSuccessfulRun?: string;
  [key: string]: any;
}

interface ProspectStats {
  totalProspectsFound?: number;
  totalConnectionRequests?: number;
  connectionRate?: string;
  totalEngagements?: number;
  connectionsAccepted?: number;
  messagesExchanged?: number;
  [key: string]: any;
}

interface Performance {
  deduplicationCount?: number;
  [key: string]: any;
}

interface Scheduling {
  runsPerDay?: number;
  weekendsEnabled?: boolean;
  workingHours?: {
    start: string;
    end: string;
    timezone?: string;
  };
  [key: string]: any;
}

interface ExecutionHistoryItem {
  status: 'COMPLETED' | 'FAILED' | string;
  stage: string;
  startedAt: string;
  completedAt?: string;
  [key: string]: any;
}

interface Analytics {
  executionStats?: ExecutionStats;
  prospectStats?: ProspectStats;
  performance?: Performance;
  scheduling?: Scheduling;
  executionHistory?: ExecutionHistoryItem[];
  [key: string]: any;
}

interface ApiResponse<T> {
  status: 'success' | 'error';
  data: {
    flow?: T;
    analytics?: T;
  };
  [key: string]: any;
}

const FlowAnalytics: React.FC = () => {
  const { flowId } = useParams<{ flowId: string }>();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<string>('7d');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    fetchFlowAnalytics();
  }, [flowId, period]);

  const fetchFlowAnalytics = async () => {
    if (!flowId) return;

    setIsLoading(true);
    try {
      const [flowResponse, analyticsResponse] = await Promise.all([
        getFlow(flowId) as Promise<ApiResponse<Flow>>,
        getFlowAnalytics(flowId, period) as Promise<ApiResponse<Analytics>>
      ]);

      if (flowResponse.status === 'success') {
        setFlow(flowResponse.data.flow || null);
      }

      if (analyticsResponse.status === 'success') {
        setAnalytics(analyticsResponse.data.analytics || null);
      }
    } catch (error) {
      console.error('Failed to fetch flow analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFlowAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  const formatDateTime = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Flow not found</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">The requested flow could not be found.</p>
        <Link to="/flows">
          <Flowbtn>Back to Flows</Flowbtn>
        </Link>
      </div>
    );
  }

  const executionStats: ExecutionStats = analytics?.executionStats || {};
  const prospectStats: ProspectStats = analytics?.prospectStats || {};
  const performance: Performance = analytics?.performance || {};
  const scheduling: Scheduling = analytics?.scheduling || {};

  // Parse success rate percentage for the progress bar
  const successRatePercentage = executionStats.successRate
    ? parseFloat(executionStats.successRate.replace('%', ''))
    : 0;

  return (
    <div className="space-y-6 pt-2 px-4 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex items-center gap-4">
          <Link to="/flows">
            <Flowbtn variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Flowbtn>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flow Analytics</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{flow.name}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <select
              value={period}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          <Flowbtn
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Flowbtn>
        </div>
      </div>

      {/* Flow Status Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Flow Overview</h2>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${flow.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                flow.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  flow.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    flow.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
              <Activity className="w-4 h-4" />
              {flow.status}
            </span>
            <Link to={`/flows/${flowId}/activities`}>
              <Flowbtn variant="outline" size="sm" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                View Activities
              </Flowbtn>
            </Link>
            <Link to={`/flows/${flowId}/prospects`}>
              <Flowbtn variant="outline" size="sm" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                View Prospects
              </Flowbtn>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {executionStats.totalRuns || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Executions</div>
            <div className="text-xs text-green-500 dark:text-green-400 font-medium mt-1">
              {executionStats.successRate || '0%'} success rate
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {prospectStats.totalProspectsFound || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Prospects Found</div>
            <div className="text-xs text-blue-500 dark:text-blue-400 font-medium mt-1">
              {performance.deduplicationCount || 0} deduplicated
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {prospectStats.totalConnectionRequests || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Connection Requests</div>
            <div className="text-xs text-purple-500 dark:text-purple-400 font-medium mt-1">
              {prospectStats.connectionRate || '0%'} acceptance rate
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {prospectStats.totalEngagements || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Engagements</div>
            <div className="text-xs text-orange-500 dark:text-orange-400 font-medium mt-1">
              Likes, comments, views
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prospect Pipeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Prospect Pipeline</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-transparent dark:border-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Prospects Found</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total profiles discovered</div>
                </div>
              </div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {prospectStats.totalProspectsFound || 0}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-transparent dark:border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                  <ThumbsUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Engagements</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Likes, comments, views</div>
                </div>
              </div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {prospectStats.totalEngagements || 0}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-transparent dark:border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Connection Requests</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Sent to prospects</div>
                </div>
              </div>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {prospectStats.totalConnectionRequests || 0}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-transparent dark:border-orange-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Connections Accepted</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">New connections made</div>
                </div>
              </div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {prospectStats.connectionsAccepted || 0}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-transparent dark:border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Messages Exchanged</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Active conversations</div>
                </div>
              </div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {prospectStats.messagesExchanged || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Execution Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Execution Performance</h3>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">Success Rate</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {executionStats.successRate || '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 dark:bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${successRatePercentage}%`
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {executionStats.successfulRuns || 0} successful / {executionStats.totalRuns || 0} total
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-transparent dark:border-blue-500/20">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{executionStats.totalRuns || 0}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Runs</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-transparent dark:border-green-500/20">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{executionStats.successfulRuns || 0}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Successful</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-transparent dark:border-red-500/20">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">{executionStats.failedRuns || 0}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-transparent dark:border-purple-500/20">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{performance.deduplicationCount || 0}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Deduplicated</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduling Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Scheduling & Timing</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="font-medium text-gray-900 dark:text-white mb-1">Next Run</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {flow.nextScheduledRun
                ? formatDateTime(flow.nextScheduledRun)
                : 'Not scheduled'
              }
            </div>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="font-medium text-gray-900 dark:text-white mb-1">Frequency</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {scheduling.runsPerDay || 2}x daily
              <br />
              {scheduling.weekendsEnabled ? 'Including weekends' : 'Weekdays only'}
            </div>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="font-medium text-gray-900 dark:text-white mb-1">Working Hours</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {scheduling.workingHours
                ? `${scheduling.workingHours.start} - ${scheduling.workingHours.end}`
                : 'Not set'
              }
              <br />
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {scheduling.workingHours?.timezone || 'EST'}
              </span>
            </div>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="font-medium text-gray-900 dark:text-white mb-1">Last Success</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {executionStats.lastSuccessfulRun
                ? formatDateTime(executionStats.lastSuccessfulRun)
                : 'Never'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {analytics?.executionHistory && analytics.executionHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Executions</h3>

          <div className="space-y-3">
            {analytics.executionHistory.map((execution: ExecutionHistoryItem, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${execution.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30' :
                      execution.status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/30' :
                        'bg-gray-100 dark:bg-gray-700'
                    }`}>
                    {execution.status === 'COMPLETED' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : execution.status === 'FAILED' ? (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white capitalize">
                      {execution.stage} Stage
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(execution.startedAt)}
                      {execution.completedAt && (
                        <span> - {formatDateTime(execution.completedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${execution.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    execution.status === 'FAILED' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                  {execution.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowAnalytics;