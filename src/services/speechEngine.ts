import { PermissionsAndroid, Platform } from "react-native";

const STT_MODEL_PATH = "models/sherpa-onnx-whisper-tiny.en";
const TTS_MODEL_PATH = "models/vits-piper-en_US-lessac-medium";
const SAMPLE_RATE = 16000;
const LISTEN_WINDOW_MS = 6500;

let ttsEngine: any | null = null;
let sttEngine: any | null = null;
let speakingQueue = Promise.resolve();

async function assetModelPath(path: string): Promise<any> {
  return { type: "asset", path };
}

async function ensureMicrophonePermission(): Promise<void> {
  if (Platform.OS !== "android") return;
  const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  if (status !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("Microphone permission is needed for Hey Bob voice commands.");
  }
}

async function speakNow(text: string): Promise<void> {
  if (!text.trim()) return;
  const tts = await import("react-native-sherpa-onnx/tts");
  if (!ttsEngine) {
    ttsEngine = await tts.createStreamingTTS({
      modelPath: await assetModelPath(TTS_MODEL_PATH),
      modelType: "auto",
      numThreads: 2,
    });
  }
  const sampleRate = await ttsEngine.getSampleRate();
  await ttsEngine.startPcmPlayer(sampleRate || SAMPLE_RATE, 1);
  try {
    await new Promise<void>((resolve, reject) => {
      void ttsEngine.generateSpeechStream(
        text,
        { sid: 0, speed: 1.0 },
        {
          onChunk: (chunk: { samples: number[]; sampleRate: number }) => {
            if (chunk.samples.length > 0) void ttsEngine.writePcmChunk(chunk.samples);
          },
          onEnd: resolve,
          onError: (error: { message?: string }) => reject(new Error(error.message ?? "TTS playback failed")),
        },
      );
    });
  } finally {
    await ttsEngine.stopPcmPlayer();
  }
}

export async function speak(text: string): Promise<void> {
  speakingQueue = speakingQueue.catch(() => undefined).then(() => speakNow(text));
  return speakingQueue;
}

export async function listenOnce(): Promise<string> {
  await ensureMicrophonePermission();
  const pcmModule = await import("react-native-sherpa-onnx/audio");
  const stt = await import("react-native-sherpa-onnx/stt");
  if (!sttEngine) {
    sttEngine = await stt.createSTT({
      modelPath: await assetModelPath(STT_MODEL_PATH),
      modelType: "auto",
      preferInt8: true,
      numThreads: 2,
    });
  }
  const pcm = pcmModule.createPcmLiveStream({ sampleRate: SAMPLE_RATE, channelCount: 1 });
  const chunks: number[] = [];
  let capturedRate = SAMPLE_RATE;
  let capturedError: Error | null = null;
  const unsubscribeData = pcm.onData((samples: Float32Array, sampleRate: number) => {
    capturedRate = sampleRate || SAMPLE_RATE;
    chunks.push(...Array.from(samples));
  });
  const unsubscribeError = pcm.onError((message: string) => {
    capturedError = new Error(message);
  });
  try {
    await pcm.start();
    await new Promise((resolve) => setTimeout(resolve, LISTEN_WINDOW_MS));
    await pcm.stop();
  } finally {
    unsubscribeData();
    unsubscribeError();
  }
  if (capturedError) throw capturedError;
  if (chunks.length < SAMPLE_RATE) throw new Error("I did not hear enough audio. Try speaking closer to the microphone.");
  const result = await sttEngine.transcribeSamples(Float32Array.from(chunks), capturedRate);
  const text = (typeof result === "string" ? result : result?.text ?? result?.result?.text ?? "").trim();
  if (!text) throw new Error("I did not catch that. Try speaking closer to the microphone.");
  return text;
}

export async function speechEngineStatus(): Promise<"ready" | "missing"> {
  try {
    const sherpa = await import("react-native-sherpa-onnx");
    const models = await sherpa.listAssetModels();
    const hasStt = models.some((model: { folder: string }) => model.folder === "sherpa-onnx-whisper-tiny.en");
    const hasTts = models.some((model: { folder: string }) => model.folder === "vits-piper-en_US-lessac-medium");
    return hasStt && hasTts ? "ready" : "missing";
  } catch {
    return "missing";
  }
}
