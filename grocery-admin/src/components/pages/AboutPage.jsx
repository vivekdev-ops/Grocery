// src/components/pages/AboutPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import StoreHeader from '../store/StoreHeader';
import Footer from '../Footer';
import { Sparkles, Zap, ShieldCheck, HeartHandshake, Loader2 } from 'lucide-react';

export default function AboutPage() {
  const [session, setSession] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setCustomerProfile(data);
          });
      }
    });

    supabase.from('store_pages').select('*').eq('page_key', 'about_us').maybeSingle().then(({ data }) => {
      if (data) {
        setPageData(data);
        try {
          const parsedContent = JSON.parse(data.content);
          setTeamMembers(Array.isArray(parsedContent.team) ? parsedContent.team : []);
        } catch {
          setTeamMembers([
            {
              name: 'Vivek Kumar Tiwari',
              designation: 'Founder & CEO',
              image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
              bio: 'Visionary leader driving the core architecture and hyper-local quick commerce strategy.'
            }
          ]);
        }
      }
      setLoading(false);
    });
  }, []);

  const descriptionText = (() => {
    if (!pageData?.content) return 'KD Store is your trusted hyper-local quick commerce platform...';
    try {
      const parsed = JSON.parse(pageData.content);
      return parsed.description || pageData.content;
    } catch {
      return pageData.content;
    }
  })();

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col">
      <StoreHeader session={session} customerProfile={customerProfile} showSearch={false} />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 space-y-10 w-full">
        {loading ? (
          <div className="py-20 text-center flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-emerald-600" size={20} />
            <span className="text-stone-500 font-bold">Loading About Us...</span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-8 md:p-12 text-white shadow-xl space-y-4 text-center relative overflow-hidden">
            <div className="absolute right-[-30px] bottom-[-30px] opacity-10 pointer-events-none">
              <Sparkles size={220} />
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 font-black text-[10px] px-3.5 py-1.5 rounded-full border border-emerald-500/30 uppercase tracking-widest">
              {pageData?.title || 'About KD Store'}
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Delivering Freshness in Minutes</h1>
            <p className="text-emerald-100 text-xs md:text-sm max-w-xl mx-auto leading-relaxed whitespace-pre-line">
              {descriptionText}
            </p>
          </div>
        )}

        {/* Core Values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-2 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
              <Zap size={22} />
            </div>
            <h3 className="font-black text-stone-900 text-sm">13-Min Delivery</h3>
            <p className="text-stone-500 text-[11px]">Lightning-fast inventory dispatch right to your doorstep.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-2 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
              <ShieldCheck size={22} />
            </div>
            <h3 className="font-black text-stone-900 text-sm">Quality Assured</h3>
            <p className="text-stone-500 text-[11px]">Rigorous hygiene and freshness checks for all essentials.</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-2 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
              <HeartHandshake size={22} />
            </div>
            <h3 className="font-black text-stone-900 text-sm">Local Support</h3>
            <p className="text-stone-500 text-[11px]">Empowering local shopkeepers with advanced tools.</p>
          </div>
        </div>

        {/* Team Section */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Our Leadership
            </span>
            <h2 className="text-2xl font-black text-stone-900 mt-2">Meet the Team</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-2xs text-center space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-emerald-100 bg-stone-100">
                    <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-black text-stone-900 text-sm">{member.name}</h3>
                    <p className="text-[11px] text-emerald-700 font-extrabold mt-0.5">{member.designation}</p>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 font-medium bg-stone-50 p-3 rounded-2xl border border-stone-100">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}