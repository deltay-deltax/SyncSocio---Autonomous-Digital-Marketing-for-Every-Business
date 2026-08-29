import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Users, MousePointerClick, DollarSign, Wallet, AlertCircle, TrendingUp, Calendar, CreditCard, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorDashboard() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [conversions, setConversions] = useState<any[]>([]);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'purchases' | 'users'>('purchases');
  const { toast } = useToast();

  let API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
  if (!API_BASE.endsWith('/api')) API_BASE += '/api';

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/creators/dashboard/${token}`);
      const json = await res.json();
      if (json.success) {
        setData(json.creator);
        setConversions(json.conversions || []);
        setReferredUsers(json.referredUsers || []);
      } else {
        setData(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const copyLink = () => {
    if (!data) return;
    const link = `${window.location.origin}/?ref=${data.code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Your promotion link is ready to share.",
    });
  };

  const handlePayoutRequest = async () => {
    setPayoutLoading(true);
    try {
      const res = await fetch(`${API_BASE}/creators/dashboard/${token}/payout`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Payout Requested",
          description: "We've received your request and will process it shortly.",
        });
        setData({ ...data, payoutRequested: true });
      } else {
        throw new Error(json.message);
      }
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: error.message || "Something went wrong.",
        variant: "destructive"
      });
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 pt-24 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-1/3 mb-4" />
        <Skeleton className="h-4 w-1/4 mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Dashboard Not Found</h2>
          <p className="text-muted-foreground">This creator link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-12 md:pt-24 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">Welcome back, {data.name}</h1>
            <p className="text-slate-500 mt-2 text-base md:text-lg">Here's how your promotions are performing.</p>
          </div>
          <div className="bg-white p-3 pr-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Your Promo Code</span>
              <span className="text-primary font-black tracking-widest bg-primary/5 px-2 py-0.5 rounded">{data.code}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <Button onClick={copyLink} className="gap-2 font-bold shadow-sm">
              <Copy className="w-4 h-4" />
              Copy Promo Link
            </Button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-slate-500 tracking-wider">TOTAL CLICKS</div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"><MousePointerClick className="w-5 h-5" /></div>
              </div>
              <div className="text-3xl font-black text-slate-900">{data.clicks}</div>
              <div className="text-xs font-semibold text-slate-400 mt-2">Visits to your link</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-slate-500 tracking-wider">TOTAL SIGNUPS</div>
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg group-hover:scale-110 transition-transform"><Users className="w-5 h-5" /></div>
              </div>
              <div className="text-3xl font-black text-slate-900">{data.signups}</div>
              <div className="text-xs font-semibold text-slate-400 mt-2">{data.eligibleSignups} eligible for commission</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-all relative">
            <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-24 h-24" /></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-emerald-600 tracking-wider">TOTAL EARNED</div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform"><DollarSign className="w-5 h-5" /></div>
              </div>
              <div className="text-3xl font-black text-emerald-600">₹{data.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>

            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-slate-900 text-white overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-slate-400 tracking-wider">AVAILABLE PAYOUT</div>
                <div className="p-2 bg-white/10 text-white rounded-lg"><Wallet className="w-5 h-5" /></div>
              </div>
              <div className="text-3xl font-black">₹{data.pendingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              
              <div className="mt-4">
                {data.payoutRequested ? (
                  <div className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 py-2 px-3 rounded-lg flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Payout Requested
                  </div>
                ) : (
                  <Button 
                    className="w-full font-bold shadow-[0_4px_14px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.23)] transition-all bg-white text-slate-900 hover:bg-slate-100"
                    disabled={data.pendingBalance <= 0 || payoutLoading}
                    onClick={handlePayoutRequest}
                  >
                    {payoutLoading ? "Requesting..." : "Request Payout to Bank"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-6 px-6 pt-6 border-b border-slate-100">
            <button 
              onClick={() => setActiveTab('purchases')}
              className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all ${activeTab === 'purchases' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Purchases & Commissions</span>
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Referred Users</span>
            </button>
          </div>

          <div className="p-0">
            {activeTab === 'purchases' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4 pl-6 whitespace-nowrap">Customer / Brand</th>
                      <th className="p-4 whitespace-nowrap">Date</th>
                      <th className="p-4 whitespace-nowrap">Plan Purchased</th>
                      <th className="p-4 whitespace-nowrap text-right">Amount Paid</th>
                      <th className="p-4 pr-6 whitespace-nowrap text-right">Your commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {conversions.map((conv, i) => (
                      <tr key={conv._id || i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-slate-900">{conv.customerName}</div>
                          <div className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1.5">
                            <BriefcaseIcon className="w-3.5 h-3.5" /> {conv.brandName}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <div className="text-sm font-semibold text-slate-800">
                                {new Date(conv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${
                                conv.isEligible ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {conv.isEligible ? `${conv.commissionPeriod} · ${conv.commissionRate}%` : 'Outside commission period'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border capitalize shadow-sm ${
                            conv.plan?.toLowerCase().includes('pro') ? 'bg-violet-50 text-violet-700 border-violet-200' :
                            conv.plan?.toLowerCase().includes('growth') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            conv.plan?.toLowerCase().includes('starter') ? 'bg-teal-50 text-teal-700 border-teal-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {conv.plan}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-bold text-slate-600">₹{conv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {conv.isEligible ? (
                            <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                              <span className="text-[10px] font-black text-emerald-600">{conv.commissionRate}%</span>
                              <span className="font-black text-emerald-600 text-base">₹{conv.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-slate-400 line-through">₹{conv.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {conversions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-16 text-center text-slate-500">
                          <ShoppingCart className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-slate-900">No purchases yet</h3>
                          <p className="mt-1">When users buy a plan via your link, commissions will appear here.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4 pl-6 whitespace-nowrap">User / Brand</th>
                      <th className="p-4 whitespace-nowrap">Signup Date</th>
                      <th className="p-4 whitespace-nowrap">Status</th>
                      <th className="p-4 whitespace-nowrap text-right">Total Spent</th>
                      <th className="p-4 pr-6 whitespace-nowrap text-right">Commission Gen.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {referredUsers.map((user, i) => (
                      <tr key={user._id || i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-slate-900">{user.customerName}</div>
                          <div className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1.5">
                            <BriefcaseIcon className="w-3.5 h-3.5" /> {user.brandName}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-semibold text-slate-800">
                            {new Date(user.signupDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            user.status === 'Subscribed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {user.status === 'Subscribed' && <CheckCircle2 className="w-3 h-3" />}
                            {user.status}
                          </span>
                          <div className="text-[11px] font-medium text-slate-500 mt-1.5 ml-1">Plan: <span className="text-slate-800 capitalize">{user.currentPlan}</span></div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-bold text-slate-700">₹{user.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="font-black text-emerald-600">₹{user.commissionGenerated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                      </tr>
                    ))}
                    {referredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-16 text-center text-slate-500">
                          <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-slate-900">No users yet</h3>
                          <p className="mt-1">Share your link to get your first signups.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* How It Works Card */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold text-slate-900">How It Works</CardTitle>
            <CardDescription className="text-slate-500">Your referral commission program</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Share Your Link</h4>
                  <p className="text-sm text-slate-500">Anyone who clicks your tracking link and signs up is permanently attributed to you.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">2</div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Earn on paid referrals</h4>
                  <p className="text-sm text-slate-500">You earn {data.initialCommissionRate}% for the first {data.initialCommissionMonths} month{data.initialCommissionMonths === 1 ? '' : 's'} after signup, then {data.retentionCommissionRate}% for the next {data.retentionCommissionMonths} month{data.retentionCommissionMonths === 1 ? '' : 's'}.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">3</div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Get Paid</h4>
                  <p className="text-sm text-slate-500">Request payout directly to your bank account or UPI whenever you have an available balance.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="font-bold text-slate-900 mb-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Important Guidelines
              </h4>
              <ul className="space-y-3 text-sm text-slate-600 pl-1">
                <li className="flex gap-2"><span className="text-amber-500 font-bold">•</span> <span><strong>Rolling Payouts:</strong> Payouts are processed on a rolling basis, typically within 7 days of the request.</span></li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">•</span> <span><strong>Retention Required:</strong> Commissions are tied to customer retention. If a referred customer cancels or doesn't retain their subscription, you will not receive commissions for that user.</span></li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">•</span> <span><strong>No Self-Referrals:</strong> Self-referrals or using secondary accounts to earn commissions on your own purchases is strictly prohibited.</span></li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">•</span> <span><strong>Ethical Promotion:</strong> Ensure you are promoting the service ethically. Spamming links or misleading promotions may result in account suspension.</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const BriefcaseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
