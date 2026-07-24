import { useState, useEffect } from 'react';
import { Save, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function LandingGallery() {
  const [images, setImages] = useState<string[]>(Array(85).fill(''));
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.settings?.domeGalleryImages) {
        const fetchedImages = data.settings.domeGalleryImages;
        // Pad with empty strings up to 85 if needed
        const paddedImages = [...fetchedImages];
        while (paddedImages.length < 85) {
          paddedImages.push('');
        }
        setImages(paddedImages.slice(0, 85)); // Ensure exactly 85
      }
    } catch (error) {
      console.error('Error fetching gallery settings', error);
      toast.error('Failed to load gallery settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      // filter out entirely empty strings if you want, or just save them all
      // We will save exactly what's there
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ domeGalleryImages: images })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Gallery saved successfully!');
      } else {
        toast.error('Failed to save gallery');
      }
    } catch (error) {
      console.error('Error saving gallery', error);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const updateImage = (index: number, url: string) => {
    const newImages = [...images];
    newImages[index] = url;
    setImages(newImages);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Landing Page Gallery</h1>
          <p className="text-muted-foreground mt-1">
            Manage the 85 images displayed in the Dome Gallery on the home page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSettings}
            disabled={loading || saving}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
          <p>Loading gallery slots...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {images.map((url, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Slot {i + 1}</span>
              </div>
              <div className="aspect-video w-full bg-secondary/30 rounded-lg overflow-hidden border border-border flex items-center justify-center">
                {url ? (
                  <img src={url} alt={`Slot ${i+1}`} className="w-full h-full object-cover" onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x225?text=Invalid+Image';
                  }} />
                ) : (
                  <span className="text-xs text-muted-foreground">No image</span>
                )}
              </div>
              <input
                type="text"
                placeholder="Cloudinary URL..."
                value={url}
                onChange={(e) => updateImage(i, e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
