// src/components/CustomerFeedbackModal.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { MessageSquarePlus, X, Send } from 'lucide-react';

export default function CustomerFeedbackModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ email: '', type: 'suggestion', message: '' });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from('customer_feedback').insert([{
      customer_email: form.email || 'Anonymous',
      feedback_type: form.type,
      message: form.message,
      status: 'open'
    }]);

    setSubmitting(false);
    if (error) {
      alert('Failed to submit: ' + error.message);
    } else {
      alert('Thank you! Your feedback has been submitted successfully.');
      setForm({ email: '', type: 'suggestion', message: '' });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageSquarePlus size={18} className="text-green-600" /> Send Feedback or Complaint
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500"><X size={18}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Your Email (Optional)</label>
            <input 
              type="email" placeholder="customer@example.com" 
              className="w-full border p-3 rounded-xl outline-none focus:border-green-600 bg-gray-50"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} 
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Feedback Type</label>
            <select 
              className="w-full border p-3 rounded-xl bg-gray-50 font-bold text-gray-700 outline-none cursor-pointer"
              value={form.type} onChange={e => setForm({...form, type: e.target.value})}
            >
              <option value="suggestion">💡 Suggestion</option>
              <option value="complaint">⚠️ Complaint</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Message</label>
            <textarea 
              rows="4" required placeholder="Describe your suggestion or issue..." 
              className="w-full border p-3 rounded-xl bg-gray-50 outline-none focus:border-green-600"
              value={form.message} onChange={e => setForm({...form, message: e.target.value})} 
            />
          </div>

          <button 
            type="submit" disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2"
          >
            <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}