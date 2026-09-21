import { TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

export function TextField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType = 'default' }: TextFieldProps) {
  return <View className="gap-2"><AppText variant="label" className="text-ink">{label}</AppText><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8A97AA" secureTextEntry={secureTextEntry} keyboardType={keyboardType} className="h-[50px] rounded-xl border border-border bg-white px-3 text-[15px] text-ink" /></View>;
}
