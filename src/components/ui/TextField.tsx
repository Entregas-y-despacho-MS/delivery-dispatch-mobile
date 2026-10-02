import { useState, type ReactNode, type Ref } from 'react';
import { TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { colors } from '@/theme/tokens';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<TextInput>;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  leadingIcon?: ReactNode;
  trailingAction?: ReactNode;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoComplete?: 'off' | 'email' | 'password' | 'username';
}

export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  inputRef,
  error,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  leadingIcon,
  trailingAction,
  autoCapitalize,
  autoCorrect,
  autoComplete,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-2">
      <AppText variant="label" className="text-ink">
        {label}
      </AppText>
      <View
        className={[
          'min-h-[54px] flex-row items-center rounded-2xl border bg-white px-4',
          error ? 'border-danger' : focused ? 'border-turquoise' : 'border-border',
        ].join(' ')}
      >
        {leadingIcon ? <View className="mr-3">{leadingIcon}</View> : null}
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={error}
          value={value}
          onChangeText={onChangeText}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          selectionColor={colors.turquoise}
          onFocus={() => setFocused(true)}
          className="min-h-[52px] flex-1 py-0 text-[15px] text-ink"
        />
        {trailingAction ? <View className="ml-2">{trailingAction}</View> : null}
      </View>
      {error ? <AppText variant="error" accessibilityLiveRegion="polite">{error}</AppText> : null}
    </View>
  );
}
