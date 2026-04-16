import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Heart, Zap, Eye, ArrowUpRight, BarChart3, Target, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const Metrics = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${import.meta.env.VITE_API_URL}/instagram/metrics`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (res.ok) {
                    setData(result.data);
                } else {
                    console.log("METRICS FETCH ERROR:", result.message);
                    setError(result.message);
                }
            } catch (err) {
                console.error('Failed to fetch metrics:', err);
                setError('Connection failed');
            } finally {
                setLoading(false);
            }
        };
        fetchMetrics();
    }, []);

    if (loading) return <div className="p-8 text-center font-black uppercase tracking-widest text-primary animate-pulse">Synchronizing with Meta...</div>;

    const stats = [
        { label: "Total Reach", value: data?.reach ?? "—", change: "+0.0%", icon: Target, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Impressions", value: data?.impressions ?? "—", change: "+0.0%", icon: Eye, color: "text-primary", bg: "bg-primary/10" },
        { label: "Followers", value: data?.followers ?? "—", change: "+0.0%", icon: Users, color: "text-emerald-500", bg: "bg-emerald-50" },
        { label: "Posts", value: data?.post_count ?? "—", change: "+0.0%", icon: Calendar, color: "text-orange-500", bg: "bg-orange-50" },
    ];

    if (error && (error.includes('Permission') || error.includes('Expired') || error.includes('RECONNECT') || error.includes('10'))) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6">
                    <Zap size={40} className="animate-pulse" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-900 mb-2">Reconnect Required</h2>
                <p className="text-slate-500 text-center max-w-md mb-8 font-medium">
                    Your Instagram session has expired or permissions (insights) are missing. 
                    Please re-connect to fix this.
                </p>
                <Button 
                    onClick={() => window.location.href = '/dashboard/settings'}
                    className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                    Reconnect Instagram
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-1 animate-in fade-in duration-500 font-display">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-primary">
                    <BarChart3 size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Meta Data</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">
                    Real-time <span className="text-primary">Performance</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden group hover:scale-[1.02] transition-all">
                        <CardContent className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-[1.5rem] flex items-center justify-center`}>
                                    <stat.icon size={26} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] tracking-widest">
                                        <ArrowUpRight size={10} className="mr-1" /> {stat.change}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter italic">{stat.value}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{stat.label}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[3rem] bg-white overflow-hidden">
                <CardHeader className="p-10 pb-4">
                    <CardTitle className="text-xl font-black uppercase tracking-tight italic">Insight Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-10 pt-0">
                    <div className="grid md:grid-cols-3 gap-8">
                        {data?.insights?.map((insight: any) => (
                            <div key={insight.name} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{insight.name.replace('_', ' ')}</span>
                                <div className="text-2xl font-black text-slate-900">{insight.values[0].value}</div>
                                <div className="text-[9px] font-bold text-slate-400 mt-1 italic">Last 24 Hours</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Metrics;
