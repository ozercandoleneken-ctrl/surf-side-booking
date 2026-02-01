
import React, { useState, useMemo, useEffect } from 'react';
import { UserData, ActivityType, Booking, BookingStatus } from './types';
import { ACTIVITIES, TIME_SLOTS, getCalendarMonthDays, TURKISH_MONTHS, formatDateYYYYMMDD } from './constants';
import { saveBooking, getBookings, getInstructorSettings, InstructorSetting } from './storage';

interface BookingFlowProps {
  step: 1 | 2 | 3;
  userData: UserData | null;
  onStep1Submit: (data: UserData) => void;
  onComplete: () => void;
  onReset: () => void;
}

const BookingFlow: React.FC<BookingFlowProps> = ({ step, userData, onStep1Submit, onComplete, onReset }) => {
  const [formData, setFormData] = useState<UserData>({ fullName: '', phone: '', email: '' });
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [instructorSettings, setInstructorSettings] = useState<InstructorSetting[]>([]);

  const refreshData = async () => {
    const [b, s] = await Promise.all([getBookings(), getInstructorSettings()]);
    setExistingBookings(b);
    setInstructorSettings(s);
  };

  useEffect(() => {
    if (step === 2) refreshData();
  }, [step]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanData = {
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim()
    };

    if (!cleanData.fullName || !cleanData.phone || !cleanData.email) {
      alert("Lütfen tüm zorunlu alanları eksiksiz doldurunuz.");
      return;
    }

    onStep1Submit(cleanData);
  };

  const getSlotAvailability = (date: string, time: string, dur: number, currentBookings: Booking[]) => {
    if (!date || !time || !selectedActivity) return true;
    const qualifiedInstructors = instructorSettings.filter(inst => 
      inst.specialties.includes(selectedActivity)
    );
    const totalCapacity = qualifiedInstructors.length;
    if (totalCapacity === 0) return false;

    const startH = parseInt(time.split(':')[0]);
    const endH = startH + dur;

    for (let h = startH; h < endH; h++) {
      const busyQualifiedCount = currentBookings.filter(b => {
        if (b.date !== date || b.status !== BookingStatus.CONFIRMED || !b.instructorName) return false;
        const isQualified = qualifiedInstructors.some(qi => qi.name === b.instructorName);
        if (!isQualified) return false;
        const bStart = parseInt(b.time.split(':')[0]);
        const bEnd = bStart + b.duration;
        return h >= bStart && h < bEnd;
      }).length;
      if (busyQualifiedCount >= totalCapacity) return false;
    }
    return true;
  };

  const handleFinalSubmit = async () => {
    if (!userData || !selectedActivity || !selectedDate || !selectedTime) return;
    
    setIsSubmitting(true);
    
    // Final check before saving to avoid race conditions
    const latestBookings = await getBookings();
    const stillAvailable = getSlotAvailability(selectedDate, selectedTime, duration, latestBookings);
    
    if (!stillAvailable) {
      alert("Üzgünüz, seçtiğiniz saat dilimi az önce doldu. Lütfen başka bir saat seçiniz.");
      await refreshData();
      setIsSubmitting(false);
      setSelectedTime('');
      return;
    }

    const newBooking: Booking = {
      id: '',
      user: userData,
      activity: selectedActivity,
      date: selectedDate,
      time: selectedTime,
      duration,
      status: BookingStatus.PENDING,
      createdAt: Date.now()
    };

    try {
      await saveBooking(newBooking);
      setIsSubmitting(false);
      onComplete();
    } catch (error) {
      console.error("Booking error:", error);
      alert("Bir hata oluştu, lütfen tekrar deneyin.");
      setIsSubmitting(false);
    }
  };

  const calendarDays = useMemo(() => getCalendarMonthDays(calendarDate), [calendarDate]);

  if (step === 1) {
    return (
      <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-sm mx-auto">
        <div className="p-5 md:p-8">
          <h2 className="text-lg md:text-2xl font-black text-slate-900 mb-4 md:mb-6 uppercase tracking-tighter">Kişisel Bilgiler</h2>
          <form onSubmit={handleStep1Submit} className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">
                Ad Soyad <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.fullName}
                onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">
                Telefon <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="tel"
                placeholder="05xx xxx xx xx"
                className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-700 mb-1 uppercase tracking-widest">
                E-posta <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="email"
                placeholder="ahmet@email.com"
                className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white text-xs md:text-sm font-black uppercase tracking-widest py-3 md:py-4 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all mt-4"
            >
              Devam Et
            </button>
          </form>
          <p className="mt-4 text-[9px] text-slate-400 text-center font-medium uppercase tracking-tighter">
            <span className="text-rose-500">*</span> İşaretli alanların doldurulması zorunludur.
          </p>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4 md:space-y-8">
        <div className="grid grid-cols-3 gap-2 md:gap-6">
          {ACTIVITIES.map(activity => (
            <button
              key={activity.id}
              onClick={() => {
                setSelectedActivity(activity.name as ActivityType);
                setSelectedTime('');
              }}
              className={`p-2 md:p-6 rounded-xl md:rounded-2xl border-2 text-center md:text-left transition-all ${
                selectedActivity === activity.name 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 shadow-xl' 
                  : 'border-white bg-white hover:border-blue-100 shadow-md'
              } group flex flex-col items-center md:items-start`}
            >
              <div className={`p-1.5 md:p-3 rounded-lg md:rounded-xl inline-block mb-1 md:mb-4 transition-colors ${
                selectedActivity === activity.name ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100'
              }`}>
                <div className="scale-50 md:scale-100 origin-center">{activity.icon}</div>
              </div>
              <h3 className="text-[8px] md:text-xl font-black text-slate-900 leading-tight uppercase tracking-tighter truncate w-full">{activity.name}</h3>
            </button>
          ))}
        </div>

        {selectedActivity && (
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl p-3 md:p-8 border border-slate-100">
            <h2 className="text-sm md:text-2xl font-black text-slate-900 mb-3 md:mb-6 uppercase tracking-tighter">Zaman Çizelgesi</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
              <div className="space-y-3">
                <label className="block text-[8px] md:text-sm font-black text-slate-700 uppercase tracking-widest">Gün Seçimi</label>
                <div className="border border-slate-100 rounded-xl md:rounded-2xl overflow-hidden shadow-sm bg-white">
                   <div className="flex items-center justify-between p-2 md:p-4 bg-slate-50/50 border-b border-slate-100">
                      <button 
                        onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() - 1)))} 
                        className="p-2 md:p-3 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-600 active:scale-90"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <span className="font-black text-xs md:text-base text-slate-800 uppercase tracking-tight">{TURKISH_MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
                      <button 
                        onClick={() => setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + 1)))} 
                        className="p-2 md:p-3 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-600 active:scale-90"
                      >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                      </button>
                   </div>
                   <div className="p-1 md:p-2 bg-white">
                     <div className="grid grid-cols-7 mb-1">
                        {['Pt', 'Sl', 'Çr', 'Pr', 'Cm', 'Ct', 'Pz'].map(d => (
                          <div key={d} className="p-1 text-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                        ))}
                     </div>
                     <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                          const dateString = day ? formatDateYYYYMMDD(day) : '';
                          const isSelected = selectedDate === dateString;
                          const todayStr = formatDateYYYYMMDD(new Date());
                          const isToday = dateString === todayStr;
                          const isPast = day && day < new Date(new Date().setHours(0,0,0,0));

                          return (
                            <button
                              key={idx}
                              disabled={!day || isPast}
                              onClick={() => day && setSelectedDate(dateString)}
                              className={`aspect-square flex items-center justify-center text-[10px] md:text-sm font-bold rounded-lg md:rounded-xl transition-all relative ${
                                isSelected 
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 z-10 scale-105' 
                                  : isToday 
                                    ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' 
                                    : 'text-slate-700 hover:bg-slate-100'
                              } ${!day || isPast ? 'opacity-10 cursor-not-allowed' : ''}`}
                            >
                              {day?.getDate()}
                            </button>
                          );
                        })}
                     </div>
                   </div>
                </div>
              </div>

              <div className="space-y-6 md:space-y-10">
                <div>
                   <label className="block text-[8px] md:text-sm font-black text-slate-700 mb-2 md:mb-4 uppercase tracking-widest">Süre Seçimi</label>
                   <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-fit">
                      {[1, 2].map(d => (
                        <button 
                          key={d}
                          onClick={() => {
                            setDuration(d as 1 | 2);
                            setSelectedTime(''); 
                          }}
                          className={`flex-1 sm:px-8 py-2 md:py-3 rounded-lg text-[10px] md:text-sm font-black transition-all ${duration === d ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          {d} Saatlik
                        </button>
                      ))}
                   </div>
                </div>

                <div>
                  <label className="block text-[8px] md:text-sm font-black text-slate-700 mb-2 md:mb-4 uppercase tracking-widest">Müsait Saatler</label>
                  <div className="grid grid-cols-4 sm:grid-cols-3 gap-1.5 md:gap-3">
                    {TIME_SLOTS.map(slot => {
                      const isAvailable = getSlotAvailability(selectedDate, slot, duration, existingBookings);
                      return (
                        <button
                          key={slot}
                          disabled={!selectedDate || !isAvailable}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2 md:py-4 px-1 md:px-3 text-[10px] md:text-sm font-black rounded-lg md:rounded-xl border transition-all active:scale-95 ${
                            selectedTime === slot
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100'
                              : isAvailable 
                                ? 'border-slate-200 text-slate-600 hover:border-blue-400 bg-white'
                                : 'border-slate-50 text-slate-200 bg-slate-50/50 cursor-not-allowed'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-100 flex items-center justify-between gap-4 md:gap-6">
              <button 
                onClick={onReset} 
                className="px-4 md:px-6 py-2 md:py-4 text-slate-400 font-black uppercase text-[10px] md:text-xs tracking-widest hover:text-slate-800 transition-colors"
              >
                Geri Dön
              </button>
              <button
                disabled={!selectedDate || !selectedTime || isSubmitting}
                onClick={handleFinalSubmit}
                className={`flex-1 py-3 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[11px] md:text-sm tracking-widest text-white transition-all shadow-xl active:scale-95 ${
                  !selectedDate || !selectedTime || isSubmitting
                    ? 'bg-slate-200 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
              >
                {isSubmitting ? 'Gönderiliyor...' : 'Talebi Tamamla'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-16 text-center max-w-sm md:max-w-lg mx-auto">
      <div className="w-16 h-16 md:w-24 md:h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
        <svg className="w-8 h-8 md:w-14 md:h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 className="text-xl md:text-3xl font-black text-slate-900 mb-2 md:mb-4 tracking-tighter uppercase">İşlem Tamam!</h2>
      <p className="text-[10px] md:text-base text-slate-500 font-bold mb-8 md:mb-10 leading-tight">
        Rezervasyon talebiniz operasyon ekibimize iletildi. En kısa sürede onay bilgisi gönderilecektir.
      </p>
      <button onClick={onReset} className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-sm tracking-widest hover:bg-slate-800 transition-all shadow-lg">Ana Sayfaya Dön</button>
    </div>
  );
};

export default BookingFlow;
