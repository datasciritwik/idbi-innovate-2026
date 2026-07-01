let currentAudio: HTMLAudioElement | null = null;

/** Plays a base64-encoded WAV clip, stopping any previously playing one. */
export function playBase64Wav(base64: string) {
  currentAudio?.pause();
  const audio = new Audio(`data:audio/wav;base64,${base64}`);
  currentAudio = audio;
  audio.play().catch(() => {
    // Autoplay can be blocked before the user has interacted with the page —
    // the quick-action/send buttons that trigger this are themselves a user
    // gesture, so this is mainly a safety net, not expected to fire often.
  });
}
