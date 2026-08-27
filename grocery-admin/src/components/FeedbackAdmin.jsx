// src/components/AdminFeedbacks.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MessageSquare, Star, Trash2, Filter, BarChart2, TrendingUp, AlertCircle, CheckCircle, Search } from 'lucide-react';

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRating, setSelectedRating] = useState('All');

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
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this feedback?")) return;
    const { error } = await supabase.from('customer_feedbacks').delete().eq('id', id);
    if (!error) {
      setFeedbacks(prev => prev.filter(f => f.id !== id));
    }
  };

  // --- ANALYZER & METRICS CALCULATIONS ---
  const totalCount = feedbacks.length;
  const avgRating = totalCount > 0 ? (feedbacks.reduce((sum, f) => sum + Number(f.rating), 0) / totalCount).toFixed(1) : 0;
  
  const categoriesCount = feedbacks.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});

  const topCategory = Object.keys(categoriesCount).reduce((a, b) => categoriesCount[a] > categoriesCount[b] ? a : b, 'General');

  // Simple Keyword Extractor / Analyzer for common customer comment terms
  const getKeywordsAnalysis = () => {
    const textBlob = feedbacks.map(f => f.comments.toLowerCase()).join(' ');
    const commonWords = ['delivery', 'fast', 'good', 'price', 'quality', 'fresh', 'app', 'bad', 'slow', 'packing'];
    const counts = {};
    commonWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = textBlob.match(regex);
      if (matches) counts[word] = matches.length;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  const keywordTrends = getKeywordsAnalysis();

  // --- FILTERED FEEDBACKS ---
  const filteredFeedbacks = feedbacks.filter(item => {
    const matchesSearch = item.comments.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesRating = selectedRating === 'All' || String(item.rating) === String(selectedRating);
    return matchesSearch && matchesCategory && matchesRating;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <MessageSquare size={22} className="text-emerald-600" /> Customer Feedback & Intelligence Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Analyze live customer sentiment, satisfaction metrics, and feedback reports.</p>
        </div>
        <button 
          onClick={fetchFeedbacks}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs"
        >
          Refresh Data
        </button>
      </div>

      {/* 1. Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Submissions</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <Star size={24} className="fill-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average Rating</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{avgRating} <span className="text-xs font-medium text-slate-400">/ 5</span></h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Top Focus Area</p>
            <h3 className="text-base font-black text-slate-900 mt-1 truncate max-w-[180px]">{topCategory}</h3>
          </div>
        </div>
      </div>

      {/* 2. Sentiment Analyzer Banner */}
      {feedbacks.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-700">
          <div>
            <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">Automated Analyzer</span>
            <h3 className="font-black text-base sm:text-lg mt-1 tracking-tight">Trending Customer Keywords</h3>
            <p className="text-xs text-slate-400 mt-0.5">Most frequent terms mentioned across customer comments:</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywordTrends.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Gathering keyword data...</span>
            ) : (
              keywordTrends.map(([word, count], idx) => (
                <span key={idx} className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 shadow-inner">
                  <span className="text-emerald-400 capitalize">#{word}</span> 
                  <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-md">{count}</span>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Filters & Search Controls Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search keywords or user email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Category:</span>
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="General">General Experience</option>
              <option value="Delivery">Delivery</option>
              <option value="Product">Product</option>
              <option value="App">App Bug</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
            <Star size={14} className="text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-slate-600">Rating:</span>
            <select 
              value={selectedRating} 
              onChange={e => setSelectedRating(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Feedback Cards Grid */}
      {loading ? (
        <p className="text-slate-400 text-xs py-16 text-center font-bold">Loading feedbacks...</p>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-2xs space-y-2">
          <MessageSquare className="mx-auto text-slate-300" size={40} />
          <p className="text-slate-800 text-sm font-black">No matching feedback found.</p>
          <p className="text-slate-400 text-xs">Try clearing your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeedbacks.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3 relative flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                      {item.category}
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-2">{item.user_email || 'Anonymous'}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 text-amber-800 text-xs font-black shadow-2xs">
                    <Star size={12} className="fill-amber-500 text-amber-500" /> {item.rating}/5
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-medium leading-relaxed">
                  "{item.comments}"
                </p>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-3 border-t border-slate-100 mt-2">
                <span className="font-mono">{new Date(item.created_at).toLocaleString()}</span>
                <button 
                  onClick={() => handleDelete(item.id)} 
                  className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 transition"
                >
                  <Trash2 size={12} /> Delete Record
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}