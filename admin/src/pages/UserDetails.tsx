import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Save, Bot, Smartphone, Mail, Globe, 
  Trash2, Edit, Check, X, User, RefreshCw
} from 'lucide-react';

interface UserData {
  _id: string;
  email: string;
  name?: string;
  credits: number;
  plan: string;
  isVerified: boolean;
  isBlocked?: boolean;
  createdAt: string;
}

interface BrandProfileData {
  _id?: string;
  brandName?: string;
  socialHandle?: string;
  businessCategory?: string;
  otherCategory?: string;
  mainGoal?: string;
  website?: string;
  location?: { country: string; city: string };
  usp?: string;
  competitors?: string[];
  targetAudiences?: string[];
  brandTone?: string;
  visualVibe?: string;
  instagramIsConnected?: boolean;
  instagramUsername?: string;
  instagramUserId?: string;
  instagramAccessToken?: string;
  gmailEmail?: string;
  gmailIsConnected?: boolean;
  whatsappNumber?: string;
  whatsappIsConnected?: boolean;
  whatsappPhoneId?: string;
  whatsappAccessToken?: string;
  DM_Automation_Service?: boolean;
  neuralState?: string;
  selectedPlan?: string;
  isPaid?: boolean;
}

interface DMFlowData {
  _id: string;
  name: string;
  trigger: string;
  targetType: string;
  keyword: string;
  commentReplyMessage?: string;
  active: boolean;
  stats?: {
    triggered: number;
    replied: number;
    clicked: number;
    conversions: number;
  };
  messages: Array<{
    id: string;
    text: string;
    buttons: Array<{ id: string; label: string; type: string; url: string }>;
  }>;
}

interface AssetData {
  _id: string;
  title: string;
  description: string;
  slug: string;
  ctaText?: string;
  ctaUrl?: string;
  isPublished: boolean;
  brandColor?: string;
  brandSecondaryColor?: string;
  stats?: {
    views: number;
    ctaClicks: number;
  };
}

