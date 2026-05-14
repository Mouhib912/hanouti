import { Ionicons } from "@expo/vector-icons";
import { type ComponentProps, type ReactNode } from "react";
import { Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type Props = {
  icon?: IoniconName;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon = "cube-outline", title, description, action }: Props) {
  const colors = useColors();

  return (
    <View className="items-center justify-center py-12 px-6 gap-3">
      <View className="w-16 h-16 rounded-full bg-surface items-center justify-center">
        <Ionicons name={icon} size={28} color={colors.muted} />
      </View>
      <Text className="text-foreground text-base font-semibold text-center">{title}</Text>
      {description ? (
        <Text className="text-muted text-sm text-center max-w-xs">{description}</Text>
      ) : null}
      {action ? <View className="pt-2">{action}</View> : null}
    </View>
  );
}
