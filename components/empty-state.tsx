import { Ionicons } from "@expo/vector-icons";
import { type ComponentProps, type ReactNode } from "react";
import { View } from "react-native";

import { Body, BodyBold } from "@/components/typography";
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
    <View className="items-center justify-center py-14 px-6 gap-3">
      <View
        className="w-16 h-16 rounded-full items-center justify-center"
        style={{
          backgroundColor: colors.primary + "12",
          borderWidth: 1,
          borderColor: colors.primary + "30",
        }}
      >
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <BodyBold className="text-foreground text-base text-center mt-1">{title}</BodyBold>
      {description ? (
        <Body className="text-muted text-sm text-center leading-5 max-w-xs">{description}</Body>
      ) : null}
      {action ? <View className="pt-2">{action}</View> : null}
    </View>
  );
}
