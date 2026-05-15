import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { Body, Mono, MonoBold } from "@/components/typography";
import { useColors } from "@/hooks/use-colors";
import type { OrderStatus } from "./status-badge";

const FLOW: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "PLACED" },
  { key: "confirmed", label: "CONFIRMED" },
  { key: "ready", label: "READY" },
  { key: "delivered", label: "DELIVERED" },
];

export function StatusTimeline({ status }: { status: OrderStatus }) {
  const colors = useColors();

  if (status === "cancelled") {
    return (
      <View
        className="flex-row items-center gap-2.5 rounded-2xl px-3.5 py-3"
        style={{ backgroundColor: colors.error + "12" }}
      >
        <Ionicons name="close-circle" size={20} color={colors.error} />
        <View className="flex-1">
          <MonoBold className="text-[10px]" style={{ color: colors.error, letterSpacing: 1.2 }}>
            CANCELLED
          </MonoBold>
          <Body className="text-xs mt-0.5" style={{ color: colors.error }}>
            This order was cancelled and won&apos;t be fulfilled.
          </Body>
        </View>
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
        const leftColor =
          idx === 0
            ? "transparent"
            : reached
              ? colors.primary
              : colors["border-soft"];
        const rightColor =
          isLast
            ? "transparent"
            : idx < currentIndex
              ? colors.primary
              : colors["border-soft"];

        return (
          <View key={step.key} className="flex-1 items-center">
            <View className="flex-row items-center w-full">
              <View
                className="flex-1 -ml-px"
                style={{ height: 1.5, backgroundColor: leftColor }}
              />
              <View
                className="w-7 h-7 rounded-full items-center justify-center"
                style={{
                  backgroundColor: reached ? colors.primary : colors["background-elevated"],
                  borderWidth: reached ? 0 : 1.5,
                  borderColor: reached ? colors.primary : colors["border-soft"],
                }}
              >
                {reached ? (
                  isCurrent ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.background,
                      }}
                    />
                  ) : (
                    <Ionicons name="checkmark" size={13} color={colors.background} />
                  )
                ) : (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors["muted-soft"],
                    }}
                  />
                )}
              </View>
              <View
                className="flex-1 -mr-px"
                style={{ height: 1.5, backgroundColor: rightColor }}
              />
            </View>
            <Mono
              className="text-[9px] mt-2"
              style={{
                color: reached ? colors.foreground : colors["muted-soft"],
                letterSpacing: 1.1,
                fontFamily: reached ? undefined : undefined,
              }}
            >
              {step.label}
            </Mono>
          </View>
        );
      })}
    </View>
  );
}
