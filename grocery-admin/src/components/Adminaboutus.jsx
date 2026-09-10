// src/components/AdminAboutUs.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Save, FileText, Plus, Trash2, Upload } from 'lucide-react';

export default function AdminAboutUs() {
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutDescription, setAboutDescription] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [savingAbout, setSavingAbout] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('store_pages')
      .select('*')
      .eq('page_key', 'about_us')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAboutTitle(data.title || '');
          try {
            const parsedContent = JSON.parse(data.content);
            setAboutDescription(parsedContent.description || data.content || '');
            setTeamMembers(Array.isArray(parsedContent.team) ? parsedContent.team : []);
          } catch {
            setAboutDescription(data.content || '');
            setTeamMembers([
              {
                name: 'Vivek Kumar Tiwari',
                designation: 'Founder & CEO',
                image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                bio: 'Visionary leader driving core architecture.'
              }
            ]);
          }
        }
        setLoading(false);
      });
  }, []);

  const handleAddTeamMember = () => {
    setTeamMembers(prev => [
      ...prev,
      { name: '', designation: '', image: '', bio: '' }
    ]);
  };

  const handleTeamMemberChange = (index, field, value) => {
    setTeamMembers(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleImageUpload = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      handleTeamMemberChange(index, 'image', base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTeamMember = (index) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAboutUs = async (e) => {
    e.preventDefault();
    setSavingAbout(true);

    const payloadContent = JSON.stringify({
      description: aboutDescription,
      team: teamMembers
    });

    const { error } = await supabase.from('store_pages').upsert({
      page_key: 'about_us',
      title: aboutTitle,
      content: payloadContent,
      updated_at: new Date()
    }, { onConflict: 'page_key' });

    if (!error) {
      alert('About Us page updated successfully!');
    } else {
      alert('Error: ' + error.message);
    }
    setSavingAbout(false);
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-emerald-600" size={18} />
        <span className="text-stone-500 font-bold text-xs">Loading panel...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveAboutUs} className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200/80 shadow-2xs space-y-6 text-xs max-w-4xl w-full mx-auto">
      <div className="flex items-center gap-2.5 border-b border-stone-100 pb-4">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="font-black text-sm text-stone-900">Manage About Us Page</h3>
          <p className="text-[11px] text-stone-400 font-medium">Update hero text, description, and team member profiles.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px]">Page Badge / Title</label>
          <input 
            type="text" 
            required
            className="w-full border border-stone-200 rounded-2xl p-3.5 bg-stone-50 outline-none focus:border-emerald-500 font-bold text-stone-900" 
            value={aboutTitle} 
            onChange={e => setAboutTitle(e.target.value)} 
            placeholder="e.g. About KD Store"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-black text-stone-700 uppercase tracking-wider text-[10px]">Main Description / Hero Text</label>
          <textarea 
            rows="4" 
            required
            className="w-full border border-stone-200 rounded-2xl p-3.5 bg-stone-50 font-medium text-stone-900 outline-none focus:border-emerald-500 resize-none leading-relaxed" 
            value={aboutDescription} 
            onChange={e => setAboutDescription(e.target.value)} 
            placeholder="Enter the main mission statement..."
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-stone-100">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-stone-900 uppercase tracking-wider text-[11px]">Team Members</h4>
          <button 
            type="button" 
            onClick={handleAddTeamMember}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black px-3.5 py-2 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Team Member
          </button>
        </div>

        <div className="space-y-4">
          {teamMembers.map((member, index) => (
            <div key={index} className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3 relative">
              <div className="flex justify-between items-center">
                <span className="font-bold text-stone-700">Team Member #{index + 1}</span>
                <button 
                  type="button" 
                  onClick={() => handleRemoveTeamMember(index)}
                  className="text-rose-500 hover:text-rose-700 p-1 rounded-lg cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={member.name} 
                    onChange={e => handleTeamMemberChange(index, 'name', e.target.value)}
                    className="w-full border border-stone-200 rounded-xl p-2.5 bg-white font-bold"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Designation</label>
                  <input 
                    type="text" 
                    required
                    value={member.designation} 
                    onChange={e => handleTeamMemberChange(index, 'designation', e.target.value)}
                    className="w-full border border-stone-200 rounded-xl p-2.5 bg-white font-bold"
                    placeholder="Designation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Team Member Photo</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      required
                      value={member.image} 
                      onChange={e => handleTeamMemberChange(index, 'image', e.target.value)}
                      className="flex-1 border border-stone-200 rounded-xl p-2.5 bg-white font-medium truncate"
                      placeholder="Image URL or browse..."
                    />
                    <label className="bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-2.5 rounded-xl font-bold cursor-pointer transition shrink-0 inline-flex items-center gap-1">
                      <Upload size={13} /> Browse
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(index, e)} className="hidden" />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-stone-600 mb-1">Bio / Description</label>
                  <input 
                    type="text" 
                    value={member.bio} 
                    onChange={e => handleTeamMemberChange(index, 'bio', e.target.value)}
                    className="w-full border border-stone-200 rounded-xl p-2.5 bg-white font-medium"
                    placeholder="Short bio"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={savingAbout} 
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-3.5 rounded-2xl cursor-pointer transition shadow-md shadow-emerald-600/25 flex items-center gap-2 uppercase tracking-wider active:scale-95"
      >
        {savingAbout ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        {savingAbout ? 'Saving...' : 'Save All Changes'}
      </button>
    </form>
  );
}