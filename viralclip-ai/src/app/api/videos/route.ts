import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest";

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, url, duration } = body;

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check credits
  const plan = user.plan;
  const limit = plan === "FREE" ? 3 : plan === "STARTER" ? 20 : 999999;
  if (user.creditsUsed >= limit) {
    return NextResponse.json({ error: "Credit limit reached" }, { status: 403 });
  }

  const video = await prisma.video.create({
    data: {
      userId: user.id,
      title,
      url,
      duration,
      status: "PENDING",
    },
  });

  // Increment credits
  await prisma.user.update({
    where: { id: user.id },
    data: { creditsUsed: { increment: 1 } },
  });

  // Trigger the background detection pipeline (Inngest → src/lib/ai graph)
  await inngest.send({
    name: "video/uploaded",
    data: { videoId: video.id, userId: user.id },
  });

  return NextResponse.json(video);
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json([], { status: 200 });

  const videos = await prisma.video.findMany({
    where: { userId: user.id },
    include: { clips: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(videos);
}
