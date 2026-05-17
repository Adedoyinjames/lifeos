declare module "react-native-sherpa-onnx" {
  export function listAssetModels(): Promise<Array<{ folder: string; hint?: string }>>;
}

declare module "react-native-sherpa-onnx/stt" {
  export function createSTT(config: Record<string, unknown>): Promise<{
    transcribeSamples(samples: number[] | Float32Array, sampleRate: number): Promise<{ text?: string; result?: { text?: string } } | string>;
    destroy(): Promise<void>;
  }>;
}

declare module "react-native-sherpa-onnx/tts" {
  export function createStreamingTTS(config: Record<string, unknown>): Promise<{
    getSampleRate(): Promise<number>;
    startPcmPlayer(sampleRate: number, channelCount: number): Promise<void>;
    writePcmChunk(samples: number[]): Promise<void>;
    stopPcmPlayer(): Promise<void>;
    generateSpeechStream(
      text: string,
      options?: Record<string, unknown>,
      handlers?: {
        onChunk?: (chunk: { samples: number[]; sampleRate: number; progress?: number; isFinal?: boolean }) => void;
        onEnd?: () => void;
        onError?: (error: { message?: string }) => void;
      },
    ): Promise<{ cancel(): Promise<void>; unsubscribe(): void }>;
    destroy(): Promise<void>;
  }>;
}

declare module "react-native-sherpa-onnx/audio" {
  export function createPcmLiveStream(options?: { sampleRate?: number; channelCount?: number; bufferSizeFrames?: number }): {
    start(): Promise<void>;
    stop(): Promise<void>;
    onData(callback: (samples: Float32Array, sampleRate: number) => void): () => void;
    onError(callback: (message: string) => void): () => void;
  };
}
