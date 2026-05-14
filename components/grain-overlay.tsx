import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Filter, FeTurbulence, Rect } from "react-native-svg";

/**
 * GrainOverlay
 * Subtle paper-grain texture rendered as SVG noise. Sits absolute-positioned
 * inside any container, low opacity, pointer-events disabled.
 */
export function GrainOverlay({
  opacity = 0.06,
  density = 0.85,
}: {
  opacity?: number;
  density?: number;
}) {
  // Deterministic seed so the grain pattern doesn't shift between renders.
  const seed = 7;

  const dots = useMemo(() => {
    // Generate a sparse field of tiny dots as a fallback for platforms where
    // SVG <filter> turbulence renders inconsistently (notably some Android).
    const out: { cx: number; cy: number; r: number; o: number }[] = [];
    let rng = seed * 9301 + 49297;
    const rand = () => {
      rng = (rng * 9301 + 49297) % 233280;
      return rng / 233280;
    };
    const count = Math.floor(180 * density);
    for (let i = 0; i < count; i++) {
      out.push({
        cx: rand() * 100,
        cy: rand() * 100,
        r: rand() * 0.6 + 0.15,
        o: rand() * 0.5 + 0.5,
      });
    }
    return out;
  }, [density]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity,
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <Filter id="grain">
            <FeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
          </Filter>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill="#000" filter="url(#grain)" />
        {dots.map((d, i) => (
          <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#000" opacity={d.o} />
        ))}
      </Svg>
    </View>
  );
}
