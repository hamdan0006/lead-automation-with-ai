import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  Users,
  Plus,
  Zap,
  TrendingUp,
  ArrowRight,
  Mail,
  MapPin
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/button/Button';
import useAuthStore from '../../stores/useAuthStore';
import PageMeta from "../../components/common/PageMeta";
import Skeleton from '../../components/ui/Skeleton';
import StatisticsChart from "../../components/ecommerce/StatisticsChart";

interface ScrapingJob {
  id: number;
  url: string;
  status: string;
  results: number;
  leadsWithEmail: number;
  contactedCount: number;
  contactedToday: number;
  contactedWeekly: number;
  replyCount: number;
  replyRate: number;
  city: string;
  state: string;
  country: string;
  createdAt: string;
}

const Home = () => {
  const { refreshUser, user, token } = useAuthStore();

  // Local state for our Lead Gen Data
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalEmailed: 0,
    totalReplies: 0,
    avgReplyRate: 0
  });

  const [chartData, setChartData] = useState<number[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [rawStats, setRawStats] = useState<any>(null);

  const calculateStats = (scrapingJobs: ScrapingJob[], selectedPeriod: string) => {

    // Separate logic for Leads Discovered (Total) vs Outreach (Timed)
    const totals = scrapingJobs.reduce((acc: any, job: ScrapingJob) => {
      // 1. Total Leads: Always show ALL raw results found
      acc.leads += job.results;

      // 2. Timed Outreach: Filter engagement based on current period
      if (selectedPeriod === 'daily') acc.emailed += job.contactedToday;
      else if (selectedPeriod === 'weekly') acc.emailed += job.contactedWeekly;
      else acc.emailed += job.contactedCount; // monthly/all fallback to total batch outreach

      acc.replies += job.replyCount;
      return acc;
    }, { leads: 0, emailed: 0, replies: 0 });

    setStats({
      totalLeads: totals.leads,
      totalEmailed: totals.emailed,
      totalReplies: totals.replies,
      avgReplyRate: totals.emailed > 0 ? Math.round((totals.replies / totals.emailed) * 100) : 0
    });
  };

  // Handle chart update when period or rawStats changes
  useEffect(() => {
    if (!rawStats) return;

    if (period === 'daily') {
      setChartData(rawStats.hourlyOutreach || []);
      setChartLabels([...Array(24)].map((_, i) => `${i}:00`));
    } else if (period === 'weekly') {
      setChartData(rawStats.dailyOutreach || []);
      setChartLabels(['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', 'Yesterday', 'Today']);
    } else {
      setChartData(rawStats.monthlyOutreach || []);
      setChartLabels(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
    }
  }, [period, rawStats]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/scraper/jobs?limit=200`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const scrapingJobs = data.jobs || [];
        setJobs(scrapingJobs);
        setRawStats(data); // Save all granular sets
        
        // Initial Stats Calculation
        calculateStats(scrapingJobs, period);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (jobs.length > 0) {
      calculateStats(jobs, period);
    }
  }, [period]);

  useEffect(() => {
    refreshUser();
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const getKeyword = (url: string) => {
    try {
      const parts = url.split('search/');
      if (parts.length > 1) {
        const query = parts[1].split('/')[0];
        return decodeURIComponent(query).replace(/\+/g, ' ');
      }
      return 'Custom Search';
    } catch (e) {
      return 'Custom Search';
    }
  };

  const memoizedFilteredJobs = jobs.filter(job => {
    const jobDate = new Date(job.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60);

    if (period === 'daily') return diffHours >= 0 && diffHours <= 24;
    if (period === 'weekly') return diffHours >= 0 && diffHours <= 168;
    if (period === 'monthly') return diffHours >= 0 && diffHours <= 720;
    return true; // 'all'
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <PageMeta
        title="LeadGen Dashboard | Cold Outreach Automation"
        description="Monitor your lead generation campaigns, track email outreach performance and response rates."
      />
      <div className='min-h-screen pt-4 px-4 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white'>
        <div className='max-w-7xl mx-auto'>

          {/* Header */}
          <div className='mb-8 px-4 sm:px-0'>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
              <div>
                <h1 className='text-3xl font-black flex items-center gap-3'>
                  Welcome Back, {user?.firstName || 'User'}!
                </h1>
                <p className='text-gray-500 mt-2 text-lg font-medium dark:text-gray-400'>
                  Your cold outreach engine is currently processing your target leads.
                </p>
              </div>
              <div className='flex flex-wrap items-center gap-3'>
                {/* Period Filter */}
                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mr-2">
                  {(['all', 'daily', 'weekly', 'monthly'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${period === p
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      {p === 'all' ? 'All Time' : p === 'daily' ? '24 Hours' : p === 'weekly' ? '7 Days' : '30 Days'}
                    </button>
                  ))}
                </div>

                <Link to='/start-scraping'>
                  <Button startIcon={<Plus size={18} />} size='sm'>
                    New Scrape
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Core Stats Overview */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 px-4 sm:px-0'>
            <Card>
              <div className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-gray-500 text-[10px] font-black uppercase tracking-widest dark:text-gray-400'>Total Leads</p>
                    <p className='text-2xl font-black mt-1'>{isLoading ? '...' : stats.totalLeads.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                    <Users className='w-6 h-6 text-blue-600' />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-gray-500 text-[10px] font-black uppercase tracking-widest dark:text-gray-400'>Total Outreach</p>
                    <p className='text-2xl font-black mt-1'>{isLoading ? '...' : stats.totalEmailed.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                    <Mail className='w-6 h-6 text-indigo-600' />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-gray-500 text-[10px] font-black uppercase tracking-widest dark:text-gray-400'>Replies Found</p>
                    <p className='text-2xl font-black mt-1'>{isLoading ? '...' : stats.totalReplies.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                    <CheckCircle className='w-6 h-6 text-green-600' />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-gray-500 text-[10px] font-black uppercase tracking-widest dark:text-gray-400'>Avg Reply Rate</p>
                    <p className='text-2xl font-black text-blue-600 dark:text-blue-400 mt-1'>{isLoading ? '...' : stats.avgReplyRate}%</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className='w-6 h-6 text-amber-600' />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Dashboard Grid */}
          <div className='grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8 px-4 sm:px-0'>
            <div className='xl:col-span-2 space-y-8'>

              {/* Campaign Performance Table */}
              <Card className="overflow-hidden border-none shadow-2xl shadow-gray-200/50 dark:shadow-none">
                <Card.Header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <Card.Title className="text-xl font-bold flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                      Campaign Performance
                    </Card.Title>
                    <Link to="/start-automation" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all dark:hover:bg-blue-900/20">View All Campaigns</Link>
                  </div>
                </Card.Header>
                <Card.Content className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 border-b dark:border-gray-800">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Details</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Location</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Success Rate</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {isLoading ? (
                          [1, 2, 3, 4, 5].map(i => (
                            <tr key={i}><td colSpan={4} className="px-6 py-4"><Skeleton className="h-12 w-full" /></td></tr>
                          ))
                        ) : memoizedFilteredJobs.length === 0 ? (
                          <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">No campaigns found for this period.</td></tr>
                        ) : (
                          memoizedFilteredJobs.slice(0, 8).map((job) => (
                            <tr key={job.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold truncate max-w-[200px] group-hover:text-blue-500 transition-colors">
                                    {getKeyword(job.url)}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-gray-400 font-mono">#{job.id}</span>
                                    <span className="text-[10px] text-gray-400">•</span>
                                    <span className="text-[10px] text-gray-400">{job.leadsWithEmail} emails found</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-red-500" />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold">{job.city !== 'N/A' ? job.city : 'Targeted Locations'}</span>
                                    <span className="text-[10px] text-gray-500">{job.state !== 'N/A' ? job.state : ''} {job.country !== 'N/A' ? job.country : ''}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className={`text-sm font-black ${job.replyRate > 10 ? 'text-green-500' : 'text-blue-500'}`}>
                                    {job.replyRate}%
                                  </span>
                                  <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1 mt-1">
                                    <div className={`h-1 rounded-full ${job.replyRate > 10 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(job.replyRate, 100)}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Link to={`/start-automation/${job.id}`}>
                                  <div className="inline-flex w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center hover:bg-blue-500 hover:text-white transition-all group-hover:bg-blue-500 group-hover:text-white">
                                    <ArrowRight className="w-4 h-4" />
                                  </div>
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card.Content>
              </Card>

              {/* Success Chart */}
              <StatisticsChart data={chartData} labels={chartLabels} title="Campaign Success Growth" />
            </div>

            {/* Sidebar Resources */}
            <div className='xl:col-span-1 space-y-6'>
              <Card className="bg-blue-600 border-none shadow-2xl shadow-blue-200 dark:shadow-none overflow-hidden group">
                <div className="p-8 relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Zap size={120} />
                  </div>
                  <h3 className="text-white text-xl font-bold mb-2">Ready to expand?</h3>
                  <p className="text-blue-100 text-sm mb-6">Start a new targeted search to find fresh business leads for your next campaign.</p>
                  <Link to="/start-scraping">
                    <button className="w-full bg-white text-blue-700 hover:bg-blue-50 dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-900 dark:border dark:border-white/10 text-sm font-black py-4 rounded-2xl shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-2">
                      <Plus size={18} />
                      Start New Discovery
                    </button>
                  </Link>
                </div>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title className='text-lg font-bold flex items-center gap-2'>
                    <TrendingUp className='w-5 h-5 text-blue-600' />
                    Global Intelligence
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform Reach</span>
                      <span className="text-xs font-black">Web Scraper</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Accuracy Rate</span>
                      <span className="text-xs font-black text-green-500">98.4%</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Automation Mode</span>
                      <span className="text-xs font-black text-blue-500">AI Re-phrasing</span>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
