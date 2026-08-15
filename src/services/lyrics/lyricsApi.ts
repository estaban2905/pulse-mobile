import { createLyricsApi } from '@pulse/core';
import { apiRequest } from '../api';

const lyrics = createLyricsApi(apiRequest);

export const cachedLyrics = lyrics.cached;
export const fetchLyrics = lyrics.fetch;

export type { LyricsResult, LyricsStatus } from '@pulse/core';
