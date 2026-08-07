"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Play } from "lucide-react";

interface Clip {
  id: string;
  title: string;
  viralScore: number;
  startTime: number;
  endTime: number;
  status: string;
  url?: string;
  video: { title: string };
}

export function ClipGrid() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clips")
      .then((r) => r.json())
      .then((data) => {
        setClips(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400 text-sm">
        No clips yet. Upload a video to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your clips</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clips.map((clip) => (
          <Card key={clip.id} className="overflow-hidden">
            <div className="aspect-video bg-neutral-900 flex items-center justify-center relative">
              <Play className="w-8 h-8 text-white opacity-80" />
              <Badge className="absolute top-2 right-2 bg-white text-black">
                {clip.viralScore}/100
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-medium text-sm truncate">{clip.title}</h3>
              <p className="text-xs text-neutral-500 mt-1">
                {clip.video.title} · {clip.startTime}s - {clip.endTime}s
              </p>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium bg-neutral-900 text-white rounded-md hover:bg-neutral-800">
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
