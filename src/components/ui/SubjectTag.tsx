import Link from 'next/link';

interface SubjectTagProps {
  subject: string;
  linked?: boolean;
}

export default function SubjectTag({ subject, linked = true }: SubjectTagProps) {
  const tag = (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
        font-mono text-[10px] font-semibold tracking-wider uppercase
        bg-white/60 text-[#C2185B] border border-[#FFD9E8] shadow-xs
        ${
          linked
            ? 'hover:bg-[#FF4F9A] hover:text-white hover:border-[#FF4F9A] transition-all duration-200 active:scale-95'
            : ''
        }
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#FF4F9A] group-hover:bg-white shrink-0" />
      {subject}
    </span>
  );

  if (linked) {
    return (
      <Link href={`/subject/${encodeURIComponent(subject)}`} className="group">
        {tag}
      </Link>
    );
  }

  return tag;
}
