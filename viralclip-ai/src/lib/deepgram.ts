import { createClient } from "@deepgram/sdk";
import type { TranscriptInput, Utterance } from "@/lib/ai";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function transcribeVideo(audioUrl: string) {
  const { result } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    { model: "nova-2", smart_format: true, utterances: true }
  );
  return result;
}

/**
 * Adapt a Deepgram prerecorded result into the viral-detection graph's input
 * contract. Deepgram `utterances` already carry start/end/transcript, which is
 * exactly the timed-unit shape the segmenter expects.
 */
export function toTranscriptInput(
  videoId: string,
  durationSec: number,
  deepgramResult: unknown
): TranscriptInput {
  const r = deepgramResult as {
    results?: { utterances?: Array<{ start: number; end: number; transcript: string }> };
  };
  const raw = r?.results?.utterances ?? [];
  const utterances: Utterance[] = raw
    .filter((u) => typeof u.start === "number" && typeof u.end === "number" && u.transcript)
    .map((u) => ({ start: u.start, end: u.end, text: u.transcript }));
  return { videoId, durationSec, utterances };
}
