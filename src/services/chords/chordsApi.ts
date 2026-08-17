import { createChordsApi } from '@pulse/core';
import { apiRequest } from '../api';

const chords = createChordsApi(apiRequest);

export const cachedChords = chords.cached;
export const fetchChords = chords.fetch;

export type { ChordEvent, ChordPlacement, ChordSheetLine, ChordsResult, ChordsStatus } from '@pulse/core';
