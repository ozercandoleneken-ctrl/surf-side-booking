
export enum ActivityType {
  KITESURF = 'Kitesurf',
  WINGFOIL = 'Wingfoil',
  COASTAL_ROWING = 'Deniz Küreği'
}

export enum BookingStatus {
  PENDING = 'Beklemede',
  CONFIRMED = 'Onaylandı',
  CANCELLED = 'İptal Edildi'
}

export interface UserData {
  fullName: string;
  phone: string;
  email: string;
}

export interface Booking {
  id: string;
  user: UserData;
  activity: ActivityType;
  date: string;
  time: string;
  duration: 1 | 2; // Duration in hours
  status: BookingStatus;
  instructorName?: string;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'OLUŞTURMA' | 'DURUM_GÜNCELLEME' | 'EĞİTMEN_ATAMA' | 'DÜZENLEME' | 'SİLME' | 'BİLDİRİM_GÖNDERİLDİ';
  bookingId: string;
  details: string;
  userName: string;
}

export interface AppState {
  view: 'user' | 'admin';
  step: 1 | 2 | 3; // 3 is success
  userData: UserData | null;
}
