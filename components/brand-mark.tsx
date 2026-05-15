import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Body, Display, MonoBold } from "@/components/typography";
import { useColors } from "@/hooks/use-colors";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const colors = useColors();
  const dim = size === "lg" ? 64 : size === "md" ? 48 : 36;
  const iconSize = size === "lg" ? 30 : size === "md" ? 22 : 16;

  return (
    <View
      style={{ width: dim, height: dim, backgroundColor: colors.primary }}
      className="rounded-2xl items-center justify-center"
    >
      <Ionicons name="basket" size={iconSize} color={colors.background} />
    </View>
  );
}

/**
 * BrandLockup — wordmark "Hanouti" (Tunisian for "my grocery shop").
 */
export function BrandLockup({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-3">
      <BrandMark size={compact ? "sm" : "md"} />
      <View>
        <Display
          className="leading-6"
          style={{ fontSize: compact ? 18 : 22, color: colors.foreground }}
        >
          hanouti
          <Display style={{ color: colors.primary }}>.</Display>
        </Display>
        {!compact ? (
          <MonoBold
            className="text-[9px] mt-0.5"
            style={{ color: colors["muted-soft"], letterSpacing: 1.4 }}
          >
            B2B GROCERY · TUNISIA
          </MonoBold>
        ) : null}
      </View>
    </View>
  );
}

// Back-compat: some imports may still need a generic tagline.
export function BrandTagline() {
  return <Body className="text-muted text-xs">Grocery supply, made simple.</Body>;
}
