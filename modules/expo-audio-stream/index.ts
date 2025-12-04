import { EventEmitter, requireNativeModule, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to ExpoAudioStream.web.ts
// and on native platforms to ExpoAudioStream.ts
const ExpoAudioStream = requireNativeModule('ExpoAudioStream');

export type AudioEvent = {
  data: string;      // The Base64 PCM bytes
  amplitude: number; // The 0.0-1.0 volume level
};

const emitter = new EventEmitter(ExpoAudioStream);

export function addAudioListener(listener: (event: AudioEvent) => void): Subscription {
  return emitter.addListener<AudioEvent>('onAudioStream', listener);
}

export async function startRecordingAsync(): Promise<void> {
  return await ExpoAudioStream.startRecording();
}

export async function stopRecordingAsync(): Promise<void> {
  return await ExpoAudioStream.stopRecording();
}

export { ExpoAudioStream };
