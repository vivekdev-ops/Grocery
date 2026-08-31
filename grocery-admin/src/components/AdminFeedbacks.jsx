// src/components/AdminFeedbacks.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MessageSquare, Star, Trash2, LifeBuoy, Search, Sparkles, Cpu } from 'lucide-react';

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('complaints'); // 'complaints' or 'general'
  const [searchQuery, setSearchQuery] = useState('');
  
  // AI Sentiment & Summary State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer_feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFeedbacks(data);
      generateAiInsights(data);
    }
    setLoading(false);
  };

  const generateAiInsights = (data) => {
    setAiAnalyzing(true);
    setTimeout(() => {
      const complaints = data.filter(f => f.category === 'order_support');
      const ratings = data.filter(f => f.category !== 'order_support').map(f => Number(f.rating || 5));
      const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 5.0;

      let primaryIssue = 'None detected';
      if (complaints.length > 0) {
        const textBlob = complaints.map(c => c.comments?.toLowerCase() || '').join(' ');
        if (textBlob.includes('damaged') || textBlob.includes('defective')) primaryIssue = 'Damaged/Defective item packaging';
        else if (textBlob.includes('missing')) primaryIssue = 'Missing items from delivery batches';
        else primaryIssue = 'Fulfillment speed & delivery tracking delays';
      }

      setAiSummary({
        sentiment: avg >= 4.0 ? 'Overwhelmingly Positive 🟢' : avg >= 3.0 ? 'Neutral / Stable 🟡' : 'Requires Attention 🔴',
        priorityAction: complaints.filter(c => c.status === 'open').length > 0 ? 'Resolve pending order support tickets immediately to maintain SLA.' : 'All support tickets are currently cleared.',
        topConcern: primaryIssue
      });
      setAiAnalyzing(false);
    }, 600);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('customer_feedbacks').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setFeedbacks(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } else {
      alert("Error updating status: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    const { error } = await supabase.from('customer_feedbacks').delete().eq('id', id);
    if (!error) setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  const complaintsList = feedbacks.filter(f => f.category === 'order_support');
  const generalList = feedbacks.filter(f => f.category !== 'order_support');
  const openComplaintsCount = complaintsList.filter(c => c.status === 'open' || !c.status).length;

  const activeList = activeTab === 'complaints' ? complaintsList : generalList;
  const filteredList = activeList.filter(item => 
    item.comments?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-xs">
      
      {/* AI Intelligence Hub Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-6 rounded-3xl text-white border border-emerald-800/60 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
              <Cpu size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                AI Customer Sentiment & Complaint Hub <Sparkles size={16} className="text-amber-400 fill-amber-400" />
              </h2>
              <p className="text-[11px] text-emerald-300/80">Automated triage for order support tickets and store feedback diagnostics.</p>
            </div>
          </div>
          <button 
            onClick={fetchFeedbacks}
            className="bg-emerald-800/60 hover:bg-emerald-800 text-emerald-200 px-4 py-2 rounded-xl font-bold transition cursor-pointer border border-emerald-700/50"
          >
            Refresh Diagnostics
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-emerald-950/70 p-3.5 rounded-2xl border border-emerald-800/50 backdrop-blur-md space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Overall Sentiment</span>
            <p className="font-black text-white text-sm">{aiAnalyzing ? 'Analyzing...' : aiSummary?.sentiment}</p>
          </div>
          <div className="bg-emerald-950/70 p-3.5 rounded-2xl border border-emerald-800/50 backdrop-blur-md space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Top Reported Concern</span>
            <p className="font-bold text-emerald-100 text-xs truncate">{aiAnalyzing ? 'Scanning...' : aiSummary?.topConcern}</p>
          </div>
          <div className="bg-emerald-950/70 p-3.5 rounded-2xl border border-emerald-800/50 backdrop-blur-md space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block">Recommended AI Action</span>
            <p className="font-bold text-emerald-100 text-xs truncate">{aiAnalyzing ? 'Computing...' : aiSummary?.priorityAction}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('complaints')}
            className={`px-4 py-2.5 rounded-2xl font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'complaints' ? 'bg-teal-700 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <LifeBuoy size={15} /> Order Support Complaints {openComplaintsCount > 0 && <span className="bg-rose-600 text-white text-[10px] px-2 py-0.2 rounded-full font-bold">{openComplaintsCount}</span>}
          </button>

          <button 
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 rounded-2xl font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'general' ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <MessageSquare size={15} /> General Store Reviews ({generalList.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input 
            type="text" 
            placeholder="Search keywords, email, or subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs font-medium outline-none text-slate-900 shadow-2xs focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <p className="text-slate-400 text-xs py-16 text-center font-bold">Loading records...</p>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-2xs space-y-2">
          <p className="text-slate-800 text-sm font-black">No records found in this section.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map(item => {
            const isOrderSupport = item.category === 'order_support';

            return (
              <div 
                key={item.id} 
                className={`bg-white p-5 rounded-3xl border shadow-xs transition hover:shadow-md flex flex-col justify-between space-y-3 ${
                  isOrderSupport && (!item.status || item.status === 'open') ? 'border-teal-300 ring-1 ring-teal-300/50 bg-teal-50/10' : 'border-slate-200/80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border ${
                        isOrderSupport ? 'bg-teal-100 text-teal-900 border-teal-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {isOrderSupport ? 'Order Support Ticket' : (item.category || 'General')}
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-2 truncate max-w-[220px]">{item.user_email || 'Anonymous'}</p>
                    </div>

                    {isOrderSupport ? (
                      <select
                        value={item.status || 'open'}
                        onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                        className={`border rounded-xl px-3 py-1.5 text-[11px] font-black cursor-pointer outline-none shadow-2xs ${
                          item.status === 'resolved' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 text-amber-800 text-xs font-black shadow-2xs">
                        <Star size={12} className="fill-amber-500 text-amber-500" /> {item.rating}/5
                      </div>
                    )}
                  </div>

                  {item.subject && <h4 className="font-black text-slate-900 text-xs">{item.subject}</h4>}

                  <p className="text-xs text-slate-700 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 font-medium leading-relaxed">
                    "{item.comments}"
                  </p>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-3 border-t border-slate-100 mt-2 font-mono">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <div className="flex items-center gap-3">
                    {isOrderSupport && (
                      <span className={`font-black uppercase px-2.5 py-0.5 rounded-md ${
                        item.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status || 'open'}
                      </span>
                    )}
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition p-1"
                      title="Delete record"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}