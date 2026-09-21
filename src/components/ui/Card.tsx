import { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

export function Card({ children, style, className, ...props }: PropsWithChildren<ViewProps & { className?: string }>) {
  return <View {...props} className={['rounded-2xl border border-border bg-white p-4', className].filter(Boolean).join(' ')} style={style}>{children}</View>;
}
