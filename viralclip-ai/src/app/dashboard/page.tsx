import { StatsCards } from "@/components/dashboard/stats-cards";
import { VideoUploader } from "@/components/upload/video-uploader";
import { ClipGrid } from "@/components/clips/clip-grid";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Upload a video and let AI find your viral moments.
        </p>
      </div>
      <StatsCards />
      <VideoUploader />
      <ClipGrid />
    </div>
  );
}
