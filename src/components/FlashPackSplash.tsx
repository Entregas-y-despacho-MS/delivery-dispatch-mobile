import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StatusBar, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { colors } from '@/theme/tokens';

const AnimatedView = Animated.View;
const AnimatedText = Animated.Text;
const wordmarkFont = Platform.select({
  ios: 'AvenirNextCondensed-Heavy',
  android: 'sans-serif-condensed',
  default: 'sans-serif-condensed',
});
const uiSansFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });

interface FlashPackSplashProps {
  onAnimationComplete: () => void;
}

const mapRoutes = [
  [
    'M-20 180 C48 170 54 228 118 214 S186 180 236 212 S312 264 420 230',
    'M42 -20 C54 90 106 112 98 202 S68 332 104 428',
    'M210 -20 C176 70 198 132 244 176 S318 222 296 316',
  ],
  [
    'M-22 330 C56 294 84 338 136 370 S238 412 274 382 S334 322 422 354',
    'M-10 524 C66 488 96 520 154 504 S246 452 296 482 S356 554 420 530',
    'M318 -20 C292 84 320 124 346 180 S346 278 380 310',
  ],
  [
    'M-20 672 C56 640 112 678 158 706 S242 752 286 718 S346 650 422 680',
    'M188 864 C208 782 178 738 194 680 S248 586 222 526',
    'M386 380 C318 394 300 444 338 492 S386 566 412 590',
  ],
];

type Point = [number, number];

interface CubicSegment {
  control1: Point;
  control2: Point;
  to: Point;
}

interface CurveStroke {
  start: Point;
  segments: CubicSegment[];
}

interface GlyphDefinition {
  width: number;
  strokes: CurveStroke[];
}

const glyphs: Record<string, GlyphDefinition> = {
  F: {
    width: 29,
    strokes: [
      { start: [4, 64], segments: [{ control1: [2, 47], control2: [2, 16], to: [5, 2] }, { control1: [12, 0], control2: [22, 0], to: [29, 3] }] },
      { start: [4, 31], segments: [{ control1: [11, 29], control2: [20, 29], to: [25, 31] }] },
    ],
  },
  L: {
    width: 29,
    strokes: [{ start: [4, 1], segments: [{ control1: [2, 20], control2: [2, 48], to: [5, 61] }, { control1: [12, 64], control2: [23, 64], to: [29, 61] }] }],
  },
  A: {
    width: 29,
    strokes: [
      { start: [1, 63], segments: [{ control1: [7, 43], control2: [12, 16], to: [16, 1] }, { control1: [20, 16], control2: [25, 44], to: [29, 63] }] },
      { start: [7, 43], segments: [{ control1: [12, 40], control2: [21, 40], to: [25, 43] }] },
    ],
  },
  S: {
    width: 29,
    strokes: [{ start: [28, 7], segments: [{ control1: [22, -1], control2: [8, -2], to: [3, 9] }, { control1: [-2, 20], control2: [8, 26], to: [18, 30] }, { control1: [31, 35], control2: [32, 47], to: [25, 57] }, { control1: [18, 67], control2: [7, 66], to: [1, 58] }] }],
  },
  H: {
    width: 29,
    strokes: [
      { start: [3, 1], segments: [{ control1: [1, 20], control2: [1, 46], to: [3, 63] }] },
      { start: [3, 32], segments: [{ control1: [11, 30], control2: [21, 30], to: [27, 32] }] },
      { start: [27, 1], segments: [{ control1: [29, 20], control2: [29, 46], to: [27, 63] }] },
    ],
  },
  P: {
    width: 29,
    strokes: [{ start: [3, 63], segments: [{ control1: [2, 44], control2: [2, 17], to: [4, 2] }, { control1: [13, -1], control2: [28, 0], to: [29, 14] }, { control1: [30, 28], control2: [15, 30], to: [4, 27] }] }],
  },
  C: {
    width: 29,
    strokes: [{ start: [29, 8], segments: [{ control1: [23, -1], control2: [9, -2], to: [3, 10] }, { control1: [-2, 22], control2: [0, 47], to: [6, 57] }, { control1: [12, 67], control2: [24, 65], to: [29, 57] }] }],
  },
  K: {
    width: 29,
    strokes: [
      { start: [3, 1], segments: [{ control1: [1, 21], control2: [1, 45], to: [3, 63] }] },
      { start: [28, 2], segments: [{ control1: [21, 10], control2: [12, 24], to: [3, 32] }, { control1: [13, 40], control2: [22, 55], to: [29, 63] }] },
    ],
  },
};

