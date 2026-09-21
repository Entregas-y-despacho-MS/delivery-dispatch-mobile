import { ActivityIndicator, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';

export function LoadingView() {
  return <View className="items-center justify-center p-8"><ActivityIndicator color="#2563EB" /></View>;
}

export function EmptyView({ title, description }: { title: string; description?: string }) {
  return <View className="items-center justify-center p-8"><AppText variant="heading" className="text-center">{title}</AppText>{description && <AppText className="mt-2 text-center">{description}</AppText>}</View>;
}
