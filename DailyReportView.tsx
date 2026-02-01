
import React, { useState, useEffect } from 'react';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Booking, BookingStatus } from './types';
import { getInstructorSettings, InstructorSetting } from './storage';
import { TIME_SLOTS, formatFullDateTurkish, ACTIVITIES, formatDateYYYYMMDD } from './constants';

interface DailyReportViewProps {
  date: string;
}

const DailyReportView: React.FC<DailyReportViewProps> = ({ date: initialDate }) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [instructors, setInstructors] = useState<InstructorSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    const isStandalone = window.location.search.includes('view=report');
    if (isStandalone) {
      const url = new URL(window.location.href);
      url.searchParams.set('date', currentDate);
      window.history.replaceState({}, '', url.toString());
    }

    const qBookings = query(
      collection(db, 'bookings'), 
      where('date', '==', currentDate), 
      where('status', '==', BookingStatus.CONFIRMED)
    );
    
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const bData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
      setBookings(bData);
    });

    const loadSettings = async () => {
      const s = await getInstructorSettings();
      setInstructors(s);
      setLoading(false);
    };
    loadSettings();

    return () => unsubBookings();
  }, [currentDate]);

  const changeDate = (days: number) => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setCurrentDate(formatDateYYYYMMDD(d));
  };

  const isStandalone = window.location.search.includes('view=report');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-blue-100">
      {/* Header Area */}
      <header className="px-6 py-8 md:py-12 text-center border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button 
            onClick={() => changeDate(-1)} 
            className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-90 text-slate-400 hover:text-blue-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-blue-600 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Surf Side Urla • Günlük Akış</span>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-slate-900">
              {formatFullDateTurkish(currentDate).split(',')[0]}
            </h1>
            <p className="text-slate-500 text-xs font-bold mt-2 tracking-widest bg-slate-100 px-4 py-1 rounded-full border border-slate-200">
              {currentDate.split('-').reverse().join(' / ')}
            </p>
          </div>

          <button 
            onClick={() => changeDate(1)} 
            className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-90 text-slate-400 hover:text-blue-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </header>

      {/* Grid Container */}
      <main className="flex-1 overflow-auto p-4 md:p-10">
        <div 
          className="min-w-max border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl bg-white"
          style={{ 
            display: 'grid',
            gridTemplateColumns: `80px repeat(${instructors.length}, 240px)`,
            gap: '1px', 
            backgroundColor: '#e2e8f0' /* slate-200 */
          }}
        >
          {/* Header Corner */}
          <div className="bg-slate-50 p-4 sticky left-0 z-40 border-b border-r border-slate-200 flex items-center justify-center">
             <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          
          {/* Instructor Column Headers */}
          {instructors.map(inst => (
            <div key={inst.name} className="bg-slate-50 p-6 text-center border-b border-slate-200 shadow-inner">
              <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{inst.name}</span>
            </div>
          ))}

          {/* Time and Activity Slots */}
          {TIME_SLOTS.map((time, idx) => (
            <React.Fragment key={time}>
              {/* Hour Indicator */}
              <div className={`p-4 flex items-center justify-center border-r border-slate-200 sticky left-0 z-30 backdrop-blur-md ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <span className="text-xs font-black text-slate-400">{time}</span>
              </div>
              
              {/* Cells per Instructor */}
              {instructors.map(inst => {
                const booking = bookings.find(b => b.time === time && b.instructorName === inst.name);
                const isContinuation = bookings.some(b => {
                  const prevH = (parseInt(time.split(':')[0]) - 1).toString().padStart(2, '0') + ':00';
                  return b.instructorName === inst.name && b.time === prevH && b.duration === 2;
                });
                const actInfo = booking ? ACTIVITIES.find(a => a.name === booking.activity) : null;

                return (
                  <div key={inst.name + time} className={`relative h-28 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    {booking ? (
                      <div 
                        className={`absolute inset-2 z-20 rounded-2xl p-4 flex flex-col border-l-4 shadow-md transition-all hover:shadow-lg ${actInfo?.lightBg || 'bg-slate-50'} ${actInfo?.textColor || 'text-slate-900'}`}
                        style={{ 
                          height: booking.duration === 2 ? 'calc(200% + 2px)' : 'calc(100% - 16px)', 
                          zIndex: booking.duration === 2 ? 35 : 25,
                          borderLeftColor: 'currentColor',
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                           <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{booking.activity}</span>
                           <span className="text-[9px] font-black px-1.5 py-0.5 bg-white/60 border border-current/10 rounded-md">{booking.duration}H</span>
                        </div>
                        <div className="text-[16px] md:text-[18px] font-black text-slate-900 leading-[1.1] uppercase tracking-tighter mb-1 line-clamp-2">
                          {booking.user.fullName}
                        </div>
                        {booking.duration === 2 && (
                          <div className="mt-auto flex items-center gap-1.5 opacity-40">
                             <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                             <span className="text-[8px] font-black uppercase">Blok Ders</span>
                          </div>
                        )}
                      </div>
                    ) : isContinuation ? null : (
                      <div className="w-full h-full flex items-center justify-center opacity-10">
                        <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="py-16 text-center border-t border-slate-200 bg-white">
        <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.6em]">
          <span>#SURFSIDEURLA</span>
          <span className="w-1 h-1 rounded-full bg-blue-500"></span>
          <span>PROGRAM AKIŞI</span>
        </div>
      </footer>

      {/* Standalone Action Button */}
      {isStandalone && (
        <button 
          onClick={() => window.location.href = window.location.origin + window.location.pathname}
          className="fixed bottom-8 right-8 z-[100] bg-slate-900 text-white hover:bg-blue-600 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95"
        >
          Panele Dön
        </button>
      )}
    </div>
  );
};

export default DailyReportView;
