import { useState } from 'react';
import { RefreshCw, Trash2, Pause, Globe, MapPin, Target, Users, Megaphone, Palette, Layers, CheckCircle2, Zap, Clock } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const InstagramIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const settingsTabs = ['Brand Profile', 'Connected Accounts', 'Posting Preferences', 'Plan & Billing', 'Danger Zone'];

const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | string[] }) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/10 border border-border/30 hover:bg-muted/20 transition-all group">
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
      <Icon size={18} className="text-primary" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {Array.isArray(value) ? value.join(', ') : (value || '—')}
      </p>
    </div>
  </div>
);

const DashboardSettings = () => {
  const [activeTab, setActiveTab] = useState('Brand Profile');
  const { profile } = useOutletContext<{ profile: any }>();

  if (!profile) return null;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">Settings</h2>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sub nav */}
        <div className="lg:w-48 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          {settingsTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'text-xs font-medium px-3 py-2.5 rounded-xl text-left whitespace-nowrap transition-colors',
                activeTab === tab ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-right-4 duration-500">
          {activeTab === 'Brand Profile' && (
            <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
              <CardHeader className="p-8 pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Brand Profile</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Configure your core brand settings and identity details.</p>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Name</Label>
                      <Input defaultValue={profile.brandName || ''} className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Industry</Label>
                      <Input defaultValue={profile.businessCategory === "Other" ? profile.otherCategory : profile.businessCategory} className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Website URL</Label>
                      <Input defaultValue={profile.website || ''} className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                    </div>
                  </div>

                  {/* Additional Identity */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location</Label>
                      <div className="flex gap-2">
                        <Input defaultValue={profile.location?.city || ''} placeholder="City" className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                        <Input defaultValue={profile.location?.country || ''} placeholder="Country" className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Voice / Tone</Label>
                      <Input defaultValue={profile.brandTone || ''} className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Unique Selling Point (USP)</Label>
                  <Input defaultValue={profile.usp || ''} className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Main Growth Goal</Label>
                    <Input defaultValue={profile.mainGoal || ''} className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Competitor Handles</Label>
                    <Input defaultValue={profile.competitors?.join(', ') || ''} placeholder="@rival1, @rival2" className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Audience</Label>
                    <Input defaultValue={Array.isArray(profile.targetAudiences) ? profile.targetAudiences.join(', ') : profile.targetAudience || ''} className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Addressing Pain Point</Label>
                    <Input defaultValue={profile.painPoint || ''} className="h-12 rounded-xl text-sm font-bold border-border/50 bg-muted/20" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Age Range</Label>
                    <Input defaultValue={profile.ageRange || ''} className="h-11 rounded-xl text-xs font-bold border-border/50 bg-muted/10 text-center" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gender Focus</Label>
                    <Input defaultValue={profile.genderFocus || ''} className="h-11 rounded-xl text-xs font-bold border-border/50 bg-muted/10 text-center" />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Keywords</Label>
                    <Input defaultValue={profile.brandKeywords || ''} className="h-11 rounded-xl text-xs font-bold border-border/50 bg-muted/10" />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/30">
                  <Button className="gradient-bg text-primary-foreground border-0 text-[10px] font-black uppercase tracking-widest h-12 px-10 rounded-xl shadow-lg shadow-primary/20">Update Brand Identity</Button>
                  <p className="text-[10px] text-muted-foreground font-medium italic mt-3">Changes here will trigger a retraining cycle for your AI Posting Agent.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'Connected Accounts' && (
            <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
              <CardHeader className="p-8 pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Connected Accounts</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Manage external social media platform connections.</p>
              </CardHeader>
              <CardContent className="p-8">
                {profile.instagramIsConnected ? (
                  <div className="flex items-center gap-4 p-6 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)' }}>
                      <InstagramIcon size={28} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black text-foreground">@{profile.instagramUsername}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Connection</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-[10px] h-10 rounded-xl font-black uppercase tracking-widest border-border/50 px-5">
                      <RefreshCw size={14} className="mr-2" /> Reconnect
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-12 border-2 border-dashed border-border rounded-[2.5rem] bg-muted/5">
                     <InstagramIcon size={40} className="mx-auto mb-4 text-muted-foreground/20" />
                     <p className="text-sm font-bold">No Social Account Linked</p>
                     <p className="text-xs text-muted-foreground mb-6 max-w-xs mx-auto">Velocity needs an Instagram Business account connection to start posting autonomously.</p>
                     <Button className="gradient-bg text-white text-xs font-black uppercase tracking-widest h-11 px-8 rounded-xl" onClick={() => window.location.href='/setup'}>Link Instagram Now</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'Posting Preferences' && (
            <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
              <CardHeader className="p-8 pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-600">Posting Preferences</CardTitle>
                <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-emerald-500/10 rounded-full w-fit">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider italic">Synchronized from Onboarding</span>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <InfoItem icon={Clock} label="Posting Frequency" value={profile.postingFrequency || 'Daily'} />
                  <InfoItem icon={Layers} label="Content Formats" value={profile.contentTypes || []} />
                  <InfoItem icon={Globe} label="Target Platforms" value={profile.socialPlatforms || ['Instagram', 'Facebook']} />
                  <InfoItem icon={Target} label="Primary Call-to-Action" value={profile.primaryCTA || 'Visit Link'} />
                </div>
                
                <div className="p-5 rounded-2xl bg-muted/20 border border-border/40 mt-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Topic Constraints</p>
                  <p className="text-sm font-bold text-foreground opacity-60">
                    {profile.painPoint ? `Addressing: ${profile.painPoint}` : 'No specific constraints set.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-muted/30 border border-emerald-500/20 text-emerald-700/60 text-[11px] font-medium leading-relaxed italic">
                  Note: These settings are locked based on your initial agent training. To modify your posting DNA, please contact support for a profile reset.
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'Plan & Billing' && (
            <Card className="rounded-[2rem] border-border/50 overflow-hidden shadow-sm">
              <CardHeader className="p-8 pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Membership Status</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white relative overflow-hidden shadow-xl shadow-primary/20">
                  <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 pointer-events-none">
                    <Zap size={120} fill="currentColor" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-2 opacity-70">Active Strategy Plan</p>
                  <h3 className="text-3xl font-black tracking-tighter mb-4">Velocity {profile.selectedPlan || 'Pro'}</h3>
                  <div className="flex gap-4">
                    <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md">
                      <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">Status</p>
                      <p className="text-xs font-black">ACTIVE</p>
                    </div>
                    <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md">
                      <p className="text-[8px] font-black uppercase opacity-60 mb-0.5">Next Bill</p>
                      <p className="text-xs font-black">MAY 14, 2026</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 ml-1">Automated Billing Record</p>
                  {['Apr 2026', 'Mar 2026', 'Feb 2026'].map((month, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-muted/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><CheckCircle2 size={18} /></div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-foreground">{month} Statement</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Processed</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-muted-foreground">₹499.00</span>
                    </div>
                  ))}
                </div>
                
                <Button disabled className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest bg-muted text-muted-foreground border-border/50 cursor-not-allowed">
                  Subscription Managed via Onboarding Flow
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'Danger Zone' && (
            <Card className="rounded-[2rem] border-destructive/20 overflow-hidden shadow-sm">
              <CardHeader className="p-8 pb-2"><CardTitle className="text-sm font-black uppercase tracking-widest text-destructive">Danger Zone</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="p-6 rounded-2xl border border-border space-y-3 group hover:border-destructive/20 transition-all">
                   <div className="flex items-center gap-3">
                    <Pause size={18} className="text-destructive/60" />
                    <p className="text-sm font-black text-foreground">Pause Agent Operations</p>
                   </div>
                  <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">Temporarily halt all agent posting activity and content synthesis. Your historical data and profile remain safe.</p>
                  <Button variant="outline" size="sm" className="text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10">
                    Confirm Pause
                  </Button>
                </div>
                <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/[0.02] space-y-3">
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} className="text-destructive" />
                    <p className="text-sm font-black text-foreground">Terminate Account</p>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">Permanently erase your digital entity, synthesis weights, and all associated analytics. This action cannot be reversed.</p>
                  <Button variant="destructive" size="sm" className="text-[10px] font-black uppercase tracking-widest h-11 px-8 rounded-xl shadow-lg shadow-destructive/20">
                    Erase My Entity
                  </Button>
                </div>

                <div className="p-6 rounded-2xl border border-border space-y-3 group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3">
                    <RefreshCw size={18} className="text-muted-foreground" />
                    <p className="text-sm font-black text-foreground">Sign Out</p>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                    Safely log out of your current session. You will need to re-authenticate to access Mission Control.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl border-border text-foreground hover:bg-muted"
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('velocity_profile');
                      localStorage.removeItem('velocity_setup_done');
                      window.location.href = '/login';
                    }}
                  >
                    Secure Logout
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;
