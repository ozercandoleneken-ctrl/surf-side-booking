
import React, { useState, useEffect } from 'react';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Booking, BookingStatus, ActivityType } from './types';
import { 
  updateBookingStatus, 
  updateBookingInstructor, saveBooking, updateBooking,
  getInstructorSettings, InstructorSetting
} from './storage';
import { TIME_SLOTS, formatFullDateTurkish, ACTIVITIES, formatDateYYYYMMDD } from './constants';
import DailyReportView from './DailyReportView';

const AdminDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [scheduleDate, setScheduleDate] = useState<string>(formatDateYYYYMMDD(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ instructor: string, time: string } | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [instructorSettings, setInstructorSettings] = useState<InstructorSetting[]>([]);
  const [manualFormData, setManualFormData] = useState({ fullName: '', phone: '', activity: ActivityType.KITESURF, duration: 1 as 1 | 2 });
  const [copyStatus, setCopyStatus] = useState(false);

  useEffect(() => {
    const qBookings = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const bData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
      setBookings(bData);
    });

    const loadSettings = async () => {
      const s = await getInstructorSettings();
      setInstructorSettings(s);
    };
    loadSettings();

    return () => unsubBookings();
  }, []);

  const changeDate = (days: number) => {
    const d = new Date(scheduleDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setScheduleDate(formatDateYYYYMMDD(d));
  };

  const isInstructorBusy = (instructorName: string, date: string, time: string, duration: number, excludeId?: string) => {
    const startH = parseInt(time.split(':')[0]);
    const endH = startH + duration;
    
    return bookings.some(b => {
      // Sadece aynı gündeki ONAYLI rezervasyonları kontrol et
      if (b.id === excludeId || b.date !== date || b.instructorName !== instructorName || b.status !== BookingStatus.CONFIRMED) return false;
      
      const bStart = parseInt(b.time.split(':')[0]);
      const bEnd = bStart + b.duration;
      
      // Zaman çakışması kontrolü (Overlap)
      return Math.max(startH, bStart) < Math.min(endH, bEnd);
    });
  };

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    await updateBookingStatus(id, status);
  };

  const handleInstructorChange = async (id: string, instructorName: string, booking: Booking) => {
    if (!instructorName) {
      await updateBookingInstructor(id, '');
      return;
    }

    if (isInstructorBusy(instructorName, booking.date, booking.time, booking.duration, id)) {
      alert(`DİKKAT: ${instructorName} bu tarihte (${booking.date}) ve saatte (${booking.time}) başka bir onaylı rezervasyona sahip!`);
      return;
    }
    await updateBookingInstructor(id, instructorName);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const cleanFullName = manualFormData.fullName.trim();
    const cleanPhone = manualFormData.phone.trim();

    if (!cleanFullName || !cleanPhone) {
      alert("Lütfen ad soyad ve telefon bilgilerini giriniz.");
      return;
    }

    // Çakışma kontrolü
    if (isInstructorBusy(selectedSlot.instructor, scheduleDate, selectedSlot.time, manualFormData.duration)) {
      alert(`HATA: ${selectedSlot.instructor} seçilen zaman diliminde meşgul!`);
      return;
    }

    const newBooking: Booking = {
      id: '',
      user: { fullName: cleanFullName, phone: cleanPhone, email: 'manuel@kayit.com' },
      activity: manualFormData.activity,
      date: scheduleDate,
      time: selectedSlot.time,
      duration: manualFormData.duration,
      status: BookingStatus.CONFIRMED,
      instructorName: selectedSlot.instructor,
      createdAt: Date.now()
    };
    await saveBooking(newBooking);
    setIsModalOpen(false);
    setManualFormData({ fullName: '', phone: '', activity: ActivityType.KITESURF, duration: 1 });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBooking) {
      const cleanFullName = editingBooking.user.fullName.trim();
      const cleanPhone = editingBooking.user.phone.trim();

      if (!cleanFullName || !cleanPhone) {
        alert("Ad Soyad ve Telefon alanları boş bırakılamaz.");
        return;
      }

      // Çakışma kontrolü (Kendi ID'sini hariç tutarak)
      if (editingBooking.instructorName && isInstructorBusy(editingBooking.instructorName, editingBooking.date, editingBooking.time, editingBooking.duration, editingBooking.id)) {
        alert(`ÇAKIŞMA UYARISI: ${editingBooking.instructorName} seçilen yeni tarihte veya saatte meşgul! Lütfen eğitmeni veya saati değiştiriniz.`);
        return;
      }
      
      const updatedBooking = {
        ...editingBooking,
        user: { ...editingBooking.user, fullName: cleanFullName, phone: cleanPhone }
      };

      await updateBooking(updatedBooking);
      setIsEditModalOpen(false);
    }
  };

  const copyReportLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const reportUrl = `${baseUrl}?view=report&date=${scheduleDate}`;
    navigator.clipboard.writeText(reportUrl);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const actionableBookings = bookings.filter(b => 
    b.status === BookingStatus.PENDING || (b.status === BookingStatus.CONFIRMED && !b.instructorName)
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-0 space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operasyon Merkezi</h1>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">Ekip ve Akış Yönetimi</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsPreviewOpen(true)} className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border border-slate-200">Önizleme</button>
            <button onClick={copyReportLink} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${copyStatus ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 border border-blue-600'}`}>
              {copyStatus ? 'Link Kopyalandı' : 'Rapor Linki'}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Pending Section */}
        <div className="lg:col-span-1">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between px-2">
            İşlem Bekleyenler 
            <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md text-[9px]">{actionableBookings.length}</span>
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-none">
            {actionableBookings.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 font-bold text-[10px] uppercase">Bekleyen kayıt yok</div>
            ) : (
              actionableBookings.map(booking => (
                <div key={booking.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                     <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md">{booking.activity}</span>
                     <span className="text-[9px] font-medium text-slate-400">{booking.date}</span>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm font-bold text-slate-900">{booking.user.fullName}</div>
                    <div className="text-[10px] font-medium text-slate-400 mt-0.5">{booking.time} • {booking.duration} Saat</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <select 
                      value={booking.instructorName || ''} 
                      onChange={(e) => handleInstructorChange(booking.id, e.target.value, booking)}
                      className="w-full text-xs font-bold border border-slate-200 rounded-lg bg-slate-50 p-2 outline-none focus:border-blue-500"
                    >
                      <option value="">Eğitmen Seç...</option>
                      {instructorSettings.map(inst => {
                        const isBusy = isInstructorBusy(inst.name, booking.date, booking.time, booking.duration, booking.id);
                        return (
                          <option key={inst.name} value={inst.name} className={isBusy ? 'text-rose-400' : ''}>
                            {inst.name} {isBusy ? '(MEŞGUL)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <button onClick={() => handleStatusChange(booking.id, BookingStatus.CONFIRMED)} className="w-full bg-emerald-600 text-white py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">Onayla</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
           
           {/* Grid Nav */}
           <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-lg border border-slate-200 text-slate-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
                 <div className="text-center min-w-[150px]">
                    <span className="text-sm font-bold text-slate-900 block">{formatFullDateTurkish(scheduleDate).split(',')[0]}</span>
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{scheduleDate}</span>
                 </div>
                 <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-lg border border-slate-200 text-slate-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
              </div>
              <button onClick={() => setScheduleDate(formatDateYYYYMMDD(new Date()))} className="text-[10px] font-bold uppercase text-slate-400 hover:text-blue-600">Bugüne Dön</button>
           </div>

           {/* The Grid */}
           <div className="overflow-auto relative max-h-[700px] scrollbar-thin">
              <div className="grid" style={{ gridTemplateColumns: `70px repeat(${instructorSettings.length}, minmax(180px, 1fr))`, backgroundColor: '#f1f5f9' /* slate-100 */, gap: '1px' }}>
                 
                 {/* Corner */}
                 <div className="sticky top-0 left-0 z-50 bg-white p-4 border-b border-r border-slate-200"></div>
                 
                 {/* Headers */}
                 {instructorSettings.map(inst => (
                   <div key={inst.name} className="sticky top-0 z-40 bg-white p-4 border-b border-slate-200 text-center">
                      <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{inst.name}</span>
                   </div>
                 ))}

                 {/* Rows */}
                 {TIME_SLOTS.map((time, idx) => (
                   <React.Fragment key={time}>
                      {/* Time Column */}
                      <div className="sticky left-0 z-30 bg-slate-50 p-4 border-r border-slate-200 flex items-center justify-center">
                         <span className="text-[10px] font-bold text-slate-500">{time}</span>
                      </div>
                      
                      {/* Cells */}
                      {instructorSettings.map(inst => {
                         const booking = bookings.find(b => b.date === scheduleDate && b.time === time && b.instructorName === inst.name && b.status === BookingStatus.CONFIRMED);
                         const isContinuation = bookings.some(b => {
                            const prevH = (parseInt(time.split(':')[0]) - 1).toString().padStart(2, '0') + ':00';
                            return b.date === scheduleDate && b.instructorName === inst.name && b.status === BookingStatus.CONFIRMED && b.time === prevH && b.duration === 2;
                         });
                         const act = booking ? ACTIVITIES.find(a => a.name === booking.activity) : null;

                         return (
                           <div key={inst.name + time} className={`relative h-24 bg-white group hover:bg-slate-50/50 transition-colors`}>
                              {booking ? (
                                <div 
                                  onClick={() => { setEditingBooking(booking); setIsEditModalOpen(true); }}
                                  className={`absolute inset-1.5 z-20 rounded-lg p-3 shadow-sm cursor-pointer border-l-4 ${act?.lightBg || 'bg-slate-100'} ${act?.textColor || 'text-slate-900'}`}
                                  style={{ 
                                    height: booking.duration === 2 ? 'calc(200% + 2px)' : 'calc(100% - 12px)',
                                    zIndex: booking.duration === 2 ? 35 : 20,
                                    borderLeftColor: 'currentColor'
                                  }}
                                >
                                   <div className="text-[9px] font-bold uppercase opacity-60 truncate mb-1">{booking.activity}</div>
                                   <div className="text-[11px] font-bold leading-tight line-clamp-2">{booking.user.fullName}</div>
                                </div>
                              ) : isContinuation ? null : (
                                <button onClick={() => { setSelectedSlot({ instructor: inst.name, time }); setIsModalOpen(true); }} className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-slate-300 font-bold text-lg hover:text-blue-500">+</button>
                              )}
                           </div>
                         );
                      })}
                   </React.Fragment>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Önizleme Katmanı */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-slate-950 z-[999] overflow-auto">
          <div className="sticky top-0 right-0 p-6 z-[1000] flex justify-end">
             <button 
               onClick={() => setIsPreviewOpen(false)} 
               className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase border border-white/10 backdrop-blur-md shadow-2xl transition-all active:scale-95"
             >
               Önizlemeyi Kapat
             </button>
          </div>
          <div className="mt-[-80px]">
            <DailyReportView date={scheduleDate} />
          </div>
        </div>
      )}

      {/* Düzenleme Modalı */}
      {isEditModalOpen && editingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white p-6 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Kayıt Düzenle</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rezervasyon detaylarını güncelleyin</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                     Müşteri Ad Soyad <span className="text-rose-500">*</span>
                   </label>
                   <input 
                     required
                     className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all" 
                     value={editingBooking.user.fullName} 
                     onChange={e => setEditingBooking({...editingBooking, user: {...editingBooking.user, fullName: e.target.value}})} 
                   />
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                     İletişim Telefonu <span className="text-rose-500">*</span>
                   </label>
                   <input 
                     required
                     className="w-full border-2 border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all" 
                     value={editingBooking.user.phone} 
                     onChange={e => setEditingBooking({...editingBooking, user: {...editingBooking.user, phone: e.target.value}})} 
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Aktivite</label>
                      <select 
                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 bg-white outline-none" 
                        value={editingBooking.activity} 
                        onChange={e => setEditingBooking({...editingBooking, activity: e.target.value as ActivityType})}
                      >
                         {Object.values(ActivityType).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Eğitmen</label>
                      <select 
                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 bg-white outline-none" 
                        value={editingBooking.instructorName || ''} 
                        onChange={e => setEditingBooking({...editingBooking, instructorName: e.target.value})}
                      >
                         <option value="">Eğitmen Seç...</option>
                         {instructorSettings.map(inst => (
                            <option key={inst.name} value={inst.name}>{inst.name}</option>
                         ))}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tarih</label>
                      <input 
                        type="date"
                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 bg-white outline-none" 
                        value={editingBooking.date} 
                        onChange={e => setEditingBooking({...editingBooking, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Başlangıç Saati</label>
                      <select 
                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 bg-white outline-none" 
                        value={editingBooking.time} 
                        onChange={e => setEditingBooking({...editingBooking, time: e.target.value})}
                      >
                         {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-6">
                    <button 
                      type="button" 
                      onClick={() => setIsEditModalOpen(false)} 
                      className="flex-1 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                      Vazgeç
                    </button>
                    <button 
                      type="submit" 
                      className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all"
                    >
                      Güncelle
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Manuel Kayıt Modalı */}
      {isModalOpen && selectedSlot && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white p-6 rounded-[2rem] w-full max-w-md shadow-2xl">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">Hızlı Kayıt</h3>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">{selectedSlot.instructor} • {selectedSlot.time}</p>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                 <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      Ad Soyad <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      placeholder="Ad Soyad" required 
                      className="w-full border-2 border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all" 
                      value={manualFormData.fullName} onChange={e => setManualFormData({...manualFormData, fullName: e.target.value})} 
                    />
                 </div>
                 <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      Telefon <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      placeholder="Telefon" required 
                      className="w-full border-2 border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-900 focus:border-blue-500 outline-none transition-all" 
                      value={manualFormData.phone} onChange={e => setManualFormData({...manualFormData, phone: e.target.value})} 
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <select className="w-full border-2 border-slate-100 rounded-xl p-4 text-xs font-black uppercase bg-white" value={manualFormData.activity} onChange={e => setManualFormData({...manualFormData, activity: e.target.value as ActivityType})}>
                       {Object.values(ActivityType).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select className="w-full border-2 border-slate-100 rounded-xl p-4 text-xs font-black uppercase bg-white" value={manualFormData.duration} onChange={e => setManualFormData({...manualFormData, duration: parseInt(e.target.value) as 1 | 2})}>
                       <option value={1}>1 Saat</option>
                       <option value={2}>2 Saat</option>
                    </select>
                 </div>
                 <div className="flex gap-3 pt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-slate-400 text-[10px] font-black uppercase tracking-widest">İptal</button>
                    <button type="submit" className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">Sisteme Ekle</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