interface TraceLetter {
  key: string;
  character: string;
  color: string;
  x: number;
  start: number;
  end: number;
}

interface TraceStop {
  x: number;
  y: number;
  distance: number;
  angle: number;
}

function segmentLength(a: [number, number], b: [number, number]) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function cubicPoint(start: Point, segment: CubicSegment, progress: number): Point {
  const inverse = 1 - progress;
  return [
    inverse ** 3 * start[0] + 3 * inverse ** 2 * progress * segment.control1[0] + 3 * inverse * progress ** 2 * segment.control2[0] + progress ** 3 * segment.to[0],
    inverse ** 3 * start[1] + 3 * inverse ** 2 * progress * segment.control1[1] + 3 * inverse * progress ** 2 * segment.control2[1] + progress ** 3 * segment.to[1],
  ];
}

function sampleStroke(stroke: CurveStroke, offsetX: number, offsetY: number): Point[] {
  const points: Point[] = [[stroke.start[0] + offsetX, stroke.start[1] + offsetY]];
  let segmentStart = stroke.start;

  for (const segment of stroke.segments) {
    for (let step = 1; step <= 18; step += 1) {
      const point = cubicPoint(segmentStart, segment, step / 18);
      points.push([point[0] + offsetX, point[1] + offsetY]);
    }
    segmentStart = segment.to;
  }

  return points;
}

function curvedTransition(from: Point, to: Point): Point[] {
  const control: Point = [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 9];
  const points: Point[] = [from];
  for (let step = 1; step <= 14; step += 1) {
    const progress = step / 14;
    const inverse = 1 - progress;
    points.push([
      inverse ** 2 * from[0] + 2 * inverse * progress * control[0] + progress ** 2 * to[0],
      inverse ** 2 * from[1] + 2 * inverse * progress * control[1] + progress ** 2 * to[1],
    ]);
  }
  return points;
}

function createTracePlan() {
  const letters: TraceLetter[] = [];
  const stops: Omit<TraceStop, 'angle'>[] = [];
  let cursorX = 35;
  const topY = 372;
  let distance = 0;
  let previous: Point | undefined;
  let letterIndex = 0;

  for (const character of 'FLASH PACK') {
    if (character === ' ') {
      cursorX += 15;
      continue;
    }

    const glyph = glyphs[character];
    const letterStart = distance;
    for (let strokeIndex = 0; strokeIndex < glyph.strokes.length; strokeIndex += 1) {
      const points = sampleStroke(glyph.strokes[strokeIndex], cursorX, topY);
      const first = points[0];

      if (previous) {
        const connector = curvedTransition(previous, first);
        for (let index = 1; index < connector.length; index += 1) {
          distance += segmentLength(connector[index - 1], connector[index]);
          stops.push({ x: connector[index][0], y: connector[index][1], distance });
        }
      } else {
        stops.push({ x: first[0], y: first[1], distance });
      }

      for (let index = 1; index < points.length; index += 1) {
        distance += segmentLength(points[index - 1], points[index]);
        stops.push({ x: points[index][0], y: points[index][1], distance });
      }

      previous = points[points.length - 1];
    }

    letters.push({
      key: `${character}-${letterIndex}`,
      character,
      color: letterIndex < 5 ? colors.brandSoft : colors.action,
      x: cursorX,
      start: letterStart,
      end: distance,
    });

    cursorX += glyph.width + 6;
    letterIndex += 1;
  }

  const traceStops: TraceStop[] = stops.map((stop, index) => {
    const next = stops[index + 1] ?? stop;
    const previousStop = stops[index - 1] ?? stop;
    const nextAngle = Math.atan2(next.y - stop.y, next.x - stop.x) * (180 / Math.PI);
    const previousAngle = Math.atan2(stop.y - previousStop.y, stop.x - previousStop.x) * (180 / Math.PI);
    return {
      ...stop,
      angle: index === stops.length - 1 ? previousAngle : nextAngle,
    };
  });

  return { letters, stops: traceStops, totalLength: distance };
}

