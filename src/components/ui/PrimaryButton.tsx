import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { colors } from '@/theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  trailingIcon?: ReactNode;
}

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary', trailingIcon }: PrimaryButtonProps) {
  const isDisabled = Boolean(loading || disabled);
  const className = variant === 'primary' ? 'border-action bg-action' : variant === 'danger' ? 'border-danger bg-danger' : 'border-brand bg-white';
  const textColor = variant === 'primary' ? colors.ink : variant === 'secondary' ? colors.brand : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading ? `${label}, cargando` : label}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={onPress}
      className={['min-h-[52px] flex-row items-center justify-center gap-2 rounded-xl border p-3 pressed:opacity-80 disabled:opacity-60', className].join(' ')}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <>
        <AppText className="font-bold" style={{ color: textColor }}>{label}</AppText>
        {trailingIcon ? <>{trailingIcon}</> : null}
      </>}
    </Pressable>
  );
}
