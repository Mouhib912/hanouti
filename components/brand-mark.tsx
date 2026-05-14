import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const colors = useColors();
  const dim = size === "lg" ? 64 : size === "md" ? 48 : 36;
  const iconSize = size === "lg" ? 32 : size === "md" ? 24 : 18;

  return (
    <View
      style={{ width: dim, height: dim }}
      className="rounded-2xl bg-primary items-center justify-center"
    >
      <Ionicons name="basket" size={iconSize} color={colors.background} />
    </View>
  );
}

export function BrandLockup() {
  return (
    <View className="flex-row items-center gap-3">
      <BrandMark size="md" />
      <View>
        <Text className="text-foreground font-bold text-lg leading-5">FreshLink</Text>
        <Text className="text-muted text-xs">Grocery supply marketplace</Text>
      </View>
    </View>
  );
}
