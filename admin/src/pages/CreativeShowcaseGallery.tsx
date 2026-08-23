import { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

type Item = { src: string; caption: string; tag: string; isVideo?: boolean };
type Formats = 'image' | 'carousel' | 'video' | 'ecomm' | 'festival';

export default function CreativeShowcaseGallery() {
  const [activeTab, setActiveTab] = useState<Formats>('image');
  const [gallery, setGallery] = useState<Record<Formats, Item[]>>({
    image: [],
    carousel: [],
    video: [],
    ecomm: [],
    festival: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api`;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.settings?.creativeShowcaseGallery) {
        setGallery({
          image: data.settings.creativeShowcaseGallery.image || [],
          carousel: data.settings.creativeShowcaseGallery.carousel || [],
          video: data.settings.creativeShowcaseGallery.video || [],
          ecomm: data.settings.creativeShowcaseGallery.ecomm || [],
          festival: data.settings.creativeShowcaseGallery.festival || [],
        });
      }
    } catch (error) {
      console.error('Error fetching showcase gallery settings', error);
      toast.error('Failed to load showcase settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ creativeShowcaseGallery: gallery })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Showcase saved successfully!');
      } else {
        toast.error('Failed to save showcase');
      }
    } catch (error) {
      console.error('Error saving showcase', error);
      toast.error('Failed to save showcase');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, field: keyof Item, value: string | boolean) => {
    const updated = [...gallery[activeTab]];
    updated[index] = { ...updated[index], [field]: value };
    setGallery({ ...gallery, [activeTab]: updated });
  };

  const addItem = () => {
    setGallery({
      ...gallery,
      [activeTab]: [...gallery[activeTab], { src: '', caption: '', tag: '', isVideo: false }]
    });
  };

  const removeItem = (index: number) => {
    const updated = [...gallery[activeTab]];
    updated.splice(index, 1);
    setGallery({ ...gallery, [activeTab]: updated });
  };

  const tabs: Formats[] = ['image', 'carousel', 'video', 'ecomm', 'festival'];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold">Creative Showcase</h1>
          <p className="text-muted-foreground mt-1">
            Manage the dynamic showcase gallery displayed on the public landing page.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all font-semibold"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[120px] px-6 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-black text-black bg-slate-50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="space-y-4">
              {gallery[activeTab].map((item, i) => (
                <div key={i} className="flex flex-wrap md:flex-nowrap gap-4 items-start p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-full md:w-32 shrink-0">
                    {item.src ? (
                      item.isVideo ? (
                        <video src={item.src} className="w-full h-24 object-cover rounded-lg bg-black" />
                      ) : (
                        <img src={item.src} alt="" className="w-full h-24 object-cover rounded-lg bg-slate-200" />
                      )
                    ) : (
                      <div className="w-full h-24 bg-slate-200 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        No Media
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Media URL</label>
                        <input
                          type="text"
                          value={item.src}
                          onChange={(e) => updateItem(i, 'src', e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div className="w-24 space-y-1 flex flex-col justify-end">
                        <label className="flex items-center gap-2 cursor-pointer py-2">
                          <input
                            type="checkbox"
                            checked={item.isVideo || false}
                            onChange={(e) => updateItem(i, 'isVideo', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm font-medium">Is Video?</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Caption</label>
                        <input
                          type="text"
                          value={item.caption}
                          onChange={(e) => updateItem(i, 'caption', e.target.value)}
                          placeholder="Short description"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div className="w-1/3 space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Tag (Pill)</label>
                        <input
                          type="text"
                          value={item.tag}
                          onChange={(e) => updateItem(i, 'tag', e.target.value)}
                          placeholder="e.g. 'Slide 1' or 'UGC'"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-6"
                    title="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              <button
                onClick={addItem}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-black hover:border-black transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <Plus className="w-5 h-5" /> Add Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
