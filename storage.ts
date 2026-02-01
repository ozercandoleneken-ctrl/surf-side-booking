
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  limit, 
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Booking, ActivityType, LogEntry } from './types';

const BOOKINGS_COL = 'bookings';
const LOGS_COL = 'logs';
const SETTINGS_COL = 'settings';

export interface InstructorSetting {
  name: string;
  specialties: ActivityType[];
}

export const getBookings = async (): Promise<Booking[]> => {
  const q = query(collection(db, BOOKINGS_COL), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Booking));
};

export const getLogs = async (): Promise<LogEntry[]> => {
  const q = query(collection(db, LOGS_COL), orderBy('timestamp', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as LogEntry));
};

const addLog = async (type: LogEntry['type'], bookingId: string, userName: string, details: string) => {
  try {
    await addDoc(collection(db, LOGS_COL), {
      timestamp: Date.now(),
      type,
      bookingId,
      userName,
      details
    });
  } catch (e) {
    console.warn("Log yazma hatası:", e);
  }
};

export const logNotificationSent = async (booking: Booking, channel: string) => {
  await addLog('BİLDİRİM_GÖNDERİLDİ', booking.id, booking.user.fullName, `${channel} üzerinden onay mesajı gönderildi.`);
};

export const saveBooking = async (booking: Booking) => {
  const { id, ...data } = booking;
  const docRef = await addDoc(collection(db, BOOKINGS_COL), data);
  await addLog('OLUŞTURMA', docRef.id, booking.user.fullName, `${booking.activity} - ${booking.date} ${booking.time}`);
  return docRef.id;
};

export const updateBooking = async (updatedBooking: Booking) => {
  const { id, ...data } = updatedBooking;
  if (!id) throw new Error("ID eksik");
  const docRef = doc(db, BOOKINGS_COL, id);
  await updateDoc(docRef, data as any);
  await addLog('DÜZENLEME', id, updatedBooking.user.fullName, `Güncellendi: ${updatedBooking.date} ${updatedBooking.time}`);
};

export const updateBookingStatus = async (id: string, status: Booking['status']) => {
  const docRef = doc(db, BOOKINGS_COL, id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    await updateDoc(docRef, { status });
    await addLog('DURUM_GÜNCELLEME', id, snap.data().user?.fullName || 'Bilinmeyen', `Durum: ${status}`);
  }
};

export const updateBookingInstructor = async (id: string, instructorName: string) => {
  const docRef = doc(db, BOOKINGS_COL, id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    await updateDoc(docRef, { instructorName });
    await addLog('EĞİTMEN_ATAMA', id, snap.data().user?.fullName || 'Bilinmeyen', `Eğitmen: ${instructorName}`);
  }
};

export const getInstructorSettings = async (): Promise<InstructorSetting[]> => {
  const docRef = doc(db, SETTINGS_COL, 'instructors');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    const defaults = ['Samican', 'Özercan', 'Ahmet', 'Oğulcan', 'Ata'].map(name => ({
      name,
      specialties: [ActivityType.KITESURF, ActivityType.WINGFOIL, ActivityType.COASTAL_ROWING]
    }));
    await setDoc(docRef, { list: defaults });
    return defaults;
  }
  return snap.data().list;
};

export const saveInstructorSettings = async (settings: InstructorSetting[]) => {
  const docRef = doc(db, SETTINGS_COL, 'instructors');
  await setDoc(docRef, { list: settings });
};
