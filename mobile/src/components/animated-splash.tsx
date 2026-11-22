import { useEffect, useRef } from "react";
import { StyleSheet, Text, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LogoMark } from "@/components/logo";
import { colors, fonts } from "@/lib/theme";

const WORD_SIZE = 44;
const MARK_SIZE = 120;
// Cor do L no monograma (creme), para onde o L do nome vai durante o recolhimento
const MARK_L = "#F4F2EA";

// Abertura do app: o nome TáNaLista aparece inteiro, as letras do meio se
// recolhem, o T e o L se juntam e viram o monograma, e a tela some revelando o
// app. Fica por cima de tudo até terminar; `ready` diz quando o app carregou.
export function AnimatedSplash({
  ready,
  onDone,
}: {
  ready: boolean;
  onDone: () => void;
}) {
  // 0 → 1: recolhe as letras; 1 → 2: troca o texto pelo monograma
  const progress = useSharedValue(0);
  const fade = useSharedValue(1);
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    progress.set(
      withSequence(
        withDelay(
          450,
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) }),
        ),
        withTiming(2, { duration: 300, easing: Easing.out(Easing.cubic) }),
      ),
    );
    fade.set(
      withDelay(
        1700,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) runOnJS(onDone)();
        }),
      ),
    );
  }, [ready, progress, fade, onDone]);

  const overlay = useAnimatedStyle(() => ({ opacity: fade.value }));
  const word = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1, 1.5], [1, 0], "clamp"),
  }));
  const mark = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1, 1.4], [0, 1], "clamp"),
    // Pequeno pulso ao aparecer
    transform: [
      {
        scale: interpolate(
          progress.value,
          [1, 1.6, 2],
          [0.7, 1.08, 1],
          "clamp",
        ),
      },
    ],
  }));
  const lColor = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0.3, 1], [colors.primary, MARK_L]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, overlay]}
    >
      {/* Só com as fontes carregadas: medido na fonte do sistema, o corte saía curto */}
      {ready && (
        <Animated.View
          style={[styles.word, word]}
          accessible
          accessibilityLabel="TáNaLista"
        >
          <Text style={styles.letter}>T</Text>
          <Collapsing progress={progress} style={styles.letter} text="á" />
          <Collapsing
            progress={progress}
            style={[styles.letter, styles.na]}
            text="na"
          />
          <Animated.Text style={[styles.letter, lColor]}>L</Animated.Text>
          <Collapsing progress={progress} style={styles.letter} text="ista" />
        </Animated.View>
      )}
      <Animated.View style={[styles.mark, mark]}>
        <LogoMark size={MARK_SIZE} />
      </Animated.View>
    </Animated.View>
  );
}

// Trecho do nome que encolhe até sumir. O texto fica com a largura medida e a
// caixa em volta encolhe por cima dele, cortando (sem reticências nem quebra).
function Collapsing({
  progress,
  text,
  style,
}: {
  progress: SharedValue<number>;
  text: string;
  style: object;
}) {
  const width = useSharedValue(-1);
  const height = useSharedValue(0);
  const animated = useAnimatedStyle(() =>
    width.value < 0
      ? {}
      : {
          width: interpolate(progress.value, [0, 1], [width.value, 0], "clamp"),
          height: height.value,
          opacity: interpolate(progress.value, [0, 0.6], [1, 0], "clamp"),
        },
  );
  const inner = useAnimatedStyle(() =>
    width.value < 0
      ? {}
      : { position: "absolute", left: 0, top: 0, width: width.value },
  );

  // Medida numa cópia invisível e solta (sem nada limitando a largura): a do
  // próprio texto vinha menor e cortava a última letra
  function measure(event: LayoutChangeEvent) {
    if (width.get() >= 0) return;
    height.set(event.nativeEvent.layout.height);
    width.set(Math.ceil(event.nativeEvent.layout.width) + 2);
  }

  return (
    <>
      <Text
        onLayout={measure}
        style={[style, styles.measure]}
        accessible={false}
      >
        {text}
      </Text>
      <Animated.View style={[styles.clip, animated]}>
        <Animated.Text style={[style, inner]}>{text}</Animated.Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  word: { flexDirection: "row", alignItems: "center" },
  letter: {
    fontFamily: fonts.headingBlack,
    fontSize: WORD_SIZE,
    color: colors.primary,
    letterSpacing: -1,
  },
  na: { fontFamily: fonts.headingLight, color: colors.text40 },
  // Corta o texto enquanto a largura encolhe; sem quebrar linha
  clip: { overflow: "hidden", flexDirection: "row" },
  mark: { position: "absolute" },
  measure: { position: "absolute", left: 0, top: -1000, opacity: 0 },
});
