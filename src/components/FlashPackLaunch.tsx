import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StatusBar, Text, useWindowDimensions, View } from 'react-native';
import LottieView from 'lottie-react-native';
import * as NativeSplashScreen from 'expo-splash-screen';
import { colors } from '@/theme/tokens';

const truck = require('../../assets/branding/flash-pack-truck.png');
const motion = require('../../assets/animations/flash-pack-intro.json');

interface FlashPackLaunchProps {
  appReady: boolean;
  onComplete: () => void;
}

export function FlashPackLaunch({ appReady, onComplete }: FlashPackLaunchProps) {
  const { width } = useWindowDimensions();
  const animation = useRef<LottieView>(null);
  const [truckProgress] = useState(() => new Animated.Value(0));
  const [wordmarkOpacity] = useState(() => new Animated.Value(0));
  const [wordmarkRise] = useState(() => new Animated.Value(12));
  const [brandScale] = useState(() => new Animated.Value(0.9));
  const [opacity] = useState(() => new Animated.Value(1));
  const nativeHidden = useRef(false);
  const exiting = useRef(false);
  const [laidOut, setLaidOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [statusOnBlue, setStatusOnBlue] = useState(false);
  const [brandRevealed, setBrandRevealed] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [waitingVisible, setWaitingVisible] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduceMotion(value);
      })
      .catch(() => {
        if (active) setReduceMotion(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!laidOut || !imageLoaded || reduceMotion === null || nativeHidden.current) return;
    nativeHidden.current = true;
    let active = true;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    let shiftStatus: ReturnType<typeof setTimeout> | undefined;
    let revealWordmark: ReturnType<typeof setTimeout> | undefined;

    void NativeSplashScreen.hideAsync()
      .catch(() => undefined)
      .then(() => {
        if (!active) return;
        if (reduceMotion) {
          setAnimationFinished(true);
          return;
        }

        animation.current?.play();
        Animated.timing(truckProgress, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }).start();
        shiftStatus = setTimeout(() => {
          if (active) setStatusOnBlue(true);
        }, 600);
        revealWordmark = setTimeout(() => {
          if (!active) return;
          setBrandRevealed(true);
          Animated.parallel([
            Animated.timing(wordmarkOpacity, {
              toValue: 1,
              duration: 360,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(wordmarkRise, {
              toValue: 0,
              duration: 360,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(brandScale, {
              toValue: 1,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start();
        }, 1600);
        // Continue to the app if the native Lottie callback does not arrive.
        fallback = setTimeout(() => setAnimationFinished(true), 3200);
      });

    return () => {
      active = false;
      if (fallback) clearTimeout(fallback);
      if (shiftStatus) clearTimeout(shiftStatus);
      if (revealWordmark) clearTimeout(revealWordmark);
      truckProgress.stopAnimation();
      wordmarkOpacity.stopAnimation();
      wordmarkRise.stopAnimation();
      brandScale.stopAnimation();
    };
  }, [imageLoaded, laidOut, reduceMotion, truckProgress, wordmarkOpacity, wordmarkRise, brandScale]);

  useEffect(() => {
    if (!animationFinished || appReady) return;
    const timer = setTimeout(() => setWaitingVisible(true), 250);
    return () => clearTimeout(timer);
  }, [animationFinished, appReady]);

  useEffect(() => {
    if (!animationFinished || !appReady || exiting.current) return;
    exiting.current = true;
    Animated.timing(opacity, {
      toValue: 0,
      duration: reduceMotion ? 100 : 240,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onComplete();
    });
  }, [animationFinished, appReady, onComplete, opacity, reduceMotion]);

  return (
    <Animated.View
      className="absolute inset-0 items-center justify-center overflow-hidden"
      style={{ backgroundColor: colors.brandSoft, opacity, zIndex: 10 }}
      onLayout={() => setLaidOut(true)}
      accessibilityViewIsModal
    >
      <StatusBar
        barStyle={statusOnBlue ? 'light-content' : 'dark-content'}
        backgroundColor={statusOnBlue ? colors.brand : colors.brandSoft}
      />
      {!reduceMotion && (
        <View
          className="absolute inset-0"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <LottieView
            ref={animation}
            source={motion}
            autoPlay={false}
            loop={false}
            resizeMode="cover"
            onAnimationFinish={(cancelled) => {
              if (!cancelled) setAnimationFinished(true);
            }}
            style={{ flex: 1 }}
          />
        </View>
      )}
      <Animated.Image
        source={truck}
        resizeMode="contain"
        onLoadEnd={() => setImageLoaded(true)}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Camión de Flash Pack"
        style={{
          width: 220,
          height: 112,
          transform: [
            { translateX: truckProgress.interpolate({ inputRange: [0, 1], outputRange: [0, width / 2 + 120] }) },
            { translateY: truckProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -4, 0] }) },
          ],
        }}
      />
      <Animated.View
        className="absolute inset-0 items-center justify-center"
        pointerEvents="none"
        accessibilityElementsHidden={!brandRevealed}
        importantForAccessibility={brandRevealed ? 'yes' : 'no-hide-descendants'}
        style={{ opacity: wordmarkOpacity, transform: [{ translateY: wordmarkRise }, { scale: brandScale }] }}
      >
        <Image source={truck} resizeMode="contain" accessible={false} style={{ width: 260, height: 132, marginBottom: 24 }} />
        <View className="flex-row items-center" accessible accessibilityLabel="Flash Pack">
          <Text className="text-4xl font-extrabold tracking-wider text-white">FLASH</Text>
          <Text className="text-4xl font-extrabold tracking-wider text-action"> PACK</Text>
        </View>
        <View className="mt-3 h-1 w-16 rounded-full bg-action" />
      </Animated.View>
      {waitingVisible && !appReady && (
        <View className="absolute bottom-20 self-center" accessible accessibilityRole="progressbar" accessibilityLabel="Preparando Flash Pack">
          <Text className="text-sm text-white">Preparando la aplicación…</Text>
        </View>
      )}
    </Animated.View>
  );
}
