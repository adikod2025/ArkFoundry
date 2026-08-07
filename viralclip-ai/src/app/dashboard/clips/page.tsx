import { ClipGrid } from "@/components/clips/clip-grid";

export default function ClipsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clips</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Every clip the engine has generated, ranked by viral score.
        </p>
      </div>
      <ClipGrid />
    </div>
  );
}