const tracePlan = createTracePlan();

function tracePosition(distance: number) {
  const stops = tracePlan.stops;
  for (let index = 1; index < stops.length; index += 1) {
    const from = stops[index - 1];
    const to = stops[index];
    if (distance > to.distance) continue;
    const segment = to.distance - from.distance;
    const fraction = segment === 0 ? 0 : Math.max(0, (distance - from.distance) / segment);
    return {
      x: from.x + (to.x - from.x) * fraction,
      y: from.y + (to.y - from.y) * fraction,
      angle: Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI),
    };
  }
  const last = stops[stops.length - 1];
  return { x: last.x, y: last.y, angle: last.angle };
}

function MapArtwork({ width, height }: { width: number; height: number }) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Rect x="0" y="0" width="390" height="844" fill={colors.navy} />
      <Path
        d="M0 116 H390 M0 146 H390 M0 286 H390 M0 316 H390 M0 456 H390 M0 486 H390 M0 626 H390 M0 656 H390 M0 796 H390 M62 0 V844 M92 0 V844 M176 0 V844 M206 0 V844 M286 0 V844 M316 0 V844"
        fill="none"
        stroke={colors.turquoise}
        strokeWidth="1"
        opacity="0.19"
      />
      <Path
        d="M20 116 62 146 62 286 92 316 176 316 206 286 286 286 316 316 370 316 M20 486 62 456 92 456 122 486 176 486 206 456 286 456 316 486 370 486 M20 656 62 626 92 626 122 656 176 656 206 626 286 626 316 656 370 656"
        fill="none"
        stroke={colors.brandSoft}
        strokeWidth="1.25"
        opacity="0.18"
      />
    </Svg>
  );
}

function DeliveryVan() {
  return (
    <Svg width={46} height={30} viewBox="0 0 72 46" accessibilityElementsHidden>
      <Path d="M5 13 Q5 9 10 9 H43 Q47 9 47 13 V34 H5Z" fill={colors.turquoise} />
      <Path d="M47 18 H59 L68 27 V34 H47Z" fill={colors.brandSoft} />
      <Path d="M50 21 H57 L63 27 H50Z" fill={colors.navy} />
      <Rect x="13" y="4" width="19" height="6" rx="2" fill={colors.action} />
      <Circle cx="19" cy="35" r="6" fill={colors.ink} />
      <Circle cx="19" cy="35" r="2.5" fill={colors.brandSoft} />
      <Circle cx="55" cy="35" r="6" fill={colors.ink} />
      <Circle cx="55" cy="35" r="2.5" fill={colors.brandSoft} />
    </Svg>
  );
}

