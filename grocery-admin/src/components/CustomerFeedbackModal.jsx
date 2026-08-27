// src/components/CustomerFeedbackModal.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { X, MessageSquarePlus, CheckCircle, Star } from 'lucide-react';

export default function CustomerFeedbackModal({ isOpen, onClose }) {
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, category: 'General', comments: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase.from('customer_feedbacks').insert([{
      user_id: session ? session.user.id : null,
      user_email: session ? session.user.email : 'Anonymous',
      rating: Number(feedbackForm.rating),
      category: feedbackForm.category,
      comments: feedbackForm.comments
    }]);

    setSubmitting(false);

    if (!error) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFeedbackForm({ rating: 5, category: 'General', comments: '' });
        onClose();
      }, 2000);
    } else {
      alert("Error sending feedback: " + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
            <MessageSquarePlus size={20} className="text-emerald-600" /> Help Us Improve
          </h3>
          <button onClick={onClose} className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition text-slate-600">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle size={32} />
            </div>
            <h4 className="font-black text-slate-900 text-lg">Thank You!</h4>
            <p className="text-xs text-slate-500">Your feedback has been successfully recorded.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Category</label>
              <select 
                value={feedbackForm.category}
                onChange={e => setFeedbackForm({...feedbackForm, category: e.target.value})}
                className="w-full border border-slate-200 p-3 rounded-2xl bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="General">General Experience</option>
                <option value="Delivery">Delivery Speed & Service</option>
                <option value="Product">Product Quality & Pricing</option>
                <option value="App">App Bug or Feature Request</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Rating</label>
              <select 
                value={feedbackForm.rating}
                onChange={e => setFeedbackForm({...feedbackForm, rating: e.target.value})}
                className="w-full border border-slate-200 p-3 rounded-2xl bg-slate-50 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="5">⭐⭐⭐⭐⭐ (5/5 - Loved It)</option>
                <option value="4">⭐⭐⭐⭐ (4/5 - Good)</option>
                <option value="3">⭐⭐⭐ (3/5 - Average)</option>
                <option value="2">⭐⭐ (2/5 - Needs Work)</option>
                <option value="1">⭐ (1/5 - Poor Experience)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Comments & Suggestions</label>
              <textarea 
                rows="4"
                placeholder="Tell us what you like or what we can improve..."
                required
                value={feedbackForm.comments}
                onChange={e => setFeedbackForm({...feedbackForm, comments: e.target.value})}
                className="w-full border border-slate-200 p-3 rounded-2xl bg-slate-50 outline-none resize-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-600/25 transition duration-200 uppercase tracking-wider text-xs active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Send Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}