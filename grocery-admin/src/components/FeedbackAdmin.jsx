// src/components/FeedbackAdmin.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MessageSquare, CheckCircle, AlertCircle, Filter } from 'lucide-react';

export default function FeedbackAdmin() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all', 'complaint', 'suggestion'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setFeedbacks(data);
    setLoading(false);
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'resolved' : 'open';
    const { error } = await supabase
      .from('customer_feedback')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) alert(error.message);
    else fetchFeedbacks();
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filterType === 'all') return true;
    return f.feedback_type === filterType;
  });

  if (loading) return <div className="text-center py-20 text-gray-500 font-medium">Loading feedback...</div>;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <MessageSquare className="text-green-600" size={24} /> Customer Complaints & Suggestions
          </h2>
          <p className="text-xs text-gray-500 mt-1">Review feedback submitted by customers and track resolution status.</p>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border text-xs">
          <Filter size={14} className="text-gray-400" />
          <select 
            className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer"
            value={filterType} onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">All Feedback ({feedbacks.length})</option>
            <option value="complaint">Complaints Only</option>
            <option value="suggestion">Suggestions Only</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden p-6">
        {filteredFeedbacks.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-xs italic">No feedback records found.</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredFeedbacks.map(item => (
              <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-black uppercase text-[10px] ${
                      item.feedback_type === 'complaint' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.feedback_type}
                    </span>
                    <span className="text-gray-400">• {new Date(item.created_at).toLocaleString()}</span>
                    <span className="font-bold text-gray-700">From: {item.customer_email}</span>
                  </div>
                  <p className="text-gray-800 font-medium text-sm pt-1">{item.message}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] ${
                    item.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.status}
                  </span>
                  <button 
                    onClick={() => handleToggleStatus(item.id, item.status)}
                    className="bg-white border hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl font-bold transition shadow-2xs"
                  >
                    {item.status === 'open' ? 'Mark Resolved' : 'Reopen'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}