import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Briefcase, ShieldAlert, Cpu, Share2, Server } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BrandDeepConfig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;
        const res = await axios.get(`${API}/brands/${id}/deep-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setBrand(res.data.brand);
        }
      } catch (error) {
        toast.error('Failed to load Deep Config');
      } finally {
        setLoading(false);
      }
    };
    fetchBrand();
  }, [id]);

  const handleUnlock = async () => {
    if (!window.confirm('Are you sure you want to reset the lockout limits for this brand?')) return;
    try {
      setUnlocking(true);
      const token = localStorage.getItem('adminToken');
      const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;
      const res = await axios.post(`${API}/brands/${id}/unlock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success('Brand unlocked successfully');
        setBrand({ ...brand, isLocked: false, generationLockoutUntil: null });
      }
    } catch (error) {
      toast.error('Failed to unlock brand');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-gray-500">Loading Deep Config...</div>;
  }

  if (!brand) {
    return <div className="p-8 text-center text-red-500">Failed to load brand data.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/brands')} className="flex items-center text-gray-500 hover:text-gray-900 transition text-sm font-medium">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Brands
      </button>

      <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
        {brand.logo ? (
          <img src={brand.logo} alt="Logo" className="w-16 h-16 rounded-lg border shadow-sm object-contain bg-white" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-blue-50 border flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-blue-500" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{brand.brandName}</h1>
          <p className="text-gray-500 text-sm">Deep Configuration & System Diagnostics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-500" /> Brand DNA</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Category:</span> <div className="font-medium text-gray-900">{brand.businessCategory || 'N/A'}</div></div>
            <div><span className="text-gray-500">Tone:</span> <div className="font-medium text-gray-900">{brand.brandTone || 'N/A'}</div></div>
            <div><span className="text-gray-500">Vibe:</span> <div className="font-medium text-gray-900">{brand.visualVibe || 'N/A'}</div></div>
            <div><span className="text-gray-500">Keywords:</span> <div className="font-medium text-gray-900">{brand.brandKeywords || 'N/A'}</div></div>
          </div>
        </div>

        {/* Audience & Positioning */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Share2 className="w-5 h-5 text-pink-500" /> Audience & Positioning</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Target Audience:</span> <div className="font-medium text-gray-900">{brand.targetAudiences?.join(', ') || 'N/A'}</div></div>
            <div><span className="text-gray-500">Age & Gender:</span> <div className="font-medium text-gray-900">{brand.ageRange || 'Any'} • {brand.genderFocus || 'Any'}</div></div>
            <div className="col-span-2"><span className="text-gray-500">Pain Point:</span> <div className="font-medium text-gray-900 truncate" title={brand.painPoint}>{brand.painPoint || 'N/A'}</div></div>
            <div className="col-span-2"><span className="text-gray-500">Unique Selling Prop (USP):</span> <div className="font-medium text-gray-900 truncate" title={brand.usp}>{brand.usp || 'N/A'}</div></div>
          </div>
        </div>

        {/* Nexa Configuration */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Cpu className="w-5 h-5 text-emerald-500" /> Nexa Engine Settings</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Nexa Enabled:</span> <div className="font-medium">{brand.nexa?.nexa_enabled ? <span className="text-green-600">Active</span> : 'Disabled'}</div></div>
            <div><span className="text-gray-500">Neural State:</span> <div className="font-medium text-gray-900">{brand.neuralState || 'Idle'}</div></div>
            <div><span className="text-gray-500">Payments:</span> <div className="font-medium text-gray-900">{brand.nexa?.razorpay_connected ? 'Razorpay Connected' : brand.nexa?.cod_enabled ? 'COD Only' : 'Not setup'}</div></div>
            <div><span className="text-gray-500">Learnings:</span> <div className="font-medium text-gray-900">{brand.agentLearnings?.length || 0} insights</div></div>
          </div>
        </div>

        {/* Content Strategy */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-orange-500" /> Content Strategy</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Main Goal:</span> <div className="font-medium text-gray-900">{brand.mainGoal || 'N/A'}</div></div>
            <div><span className="text-gray-500">Primary CTA:</span> <div className="font-medium text-gray-900">{brand.primaryCTA || 'N/A'}</div></div>
            <div className="col-span-2"><span className="text-gray-500">Content Pillars:</span> <div className="font-medium text-gray-900">{brand.contentTypes?.join(', ') || 'N/A'}</div></div>
            <div className="col-span-2">
              <span className="text-gray-500">Predicted Mix:</span> 
              <div className="flex gap-4 mt-1">
                <div className="text-center bg-gray-50 px-3 py-1 rounded">Reels<br/><span className="font-bold">{brand.predictedMix?.reels || 0}%</span></div>
                <div className="text-center bg-gray-50 px-3 py-1 rounded">Static<br/><span className="font-bold">{brand.predictedMix?.static || 0}%</span></div>
                <div className="text-center bg-gray-50 px-3 py-1 rounded">Carousel<br/><span className="font-bold">{brand.predictedMix?.carousel || 0}%</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Design System */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Briefcase className="w-5 h-5 text-purple-500" /> Design System</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Typography:</span> <div className="font-medium text-gray-900">{brand.typography || 'N/A'}</div></div>
            <div>
              <span className="text-gray-500">Brand Colors:</span> 
              <div className="flex gap-2 mt-1">
                {brand.primaryColor && <div className="w-6 h-6 rounded border" style={{ backgroundColor: brand.primaryColor }} title={brand.primaryColor}></div>}
                {brand.secondaryColor && <div className="w-6 h-6 rounded border" style={{ backgroundColor: brand.secondaryColor }} title={brand.secondaryColor}></div>}
              </div>
            </div>
          </div>
        </div>

        {/* Email DNS Configuration */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Server className="w-5 h-5 text-blue-500" /> Infrastructure & DNS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Email Domain:</span> 
              <div className="font-medium text-gray-900 mt-1">{brand.email_domain || 'Not configured'}</div>
              {brand.email_domain_verified ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Verified via SendGrid</span>
              ) : (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Pending / Unverified</span>
              )}
            </div>
            <div>
              <span className="text-gray-500">Instagram Access:</span> 
              <div className="font-medium text-gray-900 mt-1">
                {brand.instagramIsConnected ? <span className="text-green-600">Token Active</span> : 'Disconnected'}
              </div>
            </div>
            <div>
              <span className="text-gray-500">WhatsApp API:</span> 
              <div className="font-medium text-gray-900 mt-1">
                {brand.whatsappIsConnected ? <span className="text-green-600">WABA Connected</span> : 'Disconnected'}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Generation Limit:</span> 
              <div className="font-medium text-gray-900 mt-1 flex items-center gap-2">
                {brand.isLocked ? <span className="text-red-600 font-bold">Locked Out</span> : 'Active'} ({brand.generationCount || 0} runs)
                {brand.isLocked && (
                  <button 
                    onClick={handleUnlock}
                    disabled={unlocking}
                    className="ml-2 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    {unlocking ? 'Unlocking...' : 'Unlock Now'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
