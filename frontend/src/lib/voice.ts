import { MicVAD } from '@ricky0123/vad-web';
import { float32ToWavBase64 } from './wavEncode';

export interface VoiceSessionCallbacks {
  /** User started speaking — including "barge-in" while Vitta is still talking. */
  onSpeechStart: () => void;
  /** User finished an utterance; `wavBase64` is ready to send to the backend. */
  onSpeechEnd: (wavBase64: string) => void;
}

let vad: MicVAD | null = null;

// Serving these assets (ONNX model + worklet + onnxruntime-web wasm) from a
// local /public path hits a real Vite/Rolldown incompatibility: onnxruntime-web
// loads its wasm backend via a dynamic import(), and Vite's dev server refuses
// to serve /public files through import() (only via <script>/fetch). jsDelivr
// (pinned to our exact installed versions) sidesteps that entirely.
const VAD_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/';
const ORT_CDN_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

/** Starts continuous mic listening with voice-activity detection. */
export async function startVoiceSession(callbacks: VoiceSessionCallbacks): Promise<void> {
  await stopVoiceSession();

  vad = await MicVAD.new({
    baseAssetPath: VAD_CDN_BASE,
    onnxWASMBasePath: ORT_CDN_BASE,
    onSpeechStart: callbacks.onSpeechStart,
    onSpeechEnd: (audio) => callbacks.onSpeechEnd(float32ToWavBase64(audio)),
  });
  vad.start();
}

export async function stopVoiceSession(): Promise<void> {
  if (!vad) return;
  await vad.destroy();
  vad = null;
}

export function isVoiceSessionActive(): boolean {
  return vad !== null;
}
