import { Pressable, type ViewStyle } from 'react-native';

interface IconButtonProps {
  accessibilityLabel: string;
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function IconButton({ accessibilityLabel, children, onPress, disabled, style }: IconButtonProps) {
  return <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-white p-2 pressed:opacity-75 disabled:opacity-50" style={style}>{children}</Pressable>;
}
