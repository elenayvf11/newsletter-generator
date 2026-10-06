import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

// App chrome mirrors epistle's web UI (app/globals.css): pastel purple,
// 2px borders, hard 4px offset shadows, Space Mono labels.
export const colors = {
  bg: '#f0ebff',
  card: '#ffffff',
  cardBorder: '#c8b4e8',
  header: '#ead8f8',
  content: '#fdf8ff',
  title: '#3a2858',
  subtitle: '#9070b8',
  label: '#7060a0',
  accent: '#a870c8',
  button: '#e4ccf8',
  buttonBorder: '#c890e8',
  muted: '#ede8f8',
  danger: '#c04878',
};

export const fonts = {
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.subtitle}
      {...props}
      style={[styles.field, props.multiline && styles.multiline, props.style]}
    />
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.dangerButton,
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, variant === 'danger' && { color: colors.danger }]}>{title}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 48, gap: 16 },
  card: {
    backgroundColor: colors.content,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    padding: 16,
    shadowColor: colors.cardBorder,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  label: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.title,
  },
  multiline: { minHeight: 140, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.button,
    borderWidth: 2,
    borderColor: colors.buttonBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondary: { backgroundColor: colors.muted, borderColor: colors.cardBorder },
  dangerButton: { backgroundColor: '#fff', borderColor: '#e8b4c8' },
  buttonText: { fontFamily: fonts.monoBold, fontSize: 14, color: colors.title },
  title: { fontFamily: fonts.monoBold, fontSize: 18, color: colors.title },
  subtitle: { fontFamily: fonts.mono, fontSize: 13, color: colors.subtitle },
});
