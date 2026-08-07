"use client";

import { useState } from "react";
import { UploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function VideoUploader() {
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!uploadedUrl || !title) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url: uploadedUrl, duration: 600 }),
      });
      if (!res.ok) throw new Error("Failed to create video");
      toast({
        title: "Video uploaded!",
        description: "AI is now analyzing your video for viral moments.",
      });
      setUploadedUrl("");
      setTitle("");
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload video</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedUrl ? (
          <UploadDropzone<OurFileRouter, "videoUploader">
            endpoint="videoUploader"
            onClientUploadComplete={(res) => {
              if (res?.[0]) setUploadedUrl(res[0].url);
            }}
            onUploadError={(error) => {
              toast({
                title: "Upload failed",
                description: error.message,
                variant: "destructive",
              });
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-neutral-100 rounded-lg text-sm">
              Uploaded: {uploadedUrl}
            </div>
            <input
              type="text"
              placeholder="Video title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate clips
              </Button>
              <Button variant="outline" onClick={() => setUploadedUrl("")}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
