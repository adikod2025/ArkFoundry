import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Scissors, Zap } from "lucide-react";

export async function StatsCards() {
  const { userId } = auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { _count: { select: { videos: true, clips: true } } },
  });
  if (!user) return null;

  const planLimits: Record<string, number> = { FREE: 3, STARTER: 20, PRO: 999, AGENCY: 999 };
  const limit = planLimits[user.plan];
  const remaining = Math.max(0, limit - user.creditsUsed);

  const stats = [
    { title: "Videos uploaded", value: user._count.videos, icon: Film },
    { title: "Clips generated", value: user._count.clips, icon: Scissors },
    {
      title: "Credits remaining",
      value: user.plan === "PRO" || user.plan === "AGENCY" ? "Unlimited" : remaining,
      icon: Zap,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              {stat.title}
            </CardTitle>
            <stat.icon className="w-4 h-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
