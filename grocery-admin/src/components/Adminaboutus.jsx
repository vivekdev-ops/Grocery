// src/components/AdminAboutUs.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FileText, Loader2, Save } from 'lucide-react';

export default function AdminAboutUs() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'about_us')
        .maybeSingle();

      if (data) {
        setContent(data.value || '');
      }
    } catch (err) {
      console.error('Error fetching About Us content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'about_us', value: content }, { onConflict: 'key' });

      if (error) throw error;
      alert('About Us page updated successfully!');
    } catch (err) {
      console.error('Error saving About Us content:', err);
      alert('Failed to update: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-2">
        <Loader2 className="animate-spin text-emerald-600" size={24} />
        <span className="text-stone-500 font-bold text-xs">Loading About Us editor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-xs text-stone-800 pb-16 max-w-4xl">
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText size={18} className="text-emerald-600" /> About Us Page Manager
          </h1>
          <p className="text-[11px] text-stone-400 font-medium">Manage the content displayed on your storefront's About Us page.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-2xs">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px]">
              Page Content (HTML or Plain Text)
            </label>
            <textarea
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your company background, mission, and vision here..."
              className="w-full p-4 border border-stone-200 rounded-2xl bg-stone-50/50 outline-none focus:border-emerald-500 font-medium text-stone-800 text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 py-3 rounded-2xl shadow-md transition cursor-pointer flex items-center gap-2 uppercase tracking-wider text-xs disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* update*/