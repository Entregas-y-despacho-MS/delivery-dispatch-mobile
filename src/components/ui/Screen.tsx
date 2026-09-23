import { PropsWithChildren } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
  className?: string;
  contentClassName?: string;
}

export function Screen({ children, scroll = true, scrollProps, className, contentClassName }: ScreenProps) {
  const content = <View className={contentClassName ?? 'grow p-4'}>{children}</View>;

  return (
    <SafeAreaView className={['flex-1 bg-canvas', className].filter(Boolean).join(' ')}>
      {scroll ? <ScrollView {...scrollProps}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}
