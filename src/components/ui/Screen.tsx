import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

interface ScreenHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function Screen({ children, scroll = true, contentContainerStyle, style }: ScreenProps) {
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.safeArea, style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.staticContent, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function ScreenHeader({ title, eyebrow, subtitle, onBack, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Ionicons name="chevron-back" color={colors.text} size={25} />
        </Pressable>
      ) : null}

      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 150
  },
  staticContent: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xl
  },
  back: {
    width: 40,
    height: 40,
    marginLeft: -spacing.sm,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20
  },
  backPressed: {
    backgroundColor: colors.surfaceRaised
  },
  headerCopy: {
    flex: 1,
    minWidth: 0
  },
  headerRight: {
    minHeight: 40,
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: spacing.xs
  },
  title: {
    ...typography.title,
    color: colors.text
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm
  }
});
