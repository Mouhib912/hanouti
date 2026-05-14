import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function BuyerOrdersScreen() {
  const colors = useColors();
  const ordersQ = trpc.orders.listBuyer.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  return (
    <ScreenContainer className="px-5">
      <Stack.Screen options={{ title: "My orders", headerShown: true }} />

      {ordersQ.isLoading ? (
        <ActivityIndicator color={colors.primary} className="mt-12" />
      ) : (
        <FlatList
          data={ordersQ.data ?? []}
          keyExtractor={(o) => String(o.id)}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={ordersQ.isFetching && !ordersQ.isLoading}
              onRefresh={() => ordersQ.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No orders yet"
              description="When you check out from a supplier, your orders will appear here."
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.springify().damping(18).delay(Math.min(index, 6) * 25)}
              layout={LinearTransition.springify().damping(18)}
            >
              <Link href={`/order/${item.id}`} asChild>
                <TouchableOpacity className="bg-surface border border-border rounded-2xl p-4 gap-2 active:opacity-80">
                <View className="flex-row items-center justify-between">
                  <Text className="text-foreground font-semibold">Order #{item.id}</Text>
                  <StatusBadge status={item.status as OrderStatus} />
                </View>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="cube-outline" size={14} color={colors.muted} />
                  <Text className="text-muted text-sm">
                    {item.items.length} item{item.items.length === 1 ? "" : "s"}
                  </Text>
                  <Text className="text-muted text-sm">·</Text>
                  <Text className="text-foreground font-semibold text-sm">${item.totalPrice}</Text>
                </View>
                <View className="flex-row items-start gap-2">
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={colors.muted}
                    style={{ marginTop: 2 }}
                  />
                  <Text className="text-muted text-sm flex-1" numberOfLines={2}>
                    {item.deliveryAddress}
                  </Text>
                </View>
                {item.notes ? (
                  <View className="flex-row items-start gap-2">
                    <Ionicons
                      name="chatbox-outline"
                      size={14}
                      color={colors.muted}
                      style={{ marginTop: 2 }}
                    />
                    <Text className="text-muted text-sm italic flex-1" numberOfLines={2}>
                      “{item.notes}”
                    </Text>
                  </View>
                ) : null}
                </TouchableOpacity>
              </Link>
            </Animated.View>
          )}
        />
      )}
    </ScreenContainer>
  );
}