export function FlashPackSplash({ onAnimationComplete }: FlashPackSplashProps) {
  const { width, height } = useWindowDimensions();
  const [routes] = useState(() => mapRoutes.map(() => new Animated.Value(0)));
  const [vanProgress] = useState(() => new Animated.Value(0));
  const [traceDistance, setTraceDistance] = useState(0);
  const sloganOpacity = vanProgress.interpolate({ inputRange: [0.9, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const renderScale = Math.max(width / 390, height / 844);
  const offsetX = (width - 390 * renderScale) / 2;
  const offsetY = (height - 844 * renderScale) / 2;
  const vanPosition = tracePosition(traceDistance);

  useEffect(() => {
    let cancelled = false;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;
    let progressListener: string | undefined;

    const startAnimation = (reduceMotion: boolean) => {
      if (cancelled) return;

      if (reduceMotion) {
        routes.forEach((route) => route.setValue(1));
        vanProgress.setValue(1);
        setTraceDistance(tracePlan.totalLength);
        completionTimer = setTimeout(onAnimationComplete, 650);
        return;
      }

      const roadReveal = routes.map((route, index) =>
        Animated.timing(route, {
          toValue: 1,
          duration: 560,
          delay: index * 420,
          useNativeDriver: true,
        }),
      );

      setTraceDistance(0);
      vanProgress.setValue(0);
      progressListener = vanProgress.addListener(({ value }) => {
        setTraceDistance(value * tracePlan.totalLength);
      });
      const writing = Animated.timing(vanProgress, {
        toValue: 1,
        duration: 6800,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      writing.start(({ finished }) => {
        if (progressListener) vanProgress.removeListener(progressListener);
        if (finished) completionTimer = setTimeout(onAnimationComplete, 650);
      });

      Animated.parallel(roadReveal).start();
    };

    void AccessibilityInfo.isReduceMotionEnabled().then(startAnimation).catch(() => startAnimation(false));

    return () => {
      cancelled = true;
      if (completionTimer) clearTimeout(completionTimer);
      routes.forEach((route) => route.stopAnimation());
      vanProgress.stopAnimation();
      if (progressListener) vanProgress.removeListener(progressListener);
    };
  }, [onAnimationComplete, routes, vanProgress]);

  return (
    <View className="flex-1 items-center justify-center overflow-hidden" style={{ backgroundColor: colors.navy }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <View className="absolute inset-0" accessibilityElementsHidden>
        <MapArtwork width={width} height={height} />
        {mapRoutes.map((paths, index) => (
          <AnimatedView key={index} className="absolute inset-0" style={{ opacity: routes[index] }} pointerEvents="none">
            <Svg
              width={width}
              height={height}
              viewBox="0 0 390 844"
              preserveAspectRatio="xMidYMid slice"
              accessibilityElementsHidden
            >
              {paths.map((path, pathIndex) => (
                <Path
                  key={path}
                  d={path}
                  fill="none"
                  stroke={pathIndex === 1 && index === 1 ? colors.action : colors.brandSoft}
                  strokeWidth={pathIndex === 0 ? 2.4 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={pathIndex === 0 ? 0.86 : 0.64}
                />
              ))}
            </Svg>
          </AnimatedView>
        ))}
      </View>

      {tracePlan.letters.map((letter) => {
        const start = letter.start / tracePlan.totalLength;
        const end = letter.end / tracePlan.totalLength;
        const opacity = vanProgress.interpolate({
          inputRange: [Math.max(0, start - 0.001), start + (end - start) * 0.55, end],
          outputRange: [0, 0.35, 1],
          extrapolate: 'clamp',
        });

        return (
          <AnimatedText
            key={letter.key}
            style={{
              position: 'absolute',
              left: offsetX + letter.x * renderScale,
              top: offsetY + 368 * renderScale,
              color: letter.color,
              fontFamily: wordmarkFont,
              fontSize: 58 * renderScale,
              fontWeight: '900',
              letterSpacing: -0.6 * renderScale,
              lineHeight: 70 * renderScale,
              opacity,
            }}
            accessibilityElementsHidden
            pointerEvents="none"
          >
            {letter.character}
          </AnimatedText>
        );
      })}

      <AnimatedView
        className="absolute left-0 top-0"
        style={{
          left: offsetX + vanPosition.x * renderScale - 23,
          top: offsetY + vanPosition.y * renderScale - 15,
          transform: [{ rotate: `${vanPosition.angle}deg` }],
        }}
        accessibilityElementsHidden
        pointerEvents="none"
      >
        <DeliveryVan />
      </AnimatedView>

      <AnimatedView className="absolute inset-x-0 items-center" style={{ top: height * 0.55, opacity: sloganOpacity }}>
        <AppText className="text-center text-[15px] font-medium" style={{ color: colors.brandSoft, fontFamily: uiSansFont }}>
          Entregas en movimiento
        </AppText>
      </AnimatedView>

      <View className="absolute h-px w-px overflow-hidden" accessible accessibilityRole="text" accessibilityLabel="Flash Pack. Entregas en movimiento." />
    </View>
  );
}
