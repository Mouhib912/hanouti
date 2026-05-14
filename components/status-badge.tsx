import { Text, View } from "react-native";

export type OrderStatus = "pending" | "confirmed" | "ready" | "delivered" | "cancelled";

const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-warning/15", text: "text-warning", label: "Pending" },
  confirmed: { bg: "bg-primary/15", text: "text-primary", label: "Confirmed" },
  ready: { bg: "bg-accent/15", text: "text-accent", label: "Ready" },
  delivered: { bg: "bg-success/15", text: "text-success", label: "Delivered" },
  cancelled: { bg: "bg-muted/15", text: "text-muted", label: "Cancelled" },
};

export function StatusBadge({ status, size = "sm" }: { status: OrderStatus; size?: "sm" | "md" }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const dim = size === "md" ? "px-3 py-1.5" : "px-2.5 py-1";
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <View className={`flex-row items-center gap-1.5 rounded-full ${dim} ${style.bg}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${style.text.replace("text-", "bg-")}`} />
      <Text className={`${textSize} font-medium ${style.text}`}>{style.label}</Text>
    </View>
  );
}
