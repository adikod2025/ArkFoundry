import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) return NextResponse.json([], { status: 200 });

  const clips = await prisma.clip.findMany({
    where: { userId: user.id },
    include: { video: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clips);
}
