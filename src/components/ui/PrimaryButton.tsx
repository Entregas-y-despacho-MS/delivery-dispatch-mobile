import { ActivityIndicator, Pressable } from 'react-native';
import { AppText } from '@/components/ui/AppText';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({ label, onPress, loading, variant = 'primary' }: PrimaryButtonProps) {
  const className = variant === 'primary' ? 'border-brand bg-brand' : variant === 'danger' ? 'border-danger bg-danger' : 'border-brand bg-white';
  const textColor = variant === 'secondary' ? '#2563EB' : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      className={['min-h-[52px] items-center justify-center rounded-xl border p-3 pressed:opacity-80 disabled:opacity-60', className].join(' ')}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <AppText className={variant === 'secondary' ? 'font-bold text-brand' : 'font-bold text-white'}>{label}</AppText>}
    </Pressable>
  );
}
