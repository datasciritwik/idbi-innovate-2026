/** Plays base64-encoded WAV clips back-to-back in the order they're enqueued —
 * audio chunks for a streamed reply arrive as separate sentences, but should
 * still sound like one continuous response. */

let queue: string[] = [];
let currentAudio: HTMLAudioElement | null = null;

function playNext() {
  const next = queue.shift();
  if (!next) {
    currentAudio = null;
    return;
  }
  const audio = new Audio(`data:audio/wav;base64,${next}`);
  currentAudio = audio;
  audio.addEventListener('ended', playNext);
  audio.play().catch(playNext);
}

export function enqueueAudioChunk(base64: string) {
  queue.push(base64);
  if (!currentAudio) playNext();
}

/** Stops any in-flight clip and clears pending chunks — call before starting a new reply,
 * or immediately on barge-in when the user starts speaking over Wren. */
export function resetAudioQueue() {
  queue = [];
  currentAudio?.pause();
  currentAudio = null;
}

export function isSpeaking(): boolean {
  return currentAudio !== null;
}
