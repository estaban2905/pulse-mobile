import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MediaCard,
  Screen,
  ScreenHeader,
  Section,
  SettingRow,
  TrackRow
} from '../components';
import { useCatalog } from '../contexts/CatalogContext';
import { useLibrary } from '../contexts/LibraryContext';
import { colors, PLAYER_OVERLAY_CLEARANCE, radii, spacing } from '../theme';

type SearchFilter = 'all' | 'tracks' | 'artists' | 'albums';

const filters: Array<{ id: SearchFilter; label: string }> = [
  { id: 'all', label: 'Todo' },
  { id: 'tracks', label: 'Canciones' },
  { id: 'artists', label: 'Artistas' },
  { id: 'albums', label: 'Álbumes' }
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

export function SearchScreen() {
  const { catalog, loading, error, refresh, getArtist, genres } = useCatalog();
  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useLibrary();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');

  const normalizedQuery = normalize(query);
  const results = useMemo(() => {
    if (!catalog || !normalizedQuery) return { tracks: [], artists: [], albums: [] };

    const artists = catalog.artists.filter((artist) =>
      normalize(`${artist.name} ${artist.genres.join(' ')}`).includes(normalizedQuery)
    );
    const albums = catalog.albums.filter((album) =>
      normalize(`${album.title} ${catalog.artists.find((artist) => artist.id === album.artistId)?.name ?? ''}`).includes(normalizedQuery)
    );
    const tracks = catalog.tracks.filter((track) => {
      const artist = catalog.artists.find((item) => item.id === track.artistId)?.name ?? '';
      const album = catalog.albums.find((item) => item.id === track.albumId)?.title ?? '';
      return normalize(`${track.title} ${artist} ${album}`).includes(normalizedQuery);
    });
    return { tracks, artists, albums };
  }, [catalog, normalizedQuery]);

  const commitSearch = () => {
    if (query.trim()) addRecentSearch(query);
  };

  if (loading && !catalog) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.centered}>
        <LoadingState message="Preparando la búsqueda…" />
      </Screen>
    );
  }

  if (error && !catalog) {
    return (
      <Screen scroll={false} contentContainerStyle={styles.centered}>
        <ErrorState message={error} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  if (!catalog) return null;

  const total = results.tracks.length + results.artists.length + results.albums.length;
  const showTracks = filter === 'all' || filter === 'tracks';
  const showArtists = filter === 'all' || filter === 'artists';
  const showAlbums = filter === 'all' || filter === 'albums';

  return (
    <Screen contentContainerStyle={styles.screen}>
      <ScreenHeader title="Buscar" subtitle="Canciones, artistas y álbumes" />

      <View style={styles.searchBox}>
        <Ionicons name="search" size={19} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Buscar en Pulse Music"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          onSubmitEditing={commitSearch}
          placeholder="¿Qué quieres escuchar?"
          placeholderTextColor={colors.textDim}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        {query.length > 0 ? (
          <IconButton
            name="close-circle"
            size={19}
            color={colors.textMuted}
            accessibilityLabel="Borrar búsqueda"
            onPress={() => setQuery('')}
          />
        ) : null}
      </View>

      {normalizedQuery ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {filters.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={filter === item.id}
              onPress={() => setFilter(item.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {!normalizedQuery ? (
        <>
          {recentSearches.length > 0 ? (
            <Section
              title="Búsquedas recientes"
              actionLabel="Limpiar"
              onAction={clearRecentSearches}
            >
              <View style={styles.recentList}>
                {recentSearches.map((term) => (
                  <SettingRow
                    key={term}
                    icon="time-outline"
                    title={term}
                    onPress={() => setQuery(term)}
                    right={(
                      <IconButton
                        name="close"
                        size={18}
                        color={colors.textMuted}
                        accessibilityLabel={`Eliminar búsqueda ${term}`}
                        onPress={() => removeRecentSearch(term)}
                      />
                    )}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          {genres.length > 0 ? (
            <Section title="Explorar géneros" subtitle="Encuentra algo según tu estilo">
              <View style={styles.genreGrid}>
                {genres.slice(0, 8).map((genre) => (
                  <Pressable
                    key={genre.id}
                    onPress={() => router.push({ pathname: '/collection/[kind]/[id]', params: { kind: 'genre', id: genre.slug } })}
                    style={({ pressed }) => [styles.genreCard, { backgroundColor: genre.color }, pressed && styles.pressed]}
                  >
                    <Text style={styles.genreTitle}>{genre.name}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          ) : null}
        </>
      ) : total === 0 ? (
        <EmptyState
          icon="search-outline"
          title={`Sin resultados para “${query.trim()}”`}
          description="Prueba con otro nombre de canción, artista o álbum."
          actionLabel="Borrar búsqueda"
          onAction={() => setQuery('')}
        />
      ) : (
        <View style={styles.results}>
          {showTracks && results.tracks.length > 0 ? (
            <Section title="Canciones" subtitle={`${results.tracks.length} resultados`}>
              <View style={styles.trackList}>
                {results.tracks.map((track, position) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    queue={results.tracks.map((item) => item.id)}
                    position={position}
                    contextLabel={`Resultados de ${query.trim()}`}
                    showAlbum
                  />
                ))}
              </View>
            </Section>
          ) : null}

          {showArtists && results.artists.length > 0 ? (
            <Section title="Artistas" horizontal>
              {results.artists.map((artist) => (
                <MediaCard
                  key={artist.id}
                  image={artist.photoUrl}
                  title={artist.name}
                  subtitle={artist.genres[0]}
                  round
                  onPress={() => {
                    commitSearch();
                    router.push({ pathname: '/artist/[id]', params: { id: artist.id } });
                  }}
                />
              ))}
            </Section>
          ) : null}

          {showAlbums && results.albums.length > 0 ? (
            <Section title="Álbumes" horizontal>
              {results.albums.map((album) => (
                <MediaCard
                  key={album.id}
                  image={album.coverUrl}
                  title={album.title}
                  subtitle={`${getArtist(album.artistId)?.name ?? 'Artista'} · ${album.year}`}
                  onPress={() => {
                    commitSearch();
                    router.push({ pathname: '/album/[id]', params: { id: album.id } });
                  }}
                />
              ))}
            </Section>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: PLAYER_OVERLAY_CLEARANCE, gap: spacing.lg },
  centered: { flex: 1, justifyContent: 'center' },
  searchBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: spacing.md },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
  recentList: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  results: { gap: spacing.xxl },
  trackList: { gap: spacing.xs },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  genreCard: {
    width: '47.8%',
    minHeight: 86,
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderRadius: radii.lg
  },
  genreTitle: { color: colors.white, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }
});
