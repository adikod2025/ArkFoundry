import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Film, Scissors, Settings, LayoutDashboard } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/videos", label: "Videos", icon: Film },
  { href: "/dashboard/clips", label: "Clips", icon: Scissors },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r h-screen flex flex-col">
      <div className="p-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          ViralClip AI
        </Link>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-600 rounded-md hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}
