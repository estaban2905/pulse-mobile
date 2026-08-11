import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { usePlayer } from '../../contexts/PlayerContext';
import { colors, radii, spacing, shadows } from '../../theme';
import { IconButton } from '../ui/IconButton';

interface PlayerControlsProps {
  compact?: boolean;
}

export function PlayerControls({ compact = false }: PlayerControlsProps) {
  const player = usePlayer();
  const mainSize = compact ? 52 : 66;

  return (
    <View style={[styles.controls, compact && styles.compactControls]}>
      {!compact ? (
        <IconButton
          accessibilityLabel="Reproducción aleatoria"
          active={player.shuffle}
          color={player.shuffle ? colors.accent : colors.textMuted}
          name="shuffle"
          onPress={player.toggleShuffle}
        />
      ) : null}
      <IconButton
        accessibilityLabel="Canción anterior"
        iconSize={compact ? 27 : 31}
        name="play-skip-back"
        onPress={player.previous}
        size={compact ? 44 : 52}
      />

      <Pressable
        accessibilityLabel={player.isPlaying ? 'Pausar' : 'Reproducir'}
        accessibilityRole="button"
        onPress={player.toggle}
        style={({ pressed }) => [
          styles.main,
          { width: mainSize, height: mainSize, borderRadius: mainSize / 2 },
          shadows.card,
          pressed && styles.mainPressed
        ]}
      >
        {player.isBuffering ? (
          <ActivityIndicator color={colors.accentInk} />
        ) : (
          <Ionicons
            name={player.isPlaying ? 'pause' : 'play'}
            color={colors.accentInk}
            size={compact ? 27 : 32}
            style={!player.isPlaying ? styles.playIcon : undefined}
          />
        )}
      </Pressable>

      <IconButton
        accessibilityLabel="Canción siguiente"
        iconSize={compact ? 27 : 31}
        name="play-skip-forward"
        onPress={player.next}
        size={compact ? 44 : 52}
      />
      {!compact ? (
        <View>
          <IconButton
            accessibilityLabel={`Repetición ${player.repeat === 'off' ? 'desactivada' : player.repeat === 'one' ? 'de una canción' : 'de la cola'}`}
            active={player.repeat !== 'off'}
            color={player.repeat !== 'off' ? colors.accent : colors.textMuted}
            name="repeat"
            onPress={player.cycleRepeat}
          />
          {player.repeat === 'one' ? <View style={styles.repeatBadge}><Ionicons name="ellipse" size={5} color={colors.accent} /></View> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  compactControls: {
    justifyContent: 'center',
    gap: spacing.lg
  },
  main: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent
  },
  mainPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.94 }]
  },
  playIcon: {
    marginLeft: 3
  },
  repeatBadge: {
    position: 'absolute',
    right: 8,
    top: 7,
    width: 11,
    height: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.background
  }
});
