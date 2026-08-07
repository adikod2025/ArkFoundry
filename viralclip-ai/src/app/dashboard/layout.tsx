import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";

// NOTE: the build spec placed this under a pathless `(dashboard)` route group,
// which collides with the landing `app/page.tsx` (both resolve to "/") and does
// not match the sidebar's `/dashboard/*` links. Using a real `dashboard`
// segment fixes both.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
