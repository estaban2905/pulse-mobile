import * as FileSystem from 'expo-file-system/legacy';
import type { Track } from '../types/api';

export async function downloadTrackFile(track: Track, onProgress?: (progress: number) => void): Promise<string> {
  if (!FileSystem.documentDirectory) throw new Error('El dispositivo no permite guardar archivos en este momento.');
  const destination = `${FileSystem.documentDirectory}pulse-${track.id}.mp3`;
  const task = FileSystem.createDownloadResumable(
    track.streamUrl,
    destination,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) onProgress?.(totalBytesWritten / totalBytesExpectedToWrite);
    }
  );
  const result = await task.downloadAsync();
  if (!result?.uri) throw new Error('La descarga no pudo completarse.');
  return result.uri;
}

export async function removeTrackFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
