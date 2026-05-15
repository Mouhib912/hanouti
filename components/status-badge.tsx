import { View, type ViewStyle } from "react-native";

import { MonoBold } from "@/components/typography";
import { useColors } from "@/hooks/use-colors";

export type OrderStatus = "pending" | "confirmed" | "ready" | "delivered" | "cancelled";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "PENDING",
  confirmed: "CONFIRMED",
  ready: "READY",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

export function StatusBadge({ status, size = "sm" }: { status: OrderStatus; size?: "sm" | "md" }) {
  const colors = useColors();

  // Tonal scale within the white+green system, ordered by progression:
  //   pending  — outlined neutral (waiting)
  //   confirmed — light primary tint (motion)
  //   ready    — filled primary (active, ready for pickup)
  //   delivered — filled ink (finalised)
  //   cancelled — outlined muted (closed)
  const tone: { bg: string; fg: string; border?: string } = (() => {
    switch (status) {
      case "pending":
        return { bg: "transparent", fg: colors.muted, border: colors["border-soft"] };
      case "confirmed":
        return { bg: colors.primary + "1F", fg: colors["primary-deep"] };
      case "ready":
        return { bg: colors.primary, fg: colors.background };
      case "delivered":
        return { bg: colors.foreground, fg: colors.background };
      case "cancelled":
        return { bg: "transparent", fg: colors["muted-soft"], border: colors["border-soft"] };
    }
  })();

  const padding: ViewStyle =
    size === "md"
      ? { paddingHorizontal: 12, paddingVertical: 6 }
      : { paddingHorizontal: 10, paddingVertical: 4 };

  return (
    <View
      style={[
        {
          backgroundColor: tone.bg,
          borderRadius: 999,
          borderWidth: tone.border ? 1 : 0,
          borderColor: tone.border,
          alignSelf: "flex-start",
        },
        padding,
      ]}
    >
      <MonoBold
        style={{ color: tone.fg, fontSize: size === "md" ? 11 : 9, letterSpacing: 1.2 }}
      >
        {STATUS_LABEL[status]}
      </MonoBold>
    </View>
  );
}
