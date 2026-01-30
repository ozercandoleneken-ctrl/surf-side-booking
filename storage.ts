
import { Booking, ActivityType, LogEntry } from './types';

const STORAGE_KEY = 'water_sports_bookings';
const INSTRUCTOR_SETTINGS_KEY = 'instructor_specialties';
const LOGS_KEY = 'water_sports_logs';

export interface InstructorSetting {
  name: string;
  specialties: ActivityType[];
}

export const getBookings = (): Booking[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getLogs = (): LogEntry[] => {
  const data = localStorage.getItem(LOGS_KEY);
  return data ? JSON.parse(data) : [];
};

const addLog = (type: LogEntry['type'], bookingId: string, userName: string, details: string) => {
  const logs = getLogs();
  const newLog: LogEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    type,
    bookingId,
    userName,
    details
  };
  localStorage.setItem(LOGS_KEY, JSON.stringify([newLog, ...logs].slice(0, 1000)));
};

export const logNotificationSent = (booking: Booking, channel: string) => {
  addLog('BİLDİRİM_GÖNDERİLDİ', booking.id, booking.user.fullName, `${channel} üzerinden onay mesajı gönderildi.`);
};

export const saveBooking = (booking: Booking) => {
  const current = getBookings();
  const updated = [...current, booking];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  addLog('OLUŞTURMA', booking.id, booking.user.fullName, `${booking.activity} - ${booking.date} ${booking.time}`);
};

export const updateBooking = (updatedBooking: Booking) => {
  const current = getBookings();
  const updated = current.map(b => b.id === updatedBooking.id ? updatedBooking : b);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  addLog('DÜZENLEME', updatedBooking.id, updatedBooking.user.fullName, `Güncellendi: ${updatedBooking.date} ${updatedBooking.time}`);
};

export const updateBookingStatus = (id: string, status: Booking['status']) => {
  const current = getBookings();
  const booking = current.find(b => b.id === id);
  const updated = current.map(b => b.id === id ? { ...b, status } : b);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  if (booking) addLog('DURUM_GÜNCELLEME', id, booking.user.fullName, `Durum: ${status}`);
};

export const updateBookingInstructor = (id: string, instructorName: string) => {
  const current = getBookings();
  const booking = current.find(b => b.id === id);
  const updated = current.map(b => b.id === id ? { ...b, instructorName } : b);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  if (booking) addLog('EĞİTMEN_ATAMA', id, booking.user.fullName, `Eğitmen: ${instructorName}`);
};

export const deleteBooking = (id: string) => {
  const current = getBookings();
  const booking = current.find(b => b.id === id);
  const updated = current.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  if (booking) addLog('SİLME', id, booking.user.fullName, `Silindi: ${booking.activity}`);
};

export const getInstructorSettings = (): InstructorSetting[] => {
  const data = localStorage.getItem(INSTRUCTOR_SETTINGS_KEY);
  if (!data) {
    return ['Samican', 'Özercan', 'Ahmet', 'Oğulcan', 'Ata'].map(name => ({
      name,
      specialties: [ActivityType.KITESURF, ActivityType.WINGFOIL, ActivityType.COASTAL_ROWING]
    }));
  }
  return JSON.parse(data);
};

export const saveInstructorSettings = (settings: InstructorSetting[]) => {
  localStorage.setItem(INSTRUCTOR_SETTINGS_KEY, JSON.stringify(settings));
};
