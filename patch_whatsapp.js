const fs = require('fs');
const file = 'frontend/src/pages/dashboard/DashboardSettings.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace the commented out block with the component call
const blockStart = content.indexOf('{/* WhatsApp Connection */}');
const blockEnd = content.indexOf('                  {/* Danger Zone */}');
if (blockStart !== -1 && blockEnd !== -1) {
  content = content.substring(0, blockStart) + 
    '{/* WhatsApp Connection */}\n                  <WhatsAppConnectionCard profile={profile} setProfile={setProfile} />\n\n' +
    content.substring(blockEnd);
}

// 2. Add WhatsAppConnectionCard component at the bottom
const componentCode = `
// ── WhatsAppConnectionCard Component ──────────────────────────────────────────
const WhatsAppConnectionCard = ({ profile, setProfile }: { profile: any; setProfile: (p: any) => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
  const FB_APP_ID = import.meta.env.VITE_FB_APP_ID || '1491990322515220';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      toast({ title: 'Connection Failed', description: params.get('error_description') || 'Facebook login was cancelled.', variant: 'destructive' });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (code) {
      setLoading(true);
      const token = localStorage.getItem('token');
      const redirectUri = window.location.origin + window.location.pathname;

      fetch(\`\${apiBase}/whatsapp/callback\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({ code, isManualOAuth: true, redirectUri }),
      })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message || 'Connection failed');
        const updatedProfile = {
          ...profile,
          whatsappIsConnected: true,
          whatsappPhoneId: data.profile?.whatsappPhoneId || 'pending_setup',
          whatsappWABAId: data.profile?.whatsappWABAId || 'pending_setup',
          whatsappAccessToken: data.profile?.whatsappAccessToken || ''
        };
        setProfile(updatedProfile);
        localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
        toast({ title: '✅ WhatsApp Connected!', description: 'Your WhatsApp Business account is now linked.' });
      })
      .catch((err: any) => {
        toast({ title: 'Connection Failed', description: getFriendlyErrorMessage(err), variant: 'destructive' });
      })
      .finally(() => {
        setLoading(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, []);

  const launchManualOAuth = () => {
    setLoading(true);
    const redirectUri = window.location.origin + window.location.pathname;
    const scope = 'whatsapp_business_management,whatsapp_business_messaging';
    window.location.href = \`https://www.facebook.com/v21.0/dialog/oauth?client_id=\${FB_APP_ID}&redirect_uri=\${encodeURIComponent(redirectUri)}&scope=\${scope}&response_type=code\`;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(\`\${apiBase}/whatsapp/disconnect\`, {
        method: 'DELETE',
        headers: { 'Authorization': \`Bearer \${token}\` },
      });
      if (!res.ok) throw new Error('Failed to disconnect');

      const updatedProfile = {
        ...profile,
        whatsappIsConnected: false,
        whatsappPhoneId: '',
        whatsappAccessToken: '',
        whatsappWABAId: '',
      };
      setProfile(updatedProfile);
      localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
      toast({ title: 'Disconnected', description: 'WhatsApp Business account has been unlinked.' });
    } catch (err: any) {
      toast({ title: 'Error', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSavePhoneId = async (newPhoneId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(\`\${apiBase}/whatsapp/update-phone-id\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({ phoneId: newPhoneId }),
      });
      if (!res.ok) throw new Error('Failed to update Phone ID');
      
      const updatedProfile = { ...profile, whatsappPhoneId: newPhoneId };
      setProfile(updatedProfile);
      localStorage.setItem('syncsocio_profile', JSON.stringify(updatedProfile));
      toast({ title: 'Saved', description: 'WhatsApp Phone Number ID has been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: getFriendlyErrorMessage(err), variant: 'destructive' });
    }
  };

  if (profile.whatsappIsConnected) {
    const isPendingSetup = !profile.whatsappPhoneId || profile.whatsappPhoneId === 'pending_setup';
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-muted/30 border border-border/50">
        <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
          <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-tr from-[#128C7E] to-[#25D366] border border-green-500/30">
            <WhatsAppIcon size={28} className="text-white" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              WhatsApp Business API
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                Connected
              </span>
            </h3>
            
            {isPendingSetup ? (
              <div className="mt-2 flex items-center gap-2 max-w-sm">
                <Input 
                  id="wa-phone-id"
                  placeholder="Enter Phone Number ID..." 
                  className="h-8 text-xs font-mono bg-white"
                />
                <Button 
                  size="sm" 
                  className="h-8 text-xs px-3"
                  onClick={() => {
                    const input = document.getElementById('wa-phone-id') as HTMLInputElement;
                    if (input?.value) handleSavePhoneId(input.value.trim());
                  }}
                >
                  Save ID
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium truncate mt-1">
                Phone ID: <span className="font-mono text-slate-700">{profile.whatsappPhoneId}</span>
              </p>
            )}
            {isPendingSetup && (
              <p className="text-[10px] text-amber-600 mt-1">
                ⚠️ Required: Provide your Phone Number ID from the Meta Developer Dashboard to send messages.
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 shrink-0 h-10 w-full sm:w-auto mt-2 sm:mt-0"
        >
          {disconnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'DISCONNECT'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#128C7E]/5 to-[#25D366]/5 border border-green-500/20 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-gradient-to-br from-[#128C7E] to-[#25D366] rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity" />
      <div className="flex items-start gap-4 mb-5 relative z-10">
        <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-white shadow-md border border-green-500/20">
          <WhatsAppIcon size={24} className="text-[#25D366]" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
            WhatsApp Business API
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider">
              Not Connected
            </span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md">
            Connect your WhatsApp Business number to send bulk campaign blasts, promotional messages, and automated replies directly from SyncSocio.
          </p>
        </div>
      </div>
      <ul className="space-y-2 mb-6 text-xs text-slate-600 relative z-10 pl-1">
        <li className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          Send WhatsApp campaign blasts to your contacts
        </li>
        <li className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          Upload and attach creative images to messages
        </li>
      </ul>
      <Button
        onClick={launchManualOAuth}
        disabled={loading}
        className="w-full relative z-10 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-11 rounded-xl shadow-lg shadow-green-500/20 transition-all border-none"
      >
        {loading ? (
          <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> CONNECTING...</span>
        ) : (
          <span className="flex items-center gap-2">CONNECT</span>
        )}
      </Button>
    </div>
  );
};
`;

fs.writeFileSync(file, content + '\n' + componentCode);
console.log('Patch applied successfully!');
