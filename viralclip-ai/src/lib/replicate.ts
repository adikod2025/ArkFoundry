import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

/**
 * Cut and reformat a clip. MVP placeholder — see spec §12: the value is the
 * orchestration/scoring layer (src/lib/ai), not the GPU. Swap in a real
 * ffmpeg-based Replicate model when GPU budget exists.
 */
export async function generateClip(
  videoUrl: string,
  startTime: number,
  endTime: number,
  platform: string
) {
  const output = await replicate.run(
    "stability-ai/stable-video-diffusion:3f...", // Replace with a real video model
    {
      input: {
        video: videoUrl,
        start_time: startTime,
        end_time: endTime,
        aspect_ratio: platform === "TIKTOK" ? "9:16" : "4:5",
      },
    }
  );
  return output;
}
