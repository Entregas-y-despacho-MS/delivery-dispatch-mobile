import { ActivityIndicator, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { colors } from '@/theme/tokens';

export function LoadingView() {
  return <View className="items-center justify-center p-8"><ActivityIndicator color={colors.brand} /></View>;
}

export function EmptyView({ title, description }: { title: string; description?: string }) {
  return <View className="items-center justify-center p-8"><AppText variant="heading" className="text-center">{title}</AppText>{description && <AppText className="mt-2 text-center">{description}</AppText>}</View>;
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
