'use client';

import { useState, useRef, useCallback } from 'react';
import { createPost, updateScheduleEntry, initScheduleForToday } from '@/lib/actions';
import { SUBJECTS, POST_TYPE_CONFIG, SCHEDULE_STATUS_CONFIG } from '@/lib/constants';
import { getTimetableForDay, WEEKLY_TIMETABLE } from '@/lib/timetable-data';
import type { PostType, ScheduleStatus, ScheduleEntry } from '@/lib/types';

interface AdminDashboardClientProps {
  scheduleEntries: ScheduleEntry[];
}

export default function AdminDashboardClient({
  scheduleEntries,
}: AdminDashboardClientProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <PostCreator />
      <div className="h-px bg-gradient-to-r from-transparent via-[#FFD9E8] to-transparent my-8" />
      <ScheduleEditor initialEntries={scheduleEntries} />
    </div>
  );
}

// ============================================
// Post Creator
// ============================================
function PostCreator() {
  const [type, setType] = useState<PostType>('note');
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);

  // Handle clipboard paste for images
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            addImage(file);
          }
        }
      }
    },
    []
  );

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      addImage(file);
    }
    e.target.value = '';
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        addImage(file);
      }
    }
  };

  function addImage(file: File) {
    setImages((prev) => [...prev, file]);
    const url = URL.createObjectURL(file);
    setPreviews((prev) => [...prev, url]);
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.set('type', type);
      formData.set('subject', subject);
      formData.set('content', content);
      images.forEach((img) => formData.append('images', img));

      await createPost(formData);

      // Reset form
      setContent('');
      setImages([]);
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="glass-card p-6 sm:p-8 shadow-md">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F9A] pulse-pink-glow" />
        <h2 className="font-display text-lg font-bold text-[#3D2C36]">
          Create New Post
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type selector — glass pill buttons shifting to solid hot pink */}
        <div>
          <label className="block font-mono text-[11px] font-semibold text-[#C2185B] tracking-wider uppercase mb-2">
            Post Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(Object.keys(POST_TYPE_CONFIG) as PostType[]).map((t) => {
              const config = POST_TYPE_CONFIG[t];
              const isActive = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`
                    px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200
                    flex items-center justify-center gap-2 cursor-pointer
                    ${
                      isActive
                        ? 'bg-[#FF4F9A] text-white border border-[#FF4F9A] shadow-[0_4px_16px_rgba(255,79,154,0.35)] scale-[1.02]'
                        : 'bg-white/60 text-[#3D2C36]/75 border border-white/90 hover:border-[#FFD9E8] hover:bg-white/80'
                    }
                  `}
                >
                  <span className="text-base">{config.emoji}</span>
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject dropdown */}
        <div>
          <label className="block font-mono text-[11px] font-semibold text-[#C2185B] tracking-wider uppercase mb-2">
            Subject
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-3 glass-input text-sm text-[#3D2C36] font-medium cursor-pointer"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div>
          <label className="block font-mono text-[11px] font-semibold text-[#C2185B] tracking-wider uppercase mb-2">
            Post Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 glass-input text-sm text-[#3D2C36] placeholder-[#3D2C36]/35 resize-y font-medium"
            placeholder="Write class notes, discussion highlights, key reminders, etc..."
          />
        </div>

        {/* Image upload zone (supports paste, click, drag) */}
        <div>
          <label className="block font-mono text-[11px] font-semibold text-[#C2185B] tracking-wider uppercase mb-2">
            Attachment Images (Clipboard Paste Supported)
          </label>

          <div
            ref={pasteZoneRef}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#FFD9E8] hover:border-[#FF4F9A] rounded-2xl p-8
                       transition-all duration-200 cursor-pointer
                       flex flex-col items-center justify-center gap-2.5 bg-white/40 hover:bg-white/60"
            tabIndex={0}
            role="button"
            aria-label="Upload or paste images"
          >
            <div className="w-12 h-12 rounded-full bg-white/80 border border-[#FFD9E8] flex items-center justify-center shadow-xs">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[#FF4F9A]"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="font-display text-sm font-semibold text-[#3D2C36]">
              Click to browse or drop images here
            </p>
            <p className="font-mono text-[11px] text-[#3D2C36]/50 tracking-wide">
              ⚡ Directly paste from clipboard (Ctrl+V) anywhere
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Image previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
              {previews.map((url, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-white/80 shadow-xs">
                  <img
                    src={url}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-24 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white
                               text-xs font-bold flex items-center justify-center shadow-md
                               opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3.5 glass-btn-primary font-display text-sm font-bold tracking-wide
                       cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Publishing...
              </span>
            ) : (
              'Publish Post'
            )}
          </button>

          {success && (
            <span className="font-mono text-xs text-emerald-700 font-semibold px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 animate-fade-up">
              ✓ Posted successfully!
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

// ============================================
// Schedule Editor
// ============================================
function ScheduleEditor({
  initialEntries,
}: {
  initialEntries: ScheduleEntry[];
}) {
  const [entries, setEntries] = useState<ScheduleEntry[]>(initialEntries);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [showInit, setShowInit] = useState(entries.length === 0);

  // Quick init schedule from today's timetable
  async function handleInitSchedule() {
    const dayOfWeek = new Date().getDay();
    // Get today's slots or fallback to Monday
    const targetDay = (dayOfWeek >= 1 && dayOfWeek <= 5) ? dayOfWeek : 1;
    const slots = getTimetableForDay(targetDay, 'ALL', WEEKLY_TIMETABLE).filter(
      (s) => s.session_type !== 'lunch'
    );

    const defaultEntries = slots.map((s) => ({
      subject: s.batch ? `${s.subject} (${s.batch})` : s.subject,
      scheduled_time: s.start_time,
    }));

    try {
      await initScheduleForToday(defaultEntries);
      // Reload page to get fresh data
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to initialize schedule');
    }
  }

  async function handleStatusChange(
    entryId: string,
    newStatus: ScheduleStatus,
    note: string
  ) {
    setSaving((prev) => ({ ...prev, [entryId]: true }));

    try {
      await updateScheduleEntry(entryId, newStatus, note);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, status: newStatus, note } : e
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving((prev) => ({ ...prev, [entryId]: false }));
    }
  }

  if (showInit) {
    return (
      <section className="glass-card p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F9A]" />
          <h2 className="font-display text-lg font-bold text-[#3D2C36]">
            Today&apos;s Class Schedule
          </h2>
        </div>

        <div className="rounded-2xl border border-[#FFD9E8] bg-white/40 p-8 text-center">
          <p className="font-mono text-xs text-[#3D2C36]/60 mb-5">
            No schedule entries exist for today yet. Initialize with default batch timetable?
          </p>
          <button
            onClick={handleInitSchedule}
            className="glass-btn-primary px-6 py-2.5 font-mono text-xs font-semibold tracking-wider uppercase cursor-pointer"
          >
            Initialize Today&apos;s Schedule
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card p-6 sm:p-8 shadow-md">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F9A] pulse-pink-glow" />
        <h2 className="font-display text-lg font-bold text-[#3D2C36]">
          Update Class Status & Timetable
        </h2>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <ScheduleEntryRow
            key={entry.id}
            entry={entry}
            saving={saving[entry.id] || false}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
    </section>
  );
}

function ScheduleEntryRow({
  entry,
  saving,
  onStatusChange,
}: {
  entry: ScheduleEntry;
  saving: boolean;
  onStatusChange: (id: string, status: ScheduleStatus, note: string) => void;
}) {
  const [note, setNote] = useState(entry.note || '');
  const statuses: ScheduleStatus[] = ['happened', 'delayed', 'cancelled', 'mass_bunk'];

  return (
    <div className="rounded-2xl border border-white/90 bg-white/60 p-4 shadow-xs">
      {/* Subject + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-sm text-[#3D2C36] font-bold">{entry.subject}</span>
          {entry.scheduled_time && (
            <span className="font-mono text-[11px] text-[#3D2C36]/60 font-medium px-2 py-0.5 rounded bg-white/70 border border-[#FFD9E8]">
              {entry.scheduled_time}
            </span>
          )}
        </div>
        {saving && (
          <span className="w-3.5 h-3.5 border-2 border-[#FF4F9A]/30 border-t-[#FF4F9A] rounded-full animate-spin" />
        )}
      </div>

      {/* Status toggle pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {statuses.map((s) => {
          const config = SCHEDULE_STATUS_CONFIG[s];
          const isActive = entry.status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatusChange(entry.id, s, note)}
              disabled={saving}
              className={`
                px-3 py-1.5 rounded-full font-mono text-[10px] tracking-wider uppercase font-semibold
                border transition-all cursor-pointer disabled:opacity-50
                ${
                  isActive
                    ? `${config.chipClass} scale-[1.02]`
                    : 'bg-white/50 border-[#FFD9E8] text-[#3D2C36]/60 hover:bg-white hover:text-[#3D2C36]'
                }
              `}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle bg-current" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Note field */}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => onStatusChange(entry.id, entry.status, note)}
        placeholder="Add brief note (e.g. Lab cancelled, moved to Room 302)..."
        className="w-full px-3 py-2 glass-input text-xs text-[#3D2C36] placeholder-[#3D2C36]/30 font-medium"
      />
    </div>
  );
}
