import type { Catalog } from '../types/api';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/v1').replace(/\/$/, '');

export async function getCatalog(signal?: AbortSignal): Promise<Catalog> {
  const response = await fetch(`${API_URL}/catalog`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`La API respondió ${response.status}`);
  return response.json() as Promise<Catalog>;
}

export async function getHealth(signal?: AbortSignal): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/health`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`La API respondió ${response.status}`);
  return response.json() as Promise<{ status: string }>;
}
