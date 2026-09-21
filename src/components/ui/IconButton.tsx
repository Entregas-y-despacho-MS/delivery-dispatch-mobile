import { Pressable, type ViewStyle } from 'react-native';

interface IconButtonProps {
  accessibilityLabel: string;
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function IconButton({ accessibilityLabel, children, onPress, style }: IconButtonProps) {
  return <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress} className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-white p-2 pressed:opacity-75" style={style}>{children}</Pressable>;
}
