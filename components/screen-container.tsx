import { Platform, View, type ViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";
import { GrainOverlay } from "@/components/grain-overlay";

const WEB_MAX_WIDTH = 720;

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
  /**
   * Hide the paper-grain overlay (used on screens with imagery where the
   * grain would compete, e.g. fullscreen product images).
   */
  noGrain?: boolean;
}

/**
 * A container component that properly handles SafeArea and background colors.
 *
 * The outer View extends to full screen (including status bar area) with the background color,
 * while the inner SafeAreaView ensures content is within safe bounds.
 *
 * Usage:
 * ```tsx
 * <ScreenContainer className="p-4">
 *   <Text className="text-2xl font-bold text-foreground">
 *     Welcome
 *   </Text>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  noGrain,
  style,
  ...props
}: ScreenContainerProps) {
  const webContentStyle =
    Platform.OS === "web" ? { maxWidth: WEB_MAX_WIDTH, width: "100%" as const, alignSelf: "center" as const } : null;

  return (
    <View
      className={cn(
        "flex-1",
        "bg-background",
        containerClassName
      )}
      {...props}
    >
      {/* Subtle grain — off by default in the modernist system. Opt-in via no-noGrain hack:
          callers that want grain pass noGrain={false} (default ignores it). */}
      {noGrain === false ? <GrainOverlay opacity={0.04} /> : null}
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={style}
      >
        <View className={cn("flex-1", className)} style={webContentStyle}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}
