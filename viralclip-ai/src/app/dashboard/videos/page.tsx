import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function VideosPage() {
  const { userId } = auth();
  const user = userId
    ? await prisma.user.findUnique({ where: { clerkId: userId } })
    : null;
  const videos = user
    ? await prisma.video.findMany({
        where: { userId: user.id },
        include: { clips: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Videos</h1>
        <p className="text-sm text-neutral-500 mt-1">Your uploaded source videos.</p>
      </div>
      {videos.length === 0 ? (
        <div className="text-center py-12 text-neutral-400 text-sm">
          No videos yet. Upload one from the dashboard.
        </div>
      ) : (
        <div className="divide-y rounded-lg border bg-white">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-sm">{v.title}</div>
                <div className="text-xs text-neutral-500">
                  {formatTime(v.duration)} · {v.clips.length} clips
                </div>
              </div>
              <Badge>{v.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
