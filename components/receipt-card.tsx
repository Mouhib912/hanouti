import { type ReactNode } from "react";
import { Platform, View, type ViewStyle } from "react-native";
import { cn } from "@/lib/utils";

/**
 * Card — the signature container of the Modernist system.
 * Soft warm surface, hairline border, very subtle elevation on iOS/Android.
 * Generous rounding (16px) for a confident contemporary feel.
 */
export function Card({
  children,
  className,
  intent = "default",
  style,
  raised = true,
}: {
  children: ReactNode;
  className?: string;
  intent?: "default" | "primary" | "accent" | "tape" | "ink";
  style?: ViewStyle;
  raised?: boolean;
}) {
  const intentClass = {
    default: "bg-surface border border-border-soft",
    primary: "bg-foreground border border-foreground",
    accent: "bg-accent border border-accent",
    tape: "bg-tape border border-tape",
    ink: "bg-foreground border border-foreground",
  }[intent];

  const elevation =
    raised && Platform.OS !== "web"
      ? {
          shadowColor: "#0F0F0E",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 2,
        }
      : raised
        ? { boxShadow: "0 6px 22px -10px rgba(15,15,14,0.18)" as unknown as string }
        : null;

  return (
    <View
      style={[elevation as ViewStyle, style]}
      className={cn("rounded-2xl overflow-hidden", intentClass, className)}
    >
      {children}
    </View>
  );
}

// Back-compat alias for any old imports.
export const ReceiptCard = Card;

/**
 * Pill — small rounded chip used for role labels, status, tags.
 */
export function Pill({
  children,
  intent = "default",
  className,
}: {
  children: ReactNode;
  intent?: "default" | "primary" | "accent" | "tape" | "ink" | "ghost";
  className?: string;
}) {
  const intentClass = {
    default: "bg-surface-strong",
    primary: "bg-foreground",
    accent: "bg-accent",
    tape: "bg-tape",
    ink: "bg-foreground",
    ghost: "bg-transparent border border-border-soft",
  }[intent];

  return (
    <View
      className={cn(
        "self-start rounded-full px-2.5 py-1 flex-row items-center gap-1.5",
        intentClass,
        className,
      )}
    >
      {children}
    </View>
  );
}

// Keep these legacy exports as no-op placeholders so any stale imports don't crash.
export function TapeStrip({ children }: { children: ReactNode }) {
  return <Pill intent="tape">{children}</Pill>;
}

export function DashedDivider({ className }: { className?: string }) {
  return (
    <View
      className={cn("border-t border-border-soft", className)}
      style={{ borderTopWidth: 1 }}
    />
  );
}
