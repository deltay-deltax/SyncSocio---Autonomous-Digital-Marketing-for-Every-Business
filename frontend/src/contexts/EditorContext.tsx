import React, { createContext, useContext, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export type Uploaded = { url: string; name: string; base64?: string; info?: string; aspectRatio?: string } | null;

interface EditorContextType {
  refImage: Uploaded;
  setRefImage: React.Dispatch<React.SetStateAction<Uploaded>>;
  prodImage: Uploaded;
  setProdImage: React.Dispatch<React.SetStateAction<Uploaded>>;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  result: string | null;
  setResult: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  unread: boolean;
  setUnread: React.Dispatch<React.SetStateAction<boolean>>;
  freeEditUsed: boolean;
  setFreeEditUsed: React.Dispatch<React.SetStateAction<boolean>>;
  handleGenerate: (isEdit?: boolean) => Promise<void>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [refImage, setRefImage] = useState<Uploaded>(null);
  const [prodImage, setProdImage] = useState<Uploaded>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const [freeEditUsed, setFreeEditUsed] = useState(false);

  const handleGenerate = async (isEdit: boolean = false) => {
    if (!prompt.trim() || !refImage) {
      toast({
        title: "Missing fields",
        description: "Please provide a reference image and an instruction.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setUnread(false);
    try {
      
      const response = await fetch(`${API_BASE}/ai/edit-product-image`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          },
        body: JSON.stringify({
          ref_image: refImage.base64,
          prod_image: prodImage?.base64 || "",
          prod_info: prodImage?.info || "",
          instruction: prompt,
          aspectRatio: refImage.aspectRatio || "1:1",
          isEdit: isEdit,
        })
      });
      
      const _rawJson8 = await response.json();
        const data = _rawJson8 && _rawJson8.success !== undefined ? (_rawJson8.success ? _rawJson8.data : _rawJson8) : _rawJson8;
      if (!response.ok) throw new Error(data.error || 'Failed to generate image');
      
      const imageSrc = data.image ? (data.image.startsWith('data:') || data.image.startsWith('http') ? data.image : `data:image/jpeg;base64,${data.image}`) : null;
      setResult(imageSrc);

      // Update credit display instantly in the layout
      if (data.credits !== undefined) {
        localStorage.setItem('syncsocio_credits', String(data.credits));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'syncsocio_credits',
          newValue: String(data.credits),
        }));
      }
      
      // If the user has navigated away from the Editor page, set unread indicator
      if (!window.location.pathname.includes('/dashboard/editor')) {
        setUnread(true);
      }
      
      if (isEdit) {
        setFreeEditUsed(true);
      } else {
        setFreeEditUsed(false); // Reset on new generation
      }
      
      toast({
        title: "AI Editor generation complete! 🎉",
        description: "Your product shot has been generated successfully.",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Generation Failed",
        description: e.message || "An error occurred during generation.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <EditorContext.Provider value={{
      refImage,
      setRefImage,
      prodImage,
      setProdImage,
      prompt,
      setPrompt,
      result,
      setResult,
      loading,
      setLoading,
      unread,
      setUnread,
      freeEditUsed,
      setFreeEditUsed,
      handleGenerate
    }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used within EditorProvider');
  return context;
};
