export interface EditorialPlaylist {
  id: string;
  title: string;
  description: string;
  coverTrackId: string;
  trackIds: string[];
}

export interface MoodCollection {
  id: string;
  name: string;
  description: string;
  color: string;
  trackIds: string[];
}

const allTrackIds = [
  'tr-jigsaw', 'tr-no-surprises', 'tr-disappear', 'tr-let-it-happen', 'tr-less-i-know',
  'tr-in-my-head', 'tr-apocalypse', 'tr-cry', 'tr-something-about-us',
  'tr-somewhere-only-we-know', 'tr-i-dont-love-you', 'tr-feels-like-backwards',
  'tr-vital-signs', 'tr-selfless', 'tr-you-only-live-once', 'tr-the-kill'
];

export const editorialPlaylists: EditorialPlaylist[] = [
  { id: 'all-local', title: 'Tu colección local', description: 'Todas las canciones disponibles en Pulse.', coverTrackId: 'tr-jigsaw', trackIds: allTrackIds },
  { id: 'radiohead-essential', title: 'Radiohead esencial', description: 'Tres etapas distintas de Radiohead.', coverTrackId: 'tr-disappear', trackIds: ['tr-jigsaw', 'tr-no-surprises', 'tr-disappear'] },
  { id: 'tame-impala', title: 'Tame Impala', description: 'Psicodelia, guitarras y sintetizadores.', coverTrackId: 'tr-let-it-happen', trackIds: ['tr-let-it-happen', 'tr-less-i-know', 'tr-feels-like-backwards', 'tr-vital-signs'] },
  { id: 'slow-night', title: 'Noche lenta', description: 'Dream pop e indie para bajar el ritmo.', coverTrackId: 'tr-apocalypse', trackIds: ['tr-apocalypse', 'tr-cry', 'tr-in-my-head', 'tr-selfless'] },
  { id: 'alternative-rock', title: 'Rock alternativo', description: 'Guitarras, piano y grandes estribillos.', coverTrackId: 'tr-i-dont-love-you', trackIds: ['tr-jigsaw', 'tr-somewhere-only-we-know', 'tr-i-dont-love-you', 'tr-you-only-live-once', 'tr-the-kill'] }
];

export const moods: MoodCollection[] = [
  { id: 'focus', name: 'Concentración', description: 'Una sesión larga y envolvente.', color: '#587891', trackIds: ['tr-disappear', 'tr-let-it-happen', 'tr-in-my-head', 'tr-apocalypse'] },
  { id: 'road', name: 'Viajar', description: 'Psicodelia y rock para el camino.', color: '#8C4D95', trackIds: allTrackIds },
  { id: 'relax', name: 'Relax', description: 'Baja las revoluciones.', color: '#75A4BC', trackIds: ['tr-no-surprises', 'tr-disappear', 'tr-cry', 'tr-something-about-us'] },
  { id: 'party', name: 'Fiesta', description: 'Ritmo y sintetizadores.', color: '#E14B34', trackIds: ['tr-less-i-know', 'tr-jigsaw', 'tr-you-only-live-once', 'tr-the-kill'] }
];

export const genreColors: Record<string, string> = {
  'Rock alternativo': '#E14B34',
  'Art rock': '#587891',
  Psicodelia: '#8C4D95',
  Indie: '#C98A4B',
  'Dream pop': '#8D8B87',
  Electrónica: '#D1B05B',
  'Indie rock': '#D65B46',
  Emo: '#686868',
  'Ambient pop': '#65748A',
  'French house': '#C49B45',
  'Piano rock': '#9D8A62',
  'Garage rock': '#A44F42',
  'Post-grunge': '#74433F'
};
