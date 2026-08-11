import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '../../contexts/PlayerContext';
import { colors, spacing } from '../../theme';
import { formatTime } from '../../utils/format';

interface ProgressBarProps {
  compact?: boolean;
  showTimes?: boolean;
}

export function ProgressBar({ compact = false, showTimes }: ProgressBarProps) {
  const player = usePlayer();
  const [sliding, setSliding] = useState(false);
  const [preview, setPreview] = useState(player.position);
  const duration = Math.max(0, player.duration);
  const resolvedShowTimes = showTimes ?? !compact;

  useEffect(() => {
    if (!sliding) setPreview(player.position);
  }, [player.position, sliding]);

  const value = Math.min(duration || 1, Math.max(0, sliding ? preview : player.position));

  return (
    <View style={styles.container}>
      <Slider
        accessibilityLabel="Progreso de la canción"
        disabled={!duration}
        maximumTrackTintColor={colors.surfaceSoft}
        maximumValue={duration || 1}
        minimumTrackTintColor={colors.accent}
        minimumValue={0}
        onSlidingComplete={(seconds) => {
          setSliding(false);
          player.seek(seconds);
        }}
        onSlidingStart={() => setSliding(true)}
        onValueChange={setPreview}
        style={[styles.slider, compact && styles.compactSlider]}
        thumbTintColor={compact ? colors.accent : colors.text}
        value={value}
      />
      {resolvedShowTimes ? (
        <View style={styles.times}>
          <Text style={styles.time}>{formatTime(sliding ? preview : player.position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  slider: {
    width: '100%',
    height: 36,
    marginHorizontal: -2
  },
  compactSlider: {
    height: 18
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums']
  }
});
