import { router, type Href } from 'expo-router';

/**
 * Returns to the previous screen when the navigator has history. Deep links and
 * restored routes do not always have a previous entry, so they need a stable
 * destination instead of leaving the back button with no visible effect.
 */
export function goBackOrReplace(fallback: Href = '/') {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
