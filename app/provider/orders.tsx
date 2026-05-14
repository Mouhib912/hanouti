import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Link, Stack } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
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
import { canTransitionOrderStatus } from "@/shared/const";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "ready", "delivered", "cancelled"];
const FILTERS: { key: "open" | OrderStatus | "all"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
  { key: "all", label: "All" },
];

export default function ProviderOrdersScreen() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const ordersQ = trpc.orders.listProvider.useQuery(undefined, {
    refetchInterval: 15_000,
  });
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      utils.orders.listProvider.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("open");

  const filtered = useMemo(() => {
    const data = ordersQ.data ?? [];
    if (filter === "all") return data;
    if (filter === "open") {
      return data.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
    }
    return data.filter((o) => o.status === filter);
  }, [ordersQ.data, filter]);

  return (
    <ScreenContainer className="px-5">
      <Stack.Screen options={{ title: "Orders", headerShown: true }} />

      <View className="pt-3 pb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  active ? "bg-foreground border-foreground" : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`text-sm ${active ? "text-background font-semibold" : "text-foreground"}`}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {ordersQ.isLoading ? (
        <ActivityIndicator color={colors.primary} className="mt-12" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 6 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
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
              title="No orders here"
              description={
                filter === "open"
                  ? "New orders will appear when buyers check out."
                  : "Try a different filter to find orders."
              }
            />
          }
          renderItem={({ item, index }) => {
            const status = item.status as OrderStatus;
            return (
              <Animated.View
                entering={FadeInDown.springify().damping(18).delay(Math.min(index, 6) * 25)}
                layout={LinearTransition.springify().damping(18)}
                className="bg-surface border border-border rounded-2xl p-4 gap-3"
              >
                <Link href={`/order/${item.id}`} asChild>
                  <TouchableOpacity className="gap-2 active:opacity-80">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-foreground font-semibold">Order #{item.id}</Text>
                      <StatusBadge status={status} />
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="cube-outline" size={14} color={colors.muted} />
                      <Text className="text-muted text-sm">
                        {item.items.length} item{item.items.length === 1 ? "" : "s"}
                      </Text>
                      <Text className="text-muted text-sm">·</Text>
                      <Text className="text-foreground font-semibold text-sm">
                        ${item.totalPrice}
                      </Text>
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

                <View className="border-t border-border pt-3">
                  <Text className="text-muted text-[11px] uppercase tracking-wider mb-2">
                    Update status
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {STATUSES.map((s) => {
                      const active = status === s;
                      const allowed = active || canTransitionOrderStatus(status, s);
                      return (
                        <TouchableOpacity
                          key={s}
                          className={`px-3 py-1.5 rounded-full border ${
                            active
                              ? "bg-primary border-primary"
                              : "bg-background border-border"
                          } ${!allowed ? "opacity-40" : ""}`}
                          disabled={active || updateStatus.isPending || !allowed}
                          onPress={() => updateStatus.mutate({ id: item.id, status: s })}
                        >
                          <Text
                            className={`text-xs ${active ? "text-background font-semibold" : "text-foreground"}`}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </Animated.View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
