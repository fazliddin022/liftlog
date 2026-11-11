"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Dumbbell, CalendarCheck, ListChecks, TrendingUp, History, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/programs", label: "Programs", icon: ListChecks },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/history", label: "History", icon: History },
];

export default function AppNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const Logo = () => (
    <Link href="/today" className="flex items-center gap-2.5 no-underline">
      <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/30">
        <Dumbbell size={18} className="text-white" />
      </div>
      <span className="font-black text-gray-900 dark:text-white text-lg">LiftLog</span>
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-white/5 p-4 z-40">
        <div className="mb-8 px-2 pt-2"><Logo /></div>
        <nav className="flex-1 space-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold no-underline transition-all ${
                isActive(l.href)
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <l.icon size={18} /> {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle className="!p-2" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-white/5 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold no-underline transition-all ${
                isActive(l.href) ? "text-rose-600 dark:text-rose-400" : "text-gray-400"
              }`}
            >
              <l.icon size={22} />
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}