import type { Post } from '@/lib/types';
import PostCard from './PostCard';

interface PostFeedProps {
  posts: Post[];
  showDate?: boolean;
  emptyMessage?: string;
}

export default function PostFeed({
  posts,
  showDate = false,
  emptyMessage = 'No posts yet.',
}: PostFeedProps) {
  if (posts.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-14 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-white/70 border border-[#FFD9E8] flex items-center justify-center mb-3 shadow-xs">
          <span className="text-2xl">✨</span>
        </div>
        <p className="font-display text-sm font-medium text-[#3D2C36]/70">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post, i) => (
        <div
          key={post.id}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <PostCard post={post} showDate={showDate} />
        </div>
      ))}
    </div>
  );
}