export default function UserDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [userData, setUserData] = useState<UserData | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfileData | null>(null);
  const [flows, setFlows] = useState<DMFlowData[]>([]);
  const [assets, setAssets] = useState<AssetData[]>([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'general' | 'brand' | 'flows' | 'assets'>('general');

  // Edit Forms State
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    plan: '',
    credits: 0,
    isVerified: false,
    isBlocked: false
  });

  const [brandForm, setBrandForm] = useState({
    brandName: '',
    socialHandle: '',
    website: '',
    country: '',
    city: '',
    businessCategory: '',
    usp: '',
    competitors: '',
    targetAudiences: '',
    brandTone: '',
    visualVibe: '',
    neuralState: 'Idle',
    DM_Automation_Service: false,
    instagramIsConnected: false,
    instagramUsername: '',
    instagramUserId: '',
    instagramAccessToken: '',
    gmailEmail: '',
    gmailIsConnected: false,
    whatsappNumber: '',
    whatsappIsConnected: false,
    whatsappPhoneId: '',
    whatsappAccessToken: '',
    selectedPlan: 'Free',
    isPaid: false
  });

  // Editing Sub-Elements
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [flowForm, setFlowForm] = useState({
    name: '',
    trigger: 'comment',
    keyword: '',
    commentReplyMessage: '',
    active: true,
    messageText: ''
  });

  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState({
    title: '',
    description: '',
    ctaText: 'Learn More',
    ctaUrl: '',
    brandColor: '#2563EB',
    brandSecondaryColor: '#60A5FA',
    isPublished: false
  });

  const fetchDeepDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${id}/deep`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        const { user, brandProfile: brand, flows: userFlows, assets: userAssets } = res.data.data;
        setUserData(user);
        setBrandProfile(brand);
        setFlows(userFlows);
        setAssets(userAssets);

        // Populate forms
        setUserForm({
          name: user.name || '',
          email: user.email || '',
          plan: user.plan || '',
          credits: user.credits || 0,
          isVerified: user.isVerified || false,
          isBlocked: user.isBlocked || false
        });

        if (brand) {
          setBrandForm({
            brandName: brand.brandName || '',
            socialHandle: brand.socialHandle || '',
            website: brand.website || '',
            country: brand.location?.country || '',
            city: brand.location?.city || '',
            businessCategory: brand.businessCategory || '',
            usp: brand.usp || '',
            competitors: brand.competitors?.join(', ') || '',
            targetAudiences: brand.targetAudiences?.join(', ') || '',
            brandTone: brand.brandTone || '',
            visualVibe: brand.visualVibe || '',
            neuralState: brand.neuralState || 'Idle',
            DM_Automation_Service: brand.DM_Automation_Service || false,
            instagramIsConnected: brand.instagramIsConnected || false,
            instagramUsername: brand.instagramUsername || '',
            instagramUserId: brand.instagramUserId || '',
            instagramAccessToken: brand.instagramAccessToken || '',
            gmailEmail: brand.gmailEmail || '',
            gmailIsConnected: brand.gmailIsConnected || false,
            whatsappNumber: brand.whatsappNumber || '',
            whatsappIsConnected: brand.whatsappIsConnected || false,
            whatsappPhoneId: brand.whatsappPhoneId || '',
            whatsappAccessToken: brand.whatsappAccessToken || '',
            selectedPlan: brand.selectedPlan || 'Free',
            isPaid: brand.isPaid || false
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch user deep details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeepDetails();
  }, [id]);

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${id}/profile`, userForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        alert('User profile updated successfully!');
        fetchDeepDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user profile');
    }
  };

  const handleBrandSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      // Format array inputs
      const formattedBrandData = {
        ...brandForm,
        competitors: brandForm.competitors.split(',').map(s => s.trim()).filter(Boolean),
        targetAudiences: brandForm.targetAudiences.split(',').map(s => s.trim()).filter(Boolean),
        location: {
          country: brandForm.country,
          city: brandForm.city
        }
      };

      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${id}/brand`, formattedBrandData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        alert('Brand profile updated successfully!');
        fetchDeepDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update brand profile');
    }
  };

  // Flows Actions
  const handleEditFlow = (flow: DMFlowData) => {
    setEditingFlowId(flow._id);
    setFlowForm({
      name: flow.name || '',
      trigger: flow.trigger || 'comment',
      keyword: flow.keyword || '',
      commentReplyMessage: flow.commentReplyMessage || '',
      active: flow.active,
      messageText: flow.messages?.[0]?.text || ''
    });
  };

  const handleFlowSave = async (flowId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      // Reconstruct messages array
      const originalFlow = flows.find(f => f._id === flowId);
      const updatedMessages = originalFlow ? [...originalFlow.messages] : [];
      if (updatedMessages.length > 0) {
        updatedMessages[0].text = flowForm.messageText;
      } else {
        updatedMessages.push({
          id: 'msg_1',
          text: flowForm.messageText,
          buttons: []
        });
      }

      const payload = {
        name: flowForm.name,
        trigger: flowForm.trigger,
        keyword: flowForm.keyword,
        commentReplyMessage: flowForm.commentReplyMessage,
        active: flowForm.active,
        messages: updatedMessages
      };

      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${id}/flows/${flowId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setEditingFlowId(null);
        fetchDeepDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update flow');
    }
  };

  const handleFlowToggleActive = async (flow: DMFlowData) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${id}/flows/${flow._id}`, {
        active: !flow.active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeepDetails();
    } catch (err) {
      alert('Failed to toggle flow active state');
    }
  };

  const handleFlowDelete = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this flow? This action is permanent.')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${id}/flows/${flowId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeepDetails();
    } catch (err) {
      alert('Failed to delete flow');
    }
  };

  // Assets Actions
  const handleEditAsset = (asset: AssetData) => {
    setEditingAssetId(asset._id);
    setAssetForm({
      title: asset.title || '',
      description: asset.description || '',
      ctaText: asset.ctaText || 'Learn More',
      ctaUrl: asset.ctaUrl || '',
      brandColor: asset.brandColor || '#2563EB',
      brandSecondaryColor: asset.brandSecondaryColor || '#60A5FA',
      isPublished: asset.isPublished
    });
  };

  const handleAssetSave = async (assetId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${id}/assets/${assetId}`, assetForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setEditingAssetId(null);
        fetchDeepDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update landing page asset');
    }
  };

  const handleAssetDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this landing page? This action is permanent.')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${id}/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeepDetails();
    } catch (err) {
      alert('Failed to delete landing page');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
        <p className="text-muted-foreground animate-pulse">Fetching deep user data...</p>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-20 text-center">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 font-medium">
          {error || 'User not found'}
        </div>
        <button onClick={() => navigate('/users')} className="btn flex items-center gap-2 mx-auto text-blue-400">
          <ArrowLeft size={16} /> Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <Link to="/users" className="text-sm text-blue-400 hover:underline flex items-center gap-1.5 mb-2">
            <ArrowLeft size={14} /> Back to Users
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{userData.email}</h2>
            {userData.isVerified ? (
              <span className="px-2.5 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full font-semibold border border-green-500/20">Verified</span>
            ) : (
              <span className="px-2.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded-full font-semibold border border-yellow-500/20">Pending</span>
            )}
            <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full font-semibold border border-blue-500/20 uppercase">
              {userData.plan || 'Free Plan'}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            ID: <span className="font-mono text-xs">{userData._id}</span> • Joined on {new Date(typeof userData.createdAt === 'string' ? userData.createdAt.replace(/Z$/, '') : userData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Credits Available</div>
            <div className="text-2xl font-bold text-emerald-400">{userData.credits || 0}</div>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
        {(['general', 'brand', 'flows', 'assets'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 border-b-2 font-medium text-sm transition-all capitalize whitespace-nowrap ${
              activeTab === tab
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'general' ? 'General Profile' : tab === 'brand' ? 'Brand & Setup' : tab === 'flows' ? 'DM Automations' : 'Landing Pages'}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        
        {/* Tab 1: General Info */}
        {activeTab === 'general' && (
          <form onSubmit={handleUserSave} className="space-y-6 max-w-2xl glass-card border border-transparent rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
              <User className="text-blue-400" size={20} />
              <h3 className="text-lg font-semibold text-foreground">Core User Profile Info</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="e.g. Himanshu Nikam"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Subscription Plan</label>
                <select
                  value={userForm.plan}
                  onChange={(e) => setUserForm({ ...userForm, plan: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">Free</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Credits Balance</label>
                <input
                  type="number"
                  required
                  value={userForm.credits}
                  onChange={(e) => setUserForm({ ...userForm, credits: parseInt(e.target.value) || 0 })}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/20 p-4 rounded-xl border border-border">
              <input
                type="checkbox"
                id="isVerified"
                checked={userForm.isVerified}
                onChange={(e) => setUserForm({ ...userForm, isVerified: e.target.checked })}
                className="h-4 w-4 bg-background border border-border rounded text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="isVerified" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Mark User Account as Verified
              </label>
            </div>

            <div className="flex items-center gap-3 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
              <input
                type="checkbox"
                id="isBlocked"
                checked={userForm.isBlocked}
                onChange={(e) => setUserForm({ ...userForm, isBlocked: e.target.checked })}
                className="h-4 w-4 bg-background border border-border rounded text-red-500 focus:ring-red-500"
              />
              <label htmlFor="isBlocked" className="text-sm font-medium text-red-400 cursor-pointer select-none">
                Restrict / Block User Account Access
              </label>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Save size={16} /> Save Profile Changes
            </button>
          </form>
        )}

        {/* Tab 2: Brand Profile & Integrations */}
        {activeTab === 'brand' && (
          <form onSubmit={handleBrandSave} className="space-y-8 max-w-4xl">
            {/* Core Brand Details */}
            <div className="glass-card border border-transparent rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <Award className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-foreground">Brand Profile Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Brand Name</label>
                  <input
                    type="text"
                    value={brandForm.brandName}
                    onChange={(e) => setBrandForm({ ...brandForm, brandName: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="Brand Name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Social Handle</label>
                  <input
                    type="text"
                    value={brandForm.socialHandle}
                    onChange={(e) => setBrandForm({ ...brandForm, socialHandle: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="@socialhandle"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Website</label>
                  <input
                    type="text"
                    value={brandForm.website}
                    onChange={(e) => setBrandForm({ ...brandForm, website: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">City</label>
                    <input
                      type="text"
                      value={brandForm.city}
                      onChange={(e) => setBrandForm({ ...brandForm, city: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Country</label>
                    <input
                      type="text"
                      value={brandForm.country}
                      onChange={(e) => setBrandForm({ ...brandForm, country: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                      placeholder="Country"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Business Category</label>
                  <input
                    type="text"
                    value={brandForm.businessCategory}
                    onChange={(e) => setBrandForm({ ...brandForm, businessCategory: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="e.g. E-Commerce, Software, Creator"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Neural Agent State</label>
                  <select
                    value={brandForm.neuralState}
                    onChange={(e) => setBrandForm({ ...brandForm, neuralState: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                  >
                    <option value="Idle">Idle</option>
                    <option value="Auditing">Auditing</option>
                    <option value="Generating Content">Generating Content</option>
                    <option value="Active Pollers">Active Pollers</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Unique Selling Proposition (USP)</label>
                  <textarea
                    value={brandForm.usp}
                    onChange={(e) => setBrandForm({ ...brandForm, usp: e.target.value })}
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="Describe brand's core value proposition..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Brand Tone</label>
                    <input
                      type="text"
                      value={brandForm.brandTone}
                      onChange={(e) => setBrandForm({ ...brandForm, brandTone: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                      placeholder="e.g. Professional, Friendly, Bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Visual Vibe</label>
                    <input
                      type="text"
                      value={brandForm.visualVibe}
                      onChange={(e) => setBrandForm({ ...brandForm, visualVibe: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                      placeholder="e.g. Minimalist, Dark Neon, High Contrast"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Target Audiences (Comma separated)</label>
                    <input
                      type="text"
                      value={brandForm.targetAudiences}
                      onChange={(e) => setBrandForm({ ...brandForm, targetAudiences: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                      placeholder="Developers, Tech Savvy Teens, Small Businesses"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Competitors (Comma separated)</label>
                    <input
                      type="text"
                      value={brandForm.competitors}
                      onChange={(e) => setBrandForm({ ...brandForm, competitors: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:border-blue-500 focus:outline-none text-sm"
                      placeholder="CompetitorA, CompetitorB"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-muted/20 p-4 rounded-xl border border-border">
                  <input
                    type="checkbox"
                    id="DM_Automation_Service"
                    checked={brandForm.DM_Automation_Service}
                    onChange={(e) => setBrandForm({ ...brandForm, DM_Automation_Service: e.target.checked })}
                    className="h-4 w-4 bg-background border border-border rounded text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="DM_Automation_Service" className="text-sm font-medium text-foreground cursor-pointer select-none">
                    Enable Agent DM Automation Engine
                  </label>
                </div>
              </div>
            </div>

            {/* Social & Channel Connections */}
            <div className="glass-card border border-transparent rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <Layers className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-foreground">Integrations & Credentials Override</h3>
              </div>

              {/* Instagram */}
              <div className="p-4 bg-muted/10 rounded-xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Radio className="text-pink-500" size={18} />
                    Instagram Integration
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={brandForm.instagramIsConnected}
                      onChange={(e) => setBrandForm({ ...brandForm, instagramIsConnected: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
                
                {brandForm.instagramIsConnected && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">IG Username</label>
                      <input
                        type="text"
                        value={brandForm.instagramUsername}
                        onChange={(e) => setBrandForm({ ...brandForm, instagramUsername: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">IG Account ID</label>
                      <input
                        type="text"
                        value={brandForm.instagramUserId}
                        onChange={(e) => setBrandForm({ ...brandForm, instagramUserId: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">IG Access Token</label>
                      <input
                        type="text"
                        value={brandForm.instagramAccessToken}
                        onChange={(e) => setBrandForm({ ...brandForm, instagramAccessToken: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Gmail */}
              <div className="p-4 bg-muted/10 rounded-xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Mail className="text-red-500" size={18} />
                    Gmail Connection
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={brandForm.gmailIsConnected}
                      onChange={(e) => setBrandForm({ ...brandForm, gmailIsConnected: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
                
                {brandForm.gmailIsConnected && (
                  <div className="grid grid-cols-1 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Connected Email</label>
                      <input
                        type="email"
                        value={brandForm.gmailEmail}
                        onChange={(e) => setBrandForm({ ...brandForm, gmailEmail: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div className="p-4 bg-muted/10 rounded-xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Smartphone className="text-green-500" size={18} />
                    WhatsApp Business API
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={brandForm.whatsappIsConnected}
                      onChange={(e) => setBrandForm({ ...brandForm, whatsappIsConnected: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
                
                {brandForm.whatsappIsConnected && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">WhatsApp Number</label>
                      <input
                        type="text"
                        value={brandForm.whatsappNumber}
                        onChange={(e) => setBrandForm({ ...brandForm, whatsappNumber: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                        placeholder="+919876543210"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Phone ID</label>
                      <input
                        type="text"
                        value={brandForm.whatsappPhoneId}
                        onChange={(e) => setBrandForm({ ...brandForm, whatsappPhoneId: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Access Token</label>
                      <input
                        type="text"
                        value={brandForm.whatsappAccessToken}
                        onChange={(e) => setBrandForm({ ...brandForm, whatsappAccessToken: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Save size={16} /> Save Brand Settings
            </button>
          </form>
        )}

        {/* Tab 3: DM Automations */}
        {activeTab === 'flows' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <Bot className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-foreground">Active Automation Flows</h3>
              </div>
              <span className="text-sm text-muted-foreground">{flows.length} Flow(s) Registered</span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {flows.map((flow) => (
                <div key={flow._id} className="glass-card border border-transparent rounded-2xl p-5 shadow-sm space-y-4">
                  {editingFlowId === flow._id ? (
                    /* Edit Flow Sub-form */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="font-semibold text-foreground">Editing Flow ID: {flow._id}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleFlowSave(flow._id)}
                            className="p-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/25 transition-colors"
                            title="Save changes"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingFlowId(null)}
                            className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/25 transition-colors"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Flow Name</label>
                          <input
                            type="text"
                            value={flowForm.name}
                            onChange={(e) => setFlowForm({ ...flowForm, name: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Trigger Type</label>
                          <select
                            value={flowForm.trigger}
                            onChange={(e) => setFlowForm({ ...flowForm, trigger: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                          >
                            <option value="comment">Instagram Comment Reply</option>
                            <option value="story_reply">Story Reply/Mention</option>
                            <option value="dm_keyword">Direct Message Keyword</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Keyword (Triggers Flow)</label>
                          <input
                            type="text"
                            value={flowForm.keyword}
                            onChange={(e) => setFlowForm({ ...flowForm, keyword: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Comment Reply Override (Optional)</label>
                          <input
                            type="text"
                            value={flowForm.commentReplyMessage}
                            onChange={(e) => setFlowForm({ ...flowForm, commentReplyMessage: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                            placeholder="Sent directly under Instagram comment..."
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Direct Message Output Text</label>
                        <textarea
                          rows={3}
                          value={flowForm.messageText}
                          onChange={(e) => setFlowForm({ ...flowForm, messageText: e.target.value })}
                          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                          placeholder="Write the DM content copy here..."
                        />
                      </div>
                    </div>
                  ) : (
                    /* Display Flow Card */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-bold text-foreground">{flow.name || 'Unnamed Flow'}</h4>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20 uppercase tracking-wider font-semibold font-mono">
                              Trigger: {flow.trigger}
                            </span>
                            <span className="px-2 py-0.5 bg-pink-500/10 text-pink-400 text-xs rounded border border-pink-500/20 font-semibold font-mono">
                              Keyword: "{flow.keyword}"
                            </span>
                            {flow.active ? (
                              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20 font-semibold">Active</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 text-xs rounded border border-gray-500/20 font-semibold">Inactive</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleFlowToggleActive(flow)}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                              flow.active 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                            }`}
                          >
                            {flow.active ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleEditFlow(flow)}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors border border-border"
                            title="Edit Flow details"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleFlowDelete(flow._id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-border"
                            title="Delete Flow"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Message Preview */}
                      {flow.messages && flow.messages.length > 0 && (
                        <div className="p-3 bg-muted/20 border border-border/80 rounded-xl space-y-2">
                          <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Direct Message Copy</div>
                          <p className="text-sm text-foreground/90 whitespace-pre-line">{flow.messages[0].text}</p>
                          {flow.commentReplyMessage && (
                            <div className="border-t border-border/50 pt-2 mt-2">
                              <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Comment Reply Bubble</div>
                              <p className="text-xs text-muted-foreground italic mt-0.5">"{flow.commentReplyMessage}"</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Flow Performance Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/10 p-3.5 rounded-xl border border-border/50">
                        <div className="text-center">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">Triggered</div>
                          <div className="text-base font-bold text-foreground mt-0.5">{flow.stats?.triggered || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">Replies Sent</div>
                          <div className="text-base font-bold text-foreground mt-0.5">{flow.stats?.replied || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">Clicks</div>
                          <div className="text-base font-bold text-foreground mt-0.5">{flow.stats?.clicked || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] uppercase font-bold text-muted-foreground">Conversions</div>
                          <div className="text-base font-bold text-emerald-400 mt-0.5">{flow.stats?.conversions || 0}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {flows.length === 0 && (
                <div className="text-center py-10 glass-card border border-transparent rounded-2xl text-muted-foreground text-sm">
                  This user has no automation flows configured yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Generated Assets */}
        {activeTab === 'assets' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <Globe className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-foreground">AI Generated Micro-Pages</h3>
              </div>
              <span className="text-sm text-muted-foreground">{assets.length} Page(s) Generated</span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {assets.map((asset) => (
                <div key={asset._id} className="glass-card border border-transparent rounded-2xl p-5 shadow-sm space-y-4">
                  {editingAssetId === asset._id ? (
                    /* Edit Asset Sub-form */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="font-semibold text-foreground">Editing Page: {asset.slug}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAssetSave(asset._id)}
                            className="p-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/25 transition-colors"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingAssetId(null)}
                            className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/25 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Page Title</label>
                          <input
                            type="text"
                            value={assetForm.title}
                            onChange={(e) => setAssetForm({ ...assetForm, title: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">CTA Button Label</label>
                          <input
                            type="text"
                            value={assetForm.ctaText}
                            onChange={(e) => setAssetForm({ ...assetForm, ctaText: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground">CTA Redirect URL</label>
                          <input
                            type="text"
                            value={assetForm.ctaUrl}
                            onChange={(e) => setAssetForm({ ...assetForm, ctaUrl: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground">Meta Description</label>
                          <textarea
                            rows={2}
                            value={assetForm.description}
                            onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Primary Brand Color</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={assetForm.brandColor}
                              onChange={(e) => setAssetForm({ ...assetForm, brandColor: e.target.value })}
                              className="h-8 w-12 bg-background border border-border rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={assetForm.brandColor}
                              onChange={(e) => setAssetForm({ ...assetForm, brandColor: e.target.value })}
                              className="bg-background border border-border rounded px-2 py-1 text-xs w-28 font-mono text-foreground focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Secondary Brand Color</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={assetForm.brandSecondaryColor}
                              onChange={(e) => setAssetForm({ ...assetForm, brandSecondaryColor: e.target.value })}
                              className="h-8 w-12 bg-background border border-border rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={assetForm.brandSecondaryColor}
                              onChange={(e) => setAssetForm({ ...assetForm, brandSecondaryColor: e.target.value })}
                              className="bg-background border border-border rounded px-2 py-1 text-xs w-28 font-mono text-foreground focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-lg border border-border">
                        <input
                          type="checkbox"
                          id="isPublished"
                          checked={assetForm.isPublished}
                          onChange={(e) => setAssetForm({ ...assetForm, isPublished: e.target.checked })}
                          className="h-4 w-4 bg-background border border-border rounded text-blue-500 focus:ring-blue-500"
                        />
                        <label htmlFor="isPublished" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                          Publish Page (Visible publicly to users)
                        </label>
                      </div>
                    </div>
                  ) : (
                    /* Display Asset Card */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-bold text-foreground">{asset.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground font-mono">
                              /{brandProfile?.instagramUsername || 'brand'}/{asset.slug}
                            </span>
                            {asset.isPublished ? (
                              <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded border border-green-500/20 font-semibold uppercase">Published</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 text-[10px] rounded border border-gray-500/20 font-semibold uppercase">Draft</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditAsset(asset)}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors border border-border"
                            title="Edit landing page info"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleAssetDelete(asset._id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-border"
                            title="Delete page"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">{asset.description || 'No meta description provided.'}</p>

                      <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-border/50">
                        {/* Swatches */}
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: asset.brandColor || '#2563EB' }}></div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">{asset.brandColor}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: asset.brandSecondaryColor || '#60A5FA' }}></div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">{asset.brandSecondaryColor}</span>
                          </div>
                        </div>

                        {/* Views & Click Stats */}
                        <div className="flex gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Views:</span>{' '}
                            <span className="text-xs font-bold text-foreground">{asset.stats?.views || 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Clicks:</span>{' '}
                            <span className="text-xs font-bold text-foreground">{asset.stats?.ctaClicks || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {assets.length === 0 && (
                <div className="text-center py-10 glass-card border border-transparent rounded-2xl text-muted-foreground text-sm">
                  This user has no generated landing pages.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
