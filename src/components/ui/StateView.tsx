import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors } from '@/theme/tokens';

export function LoadingView() {
  return <View className="items-center justify-center p-8"><ActivityIndicator color={colors.brand} /></View>;
}

export function EmptyView({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <View className="items-center justify-center p-8">
      {icon ? (
        <View className="mb-3" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {icon}
        </View>
      ) : null}
      <AppText variant="heading" className="text-center">{title}</AppText>
      {description ? <AppText className="mt-2 text-center">{description}</AppText> : null}
    </View>
  );
}

interface ErrorViewProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorView({ title, description, onRetry, retryLabel = 'Reintentar' }: ErrorViewProps) {
  return (
    <View className="items-center justify-center gap-3 p-8">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <CircleAlert size={24} color={colors.red} />
      </View>
      <AppText variant="heading" className="text-center">{title}</AppText>
      {description ? <AppText className="text-center">{description}</AppText> : null}
      {onRetry ? (
        <View className="mt-2 w-full max-w-xs">
          <PrimaryButton label={retryLabel} variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
