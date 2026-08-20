import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { adminLogout } from '@/lib/actions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is authenticated and is an admin
  if (user) {
    const { data: admin } = await supabase
      .from('admins')
      .select('id, name')
      .eq('email', user.email)
      .single();

    if (!admin) {
      // User is authenticated but not an admin — sign out and redirect
      await supabase.auth.signOut();
      redirect('/admin/login');
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Admin header */}
      {user && (
        <header className="sticky top-0 z-40 glass-nav">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F9A] pulse-pink-glow shrink-0" />
                <span className="font-display text-sm font-bold text-[#3D2C36] tracking-tight group-hover:text-[#FF4F9A] transition-colors">
                  Admin Panel
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[#3D2C36]/60 hidden sm:inline-block">
                {user.email}
              </span>
              <form action={adminLogout}>
                <button
                  type="submit"
                  className="font-mono text-[11px] text-rose-700 hover:text-white
                             transition-all tracking-wider uppercase px-3 py-1
                             rounded-full bg-rose-50 hover:bg-rose-600 border border-rose-200 shadow-2xs active:scale-95 cursor-pointer"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
