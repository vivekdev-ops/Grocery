// src/components/TestimonialManager.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MessageSquareQuote, Trash2, Plus, Star } from 'lucide-react';

export default function TestimonialManager() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ customer_name: '', review: '', rating: 5, role: 'Verified Customer' });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setTestimonials(data || []);
    setLoading(false);
  };

  const handleAddTestimonial = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('testimonials').insert([form]);
    if (error) {
      alert('Failed to add testimonial: ' + error.message);
    } else {
      setForm({ customer_name: '', review: '', rating: 5, role: 'Verified Customer' });
      fetchTestimonials();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('testimonials').delete().eq('id', id);
    if (!error) fetchTestimonials();
  };

  if (loading) return <div className="text-center py-8 text-gray-500 font-medium">Loading testimonials...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Testimonials Management</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage customer reviews displayed on the storefront.</p>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAddTestimonial} className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Plus size={16} /> Add New Testimonial</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
            <input 
              type="text" required 
              className="w-full border p-2.5 rounded-xl text-sm bg-gray-50"
              value={form.customer_name} 
              onChange={e => setForm({...form, customer_name: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role / Subtitle</label>
            <input 
              type="text" 
              className="w-full border p-2.5 rounded-xl text-sm bg-gray-50"
              value={form.role} 
              onChange={e => setForm({...form, role: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rating (1-5)</label>
            <input 
              type="number" min="1" max="5" required 
              className="w-full border p-2.5 rounded-xl text-sm bg-gray-50"
              value={form.rating} 
              onChange={e => setForm({...form, rating: Number(e.target.value)})} 
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Review Text</label>
          <textarea 
            rows="2" required 
            className="w-full border p-2.5 rounded-xl text-sm bg-gray-50"
            value={form.review} 
            onChange={e => setForm({...form, review: e.target.value})} 
          />
        </div>
        <button type="submit" className="bg-[#0c831f] hover:bg-[#0b6f1a] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition">
          Add Testimonial
        </button>
      </form>

      {/* Testimonials List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testimonials.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{item.customer_name}</h4>
                  <p className="text-xs text-gray-400">{item.role}</p>
                </div>
                <div className="flex text-amber-400">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-600 italic">"{item.review}"</p>
            </div>
            <div className="mt-4 pt-3 border-t flex justify-end">
              <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}