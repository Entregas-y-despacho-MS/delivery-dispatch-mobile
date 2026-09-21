import { Text, type TextProps } from 'react-native';

type Variant = 'title' | 'heading' | 'body' | 'caption' | 'label';

const classNames: Record<Variant, string> = {
  title: 'text-[28px] leading-[34px] font-extrabold text-ink',
  heading: 'text-[19px] leading-[25px] font-bold text-ink',
  body: 'text-[15px] leading-[22px] text-slate',
  caption: 'text-xs leading-[17px] text-muted',
  label: 'text-[13px] leading-[18px] font-bold text-slate',
};

export function AppText({ variant = 'body', style, className, ...props }: TextProps & { variant?: Variant; className?: string }) {
  return <Text {...props} className={[classNames[variant], className].filter(Boolean).join(' ')} style={style} />;
}
