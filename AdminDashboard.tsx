
import React, { useState, useEffect } from 'react';
import { Booking, BookingStatus, ActivityType, LogEntry } from './types';
import { 
  getBookings, updateBookingStatus, deleteBooking, 
  updateBookingInstructor, saveBooking, updateBooking,
  getInstructorSettings, saveInstructorSettings, InstructorSetting,
  getLogs, logNotificationSent
} from './storage';
import { TIME_SLOTS, formatFullDateTurkish, ACTIVITIES } from './constants';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'logs'>('schedule');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scheduleDate, setScheduleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ instructor: string, time: string } | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [instructorSettings, setInstructorSettings] = useState<InstructorSetting[]>([]);
  const [manualFormData, setManualFormData] = useState({ fullName: '', phone: '', activity: ActivityType.KITESURF, duration: 1 as 1 | 2 });
  const [newInstructorName, setNewInstructorName] = useState('');
  const [editingInstructorIndex, setEditingInstructorIndex] = useState<number | null>(null);
  const [tempInstructorName, setTempInstructorName] = useState('');

  const loadData = () => {
    const allBookings = getBookings().sort((a, b) => b.createdAt - a.createdAt);
    setBookings(allBookings);
    setInstructorSettings(getInstructorSettings());
    setLogs(getLogs());
  };

  useEffect(() => {
    loadData();
  }, []);

  const sendWhatsAppConfirmation = (booking: Booking) => {
    const phone = booking.user.phone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('0') ? '9' + phone : phone.startsWith('90') ? phone : '90' + phone;
    const message = `Merhaba ${booking.user.fullName}, Surf Side Urla'daki ${booking.activity} rezervasyonunuz ${booking.date} tarihinde saat ${booking.time} için onaylanmıştır. Görüşmek üzere! 🏄‍♂️🤙`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    logNotificationSent(booking, 'WhatsApp');
    loadData();
  };

  const changeDate = (days: number) => {
    const d = new Date(scheduleDate);
    d.setDate(d.getDate() + days);
    setScheduleDate(d.toISOString().split('T')[0]);
  };

  const handleStatusChange = (id: string, status: BookingStatus) => {
    updateBookingStatus(id, status);
    loadData();
  };

  const handleInstructorChange = (id: string, instructorName: string, booking: Booking) => {
    updateBookingInstructor(id, instructorName);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Silmek istediğinize emin misiniz?')) {
      deleteBooking(id);
      loadData();
    }
  };

  const openManualAddModal = (instructor: string, time: string) => {
    setSelectedSlot({ instructor, time });
    setIsModalOpen(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    const newBooking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      user: { fullName: manualFormData.fullName, phone: manualFormData.phone, email: 'manuel@kayit.com' },
      activity: manualFormData.activity,
      date: scheduleDate,
      time: selectedSlot.time,
      duration: manualFormData.duration,
      status: BookingStatus.CONFIRMED,
      instructorName: selectedSlot.instructor,
      createdAt: Date.now()
    };
    saveBooking(newBooking);
    loadData();
    setIsModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBooking) {
      updateBooking(editingBooking);
      loadData();
      setIsEditModalOpen(false);
    }
  };

  const actionableBookings = bookings.filter(b => 
    b.status === BookingStatus.PENDING || (b.status === BookingStatus.CONFIRMED && !b.instructorName)
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Operasyon Merkezi</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab(activeTab === 'schedule' ? 'logs' : 'schedule')} className="bg-white border p-3 rounded-2xl text-xs font-black uppercase">
            {activeTab === 'logs' ? 'Takvime Dön' : 'İşlem Kayıtları'}
          </button>
        </div>
      </div>

      {activeTab === 'schedule' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-1 space-y-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">İşlem Bekleyenler</h2>
            {actionableBookings.map(booking => (
              <div key={booking.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-base font-black text-slate-900">{booking.user.fullName}</div>
                <div className="text-[10px] font-black text-slate-600 mt-2">{booking.date} • {booking.time}</div>
                <div className="grid grid-cols-1 gap-2 mt-4">
                  <select 
                    value={booking.instructorName || ''} 
                    onChange={(e) => handleInstructorChange(booking.id, e.target.value, booking)}
                    className="text-[10px] font-black uppercase rounded-xl border p-2"
                  >
                    <option value="">Eğitmen Atayın</option>
                    {instructorSettings.map(inst => <option key={inst.name} value={inst.name}>{inst.name}</option>)}
                  </select>
                  <button onClick={() => handleStatusChange(booking.id, BookingStatus.CONFIRMED)} className="bg-emerald-600 text-white p-2 rounded-xl text-[10px] font-black">Onayla</button>
                </div>
              </div>
            ))}
          </div>

          <div className="xl:col-span-3 bg-white rounded-[2rem] border shadow-xl overflow-hidden">
             <div className="p-4 flex items-center justify-between border-b">
                <button onClick={() => changeDate(-1)} className="p-2 border rounded-xl">Geri</button>
                <h2 className="text-xl font-black">{formatFullDateTurkish(scheduleDate)}</h2>
                <button onClick={() => changeDate(1)} className="p-2 border rounded-xl">İleri</button>
             </div>
             <div className="overflow-auto max-h-[600px]">
                <table className="w-full text-center border-collapse">
                   <thead>
                      <tr>
                         <th className="p-4 border">Saat</th>
                         {instructorSettings.map(inst => <th key={inst.name} className="p-4 border">{inst.name}</th>)}
                      </tr>
                   </thead>
                   <tbody>
                      {TIME_SLOTS.map(time => (
                        <tr key={time}>
                           <td className="p-4 border font-black text-slate-500">{time}</td>
                           {instructorSettings.map(inst => {
                              const booking = bookings.find(b => b.date === scheduleDate && b.time === time && b.instructorName === inst.name && b.status === BookingStatus.CONFIRMED);
                              return (
                                <td key={inst.name + time} className="p-2 border relative h-24">
                                   {booking ? (
                                     <div onClick={() => { setEditingBooking(booking); setIsEditModalOpen(true); }} className="bg-blue-50 text-blue-700 p-2 rounded-lg text-[10px] font-black cursor-pointer h-full">
                                        {booking.user.fullName}
                                     </div>
                                   ) : (
                                     <button onClick={() => openManualAddModal(inst.name, time)} className="w-full h-full text-slate-200 hover:bg-slate-50">+</button>
                                   )}
                                </td>
                              );
                           })}
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border shadow-xl p-8">
           <table className="w-full">
              <thead><tr className="border-b"><th className="p-4">Zaman</th><th className="p-4">İşlem</th><th className="p-4">Detay</th></tr></thead>
              <tbody>{logs.map(log => <tr key={log.id} className="border-b"><td className="p-4 text-xs">{new Date(log.timestamp).toLocaleString()}</td><td className="p-4 text-xs font-black">{log.type}</td><td className="p-4 text-xs">{log.details}</td></tr>)}</tbody>
           </table>
        </div>
      )}

      {isModalOpen && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm">
             <h3 className="text-xl font-black mb-4">Manuel Kayıt</h3>
             <form onSubmit={handleManualSubmit} className="space-y-4">
                <input required placeholder="Ad Soyad" className="w-full border p-3 rounded-xl" onChange={e => setManualFormData({...manualFormData, fullName: e.target.value})} />
                <input required placeholder="Telefon" className="w-full border p-3 rounded-xl" onChange={e => setManualFormData({...manualFormData, phone: e.target.value})} />
                <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-black">Kaydet</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 p-2">İptal</button>
             </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingBooking && (
        <div className="fixed inset-0 bg-black/50 z-[130] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm">
             <h3 className="text-xl font-black mb-4">Düzenle</h3>
             <form onSubmit={handleEditSubmit} className="space-y-4">
                <input value={editingBooking.user.fullName} className="w-full border p-3 rounded-xl" onChange={e => setEditingBooking({...editingBooking, user: {...editingBooking.user, fullName: e.target.value}})} />
                <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-black">Güncelle</button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full text-slate-400 p-2">Kapat</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
