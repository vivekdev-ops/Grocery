// src/components/TestimonialsSection.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Star, MessageSquareQuote } from 'lucide-react';

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    supabase.from('testimonials').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setTestimonials(data);
    });
  }, []);

  if (testimonials.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">What Our Customers Say</h2>
        <p className="text-xs text-gray-500 mt-1">Real reviews from valued shoppers at Harraiya Super Market.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <MessageSquareQuote size={28} className="text-[#0c831f] opacity-80" />
              <p className="text-xs text-gray-700 font-medium leading-relaxed">"{item.review}"</p>
            </div>
            <div className="flex justify-between items-end pt-4 border-t border-gray-100">
              <div>
                <p className="font-bold text-xs text-gray-900">{item.customer_name}</p>
                <p className="text-[10px] text-gray-400">{item.role}</p>
              </div>
              <div className="flex text-amber-400">
                {[...Array(item.rating)].map((_, i) => (
                  <Star key={i} size={12} fill="currentColor" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}