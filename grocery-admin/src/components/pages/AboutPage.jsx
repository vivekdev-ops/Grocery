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
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col w-full selection:bg-emerald-500 selection:text-white">
      <StoreHeader session={session} customerProfile={customerProfile} showSearch={false} />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-10 md:space-y-12 w-full">
        {loading ? (
          <div className="py-28 text-center flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-emerald-600" size={22} />
            <span className="text-stone-500 font-bold text-sm">Loading About Us...</span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-[2.5rem] p-8 md:p-16 text-white shadow-xl space-y-5 text-center relative overflow-hidden w-full">
            <div className="absolute right-[-30px] bottom-[-30px] opacity-10 pointer-events-none">
              <Sparkles size={240} />
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 font-black text-[10px] md:text-xs px-4 py-1.5 rounded-full border border-emerald-500/30 uppercase tracking-widest">
              {pageData?.title || 'About KD Store'}
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Delivering Freshness in Minutes</h1>
            <p className="text-emerald-100 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
              {descriptionText}
            </p>
          </div>
        )}

        {/* Core Values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6 w-full">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200/80 shadow-xs space-y-3 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Zap size={24} />
            </div>
            <h3 className="font-black text-stone-900 text-sm md:text-base">13-Min Delivery</h3>
            <p className="text-stone-500 text-[11px] md:text-xs leading-relaxed">Lightning-fast inventory dispatch right to your doorstep.</p>
          </div>
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200/80 shadow-xs space-y-3 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200 shadow-2xs">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-black text-stone-900 text-sm md:text-base">Quality Assured</h3>
            <p className="text-stone-500 text-[11px] md:text-xs leading-relaxed">Rigorous hygiene and freshness checks for all essentials.</p>
          </div>
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200/80 shadow-xs space-y-3 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200 shadow-2xs">
              <HeartHandshake size={24} />
            </div>
            <h3 className="font-black text-stone-900 text-sm md:text-base">Local Support</h3>
            <p className="text-stone-500 text-[11px] md:text-xs leading-relaxed">Empowering local shopkeepers with advanced tools.</p>
          </div>
        </div>

        {/* Team Section */}
        <div className="space-y-6 pt-4 w-full">
          <div className="text-center space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
              Our Leadership
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-stone-900 mt-2">Meet the Team</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white rounded-3xl border border-stone-200/80 p-6 md:p-8 shadow-xs text-center space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-emerald-100 bg-stone-100 shadow-md">
                    <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-black text-stone-900 text-base md:text-lg">{member.name}</h3>
                    <p className="text-xs text-emerald-700 font-extrabold">{member.designation}</p>
                  </div>
                </div>
                <p className="text-xs text-stone-600 font-medium bg-stone-50 p-4 rounded-2xl border border-stone-100/80 leading-relaxed">
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