import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Users, MousePointerClick, DollarSign, Wallet, AlertCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function CreatorDashboard() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/creators/dashboard/${token}`);
      const json = await res.json();
      if (json.success) {
        setData(json.creator);
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
      <div className="min-h-screen bg-slate-50 p-8 pt-24 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-1/3 mb-4" />
        <Skeleton className="h-4 w-1/4 mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-12 md:pt-24">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {data.name}</h1>
            <p className="text-muted-foreground mt-1">Here's how your promotions are performing.</p>
          </div>
          <div className="bg-white p-2 pr-4 rounded-lg border shadow-sm flex items-center gap-3">
            <div className="bg-primary/10 text-primary px-3 py-1.5 rounded font-mono text-sm font-semibold">
              {data.code}
            </div>
            <Button size="sm" variant="secondary" onClick={copyLink}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Promo Link
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.clicks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Link visits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.signups}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.eligibleSignups} eligible for commission
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{data.totalEarned.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime 25% commission
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-slate-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Available Payout</CardTitle>
              <Wallet className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{data.pendingBalance.toFixed(2)}</div>
              {data.payoutRequested ? (
                <div className="mt-3 text-xs font-medium text-amber-400 bg-amber-400/10 py-1.5 px-3 rounded-full inline-block">
                  Payout Requested
                </div>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full mt-3 bg-white text-slate-900 hover:bg-slate-200"
                  disabled={data.pendingBalance <= 0 || payoutLoading}
                  onClick={handlePayoutRequest}
                >
                  {payoutLoading ? "Requesting..." : "Request Payout"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>Understanding your commissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>1. <strong>Share your link:</strong> Anyone who clicks your link and signs up is tracked as your referral.</p>
            <p>2. <strong>Earn Commission:</strong> You earn <strong>25%</strong> of every payment your referrals make within <strong>2 months (60 days) of your link being generated</strong>.</p>
            <p>3. <strong>Get Paid:</strong> Once you have a pending balance, click "Request Payout". We will process the payment to your registered bank account or UPI.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
