// ============================================
// EEE Batch Pulse — TypeScript Types
// ============================================

export type PostType = 'note' | 'highlight' | 'book_rec' | 'review';

export type ScheduleStatus = 'happened' | 'delayed' | 'cancelled' | 'mass_bunk';

export type SessionType = 'lecture' | 'lab' | 'library' | 'lunch';

export type BatchOption = 'ALL' | 'B1' | 'B2';

export interface TimetableEntry {
  id: string;
  day_of_week: number; // 0=Sunday, 1=Monday ... 6=Saturday
  start_time: string; // '10:00' or '10:00:00'
  end_time: string; // '11:00' or '11:00:00'
  subject: string;
  faculty: string | null;
  room: string | null;
  batch: 'B1' | 'B2' | null;
  session_type: SessionType;
}

export interface Day {
  id: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface Post {
  id: string;
  day_id: string;
  type: PostType;
  subject: string | null;
  content: string | null;
  image_urls: string[];
  posted_by: string | null;
  created_at: string;
  // Joined fields
  day?: Day;
  admin?: Admin;
}

export interface ScheduleEntry {
  id: string;
  day_id: string;
  subject: string;
  scheduled_time: string | null;
  status: ScheduleStatus;
  note: string | null;
  updated_at: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  whatsapp_number: string | null;
  created_at?: string;
}

export interface PushSubscriptionData {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  batch_pref?: BatchOption;
  created_at?: string;
}

// Form / UI types
export interface PostFormData {
  type: PostType;
  subject: string;
  content: string;
  images: File[];
}

export interface ScheduleFormEntry {
  id?: string;
  subject: string;
  scheduled_time: string;
  status: ScheduleStatus;
  note: string;
}

// Day with all related data
export interface DayWithData {
  day: Day;
  posts: Post[];
  schedule: ScheduleEntry[];
}

// Live Current & Next slot computation result
export interface LiveSlotState {
  currentSlot: TimetableEntry | null;
  currentOverride: ScheduleEntry | null;
  nextSlot: TimetableEntry | null;
  nextOverride: ScheduleEntry | null;
  statusText: string;
  timeRemainingText: string | null;
  isLive: boolean;
  isBreak: boolean;
  isFreeDay: boolean;
  dayName: string;
}

// Real-time Chat message
export interface ChatMessage {
  id: string;
  content: string;
  sender_name: string;
  created_at: string;
}
