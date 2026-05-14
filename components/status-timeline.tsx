import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import type { OrderStatus } from "./status-badge";

const FLOW: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
];

export function StatusTimeline({ status }: { status: OrderStatus }) {
  const colors = useColors();

  if (status === "cancelled") {
    return (
      <View className="flex-row items-center gap-2 bg-error/10 rounded-xl p-3">
        <Ionicons name="close-circle" size={20} color={colors.error} />
        <Text className="text-error font-medium">Order was cancelled</Text>
      </View>
    );
  }

  const currentIndex = FLOW.findIndex((s) => s.key === status);

  return (
    <View className="flex-row items-start">
      {FLOW.map((step, idx) => {
        const reached = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        const isLast = idx === FLOW.length - 1;

        return (
          <View key={step.key} className="flex-1 items-center">
            <View className="flex-row items-center w-full">
              <View className="flex-1 h-0.5 -ml-px" style={{ backgroundColor: idx === 0 ? "transparent" : reached ? colors.primary : colors.border }} />
              <View
                className={`w-7 h-7 rounded-full items-center justify-center ${
                  reached ? "bg-primary" : "bg-surface border border-border"
                }`}
              >
                {reached ? (
                  <Ionicons
                    name={isCurrent ? "ellipse" : "checkmark"}
                    size={isCurrent ? 10 : 14}
                    color={colors.background}
                  />
                ) : (
                  <View className="w-2 h-2 rounded-full bg-muted-soft" />
                )}
              </View>
              <View className="flex-1 h-0.5 -mr-px" style={{ backgroundColor: isLast ? "transparent" : idx < currentIndex ? colors.primary : colors.border }} />
            </View>
            <Text className={`text-[11px] mt-2 ${reached ? "text-foreground font-medium" : "text-muted"}`}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
