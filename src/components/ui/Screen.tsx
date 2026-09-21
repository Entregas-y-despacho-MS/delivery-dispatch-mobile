import { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, View, type ScrollViewProps } from 'react-native';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
}

export function Screen({ children, scroll = true, scrollProps }: ScreenProps) {
  const content = <View className="grow p-4">{children}</View>;

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      {scroll ? <ScrollView {...scrollProps}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}
