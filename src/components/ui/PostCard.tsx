import type { Post } from '@/lib/types';
import { POST_TYPE_CONFIG } from '@/lib/constants';
import SubjectTag from './SubjectTag';
import ImageGallery from './ImageGallery';

interface PostCardProps {
  post: Post;
  showDate?: boolean;
}

export default function PostCard({ post, showDate = false }: PostCardProps) {
  const typeConfig = POST_TYPE_CONFIG[post.type];

  const timeStr = new Date(post.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const dateStr = post.day
    ? new Date(post.day.date + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <article className="glass-card p-5 sm:p-6 animate-fade-up">
      {/* Header: type badge + subject + timestamp */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type badge */}
          <span
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
              text-[11px] font-semibold uppercase tracking-wider
              border backdrop-blur-xs shadow-2xs
              ${typeConfig.badgeClass}
            `}
          >
            <span>{typeConfig.emoji}</span>
            <span>{typeConfig.label}</span>
          </span>

          {/* Subject tag */}
          {post.subject && <SubjectTag subject={post.subject} />}
        </div>

        {/* Timestamp & Date */}
        <div className="flex items-center gap-1.5 shrink-0">
          {showDate && dateStr && (
            <span className="font-mono text-[11px] text-[#3D2C36]/50 font-medium">
              {dateStr} ·
            </span>
          )}
          <span className="font-mono text-[11px] text-[#3D2C36]/60 font-medium">
            {timeStr}
          </span>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-base text-[#3D2C36] leading-relaxed whitespace-pre-wrap font-normal">
          {post.content}
        </p>
      )}

      {/* Images */}
      <ImageGallery urls={post.image_urls || []} />

      {/* Posted by footer */}
      {post.admin && (
        <div className="mt-4 pt-3 border-t border-[#FFD9E8]/60 flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#3D2C36]/50 tracking-wider">
            Posted by <span className="font-semibold text-[#FF4F9A]">{(post.admin as unknown as { name: string }).name}</span>
          </span>
        </div>
      )}
    </article>
  );
}
