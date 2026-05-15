import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Link, Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";

import { Card, Pill } from "@/components/receipt-card";
import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import {
  Body,
  BodyBold,
  Display,
  DisplaySm,
  Label,
  Mono,
  MonoBold,
} from "@/components/typography";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/utils";
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
  const router = useRouter();
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

  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]["key"]>("open");
  const [buyerFilter, setBuyerFilter] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const orders = ordersQ.data ?? [];
  const openCount = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  ).length;

  // Distinct buyers in this provider's orders, for the buyer filter pills.
  const buyers = useMemo(() => {
    const seen = new Map<number, string>();
    for (const o of orders) {
      if (!seen.has(o.buyerId)) {
        seen.set(o.buyerId, o.buyerBusinessName ?? `Buyer #${o.buyerId}`);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      // Status
      if (statusFilter === "open") {
        if (o.status === "delivered" || o.status === "cancelled") return false;
      } else if (statusFilter !== "all" && o.status !== statusFilter) {
        return false;
      }
      // Buyer
      if (buyerFilter !== "all" && o.buyerId !== buyerFilter) return false;
      // Search
      if (q) {
        const hay = [
          String(o.id),
          o.buyerBusinessName ?? "",
          o.deliveryAddress,
          o.notes ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, buyerFilter, query]);

  const filtersActive =
    statusFilter !== "open" || buyerFilter !== "all" || query.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter("open");
    setBuyerFilter("all");
    setQuery("");
  };

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={[colors.primary + "1A", colors.background + "00"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 0.7 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 260 }}
        pointerEvents="none"
      />

      <View className="px-5 pt-3">
        <Animated.View entering={FadeInDown.duration(360)}>
          <View className="flex-row items-center justify-between pt-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center bg-surface active:opacity-70"
              hitSlop={6}
            >
              <Ionicons name="arrow-back" size={18} color={colors.foreground} />
            </Pressable>
            <Pill intent="ghost">
              <Ionicons name="receipt" size={11} color={colors.primary} />
              <Label className="text-foreground">INCOMING</Label>
            </Pill>
          </View>

          <View className="mt-5 mb-1">
            <Display className="text-foreground text-[36px] leading-[40px]">
              Incoming{" "}
              <Display
                className="text-[36px] leading-[40px]"
                style={{ color: colors.primary }}
              >
                orders.
              </Display>
            </Display>
          </View>
          <Body className="text-muted text-sm leading-5 mt-2">
            <BodyBold style={{ color: colors.primary }}>{openCount} open</BodyBold>
            {" · "}refreshes every 15 seconds.
          </Body>
        </Animated.View>

        {/* Search */}
        {orders.length > 0 ? (
          <Animated.View entering={FadeInUp.duration(360).delay(80)} className="mt-5">
            <View
              className="flex-row items-center rounded-2xl px-4"
              style={{
                backgroundColor: colors["background-elevated"],
                borderWidth: 1.5,
                borderColor: searchFocused ? colors.primary : colors["border-soft"],
              }}
            >
              <Ionicons
                name="search"
                size={18}
                color={searchFocused ? colors.primary : colors.muted}
              />
              <TextInput
                className="flex-1 py-3 pl-3 font-body"
                style={{ color: colors.foreground }}
                placeholder="Search order #, buyer, address…"
                placeholderTextColor={colors["muted-soft"]}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60">
                  <Ionicons name="close-circle" size={18} color={colors["muted-soft"]} />
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        ) : null}

        {/* Status filter pills */}
        <Animated.View entering={FadeInUp.duration(420).delay(120)} className="mt-4 -mx-5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
          >
            {FILTERS.map((f) => {
              const active = statusFilter === f.key;
              const count =
                f.key === "all"
                  ? orders.length
                  : f.key === "open"
                    ? openCount
                    : orders.filter((o) => o.status === f.key).length;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setStatusFilter(f.key)}
                  className="active:opacity-80"
                >
                  <View
                    className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full"
                    style={{
                      backgroundColor: active
                        ? colors.foreground
                        : colors["background-elevated"],
                      borderWidth: 1.5,
                      borderColor: active ? colors.foreground : colors["border-soft"],
                    }}
                  >
                    <BodyBold
                      className="text-[12px]"
                      style={{ color: active ? colors.background : colors.foreground }}
                    >
                      {f.label}
                    </BodyBold>
                    <MonoBold
                      className="text-[10px]"
                      style={{
                        color: active ? colors.background : colors.muted,
                        opacity: active ? 0.7 : 1,
                      }}
                    >
                      {count}
                    </MonoBold>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Buyer filter pills */}
        {buyers.length > 1 ? (
          <Animated.View entering={FadeInUp.duration(360).delay(160)} className="mt-3 -mx-5">
            <View className="px-5 mb-2">
              <Label>FROM · BUYER</Label>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
            >
              <BuyerChip
                label="All buyers"
                count={orders.length}
                active={buyerFilter === "all"}
                onPress={() => setBuyerFilter("all")}
              />
              {buyers.map((b) => {
                const count = orders.filter((o) => o.buyerId === b.id).length;
                return (
                  <BuyerChip
                    key={b.id}
                    label={b.name}
                    count={count}
                    active={buyerFilter === b.id}
                    onPress={() => setBuyerFilter(b.id)}
                  />
                );
              })}
            </ScrollView>
          </Animated.View>
        ) : null}
      </View>

      {ordersQ.isLoading ? (
        <ActivityIndicator color={colors.primary} className="mt-12" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 32,
            paddingTop: 18,
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl
              refreshing={ordersQ.isFetching && !ordersQ.isLoading}
              onRefresh={() => ordersQ.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeInUp.duration(420).delay(60)}>
              {orders.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="No orders here"
                  description="New orders will appear when buyers check out."
                />
              ) : (
                <EmptyState
                  icon="filter-outline"
                  title="No orders match"
                  description="Try a different status, buyer, or search."
                  action={
                    filtersActive ? (
                      <Pressable onPress={clearFilters} className="active:opacity-85">
                        <Card raised className="px-4 py-2">
                          <MonoBold
                            className="text-[11px]"
                            style={{ color: colors.foreground, letterSpacing: 1.2 }}
                          >
                            CLEAR FILTERS
                          </MonoBold>
                        </Card>
                      </Pressable>
                    ) : null
                  }
                />
              )}
            </Animated.View>
          }
          renderItem={({ item, index }) => {
            const status = item.status as OrderStatus;
            return (
              <Animated.View
                entering={FadeInDown.springify().damping(18).delay(Math.min(index, 6) * 25)}
                layout={LinearTransition.springify().damping(18)}
              >
                <Card raised className="overflow-hidden">
                  <Link href={`/order/${item.id}`} asChild>
                    <Pressable className="active:opacity-90">
                      <View className="px-4 pt-3.5 pb-3">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center gap-2">
                            <Mono className="text-muted text-[10px]">
                              №{String(item.id).padStart(4, "0")}
                            </Mono>
                            <View className="w-1 h-1 rounded-full bg-muted-soft" />
                            <Mono className="text-muted text-[10px]">
                              {new Date(item.createdAt).toLocaleDateString("fr-TN", {
                                month: "short",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Mono>
                          </View>
                          <StatusBadge status={status} />
                        </View>

                        {/* Buyer line */}
                        {item.buyerBusinessName ? (
                          <View className="flex-row items-center gap-1.5 mb-2">
                            <Ionicons name="person" size={11} color={colors.primary} />
                            <BodyBold
                              className="text-foreground text-[13px]"
                              numberOfLines={1}
                            >
                              {item.buyerBusinessName}
                            </BodyBold>
                          </View>
                        ) : null}

                        <View className="flex-row items-end justify-between mt-1">
                          <View className="flex-1 pr-3">
                            <View className="flex-row items-start gap-1.5 mb-1.5">
                              <Ionicons
                                name="location"
                                size={11}
                                color={colors.muted}
                                style={{ marginTop: 2 }}
                              />
                              <Body
                                className="text-muted text-xs leading-4 flex-1"
                                numberOfLines={2}
                              >
                                {item.deliveryAddress}
                              </Body>
                            </View>
                            {item.notes ? (
                              <View className="flex-row items-start gap-1.5">
                                <Ionicons
                                  name="chatbox"
                                  size={11}
                                  color={colors["muted-soft"]}
                                  style={{ marginTop: 2 }}
                                />
                                <Body
                                  className="text-muted text-[11px] italic flex-1 leading-4"
                                  numberOfLines={1}
                                >
                                  “{item.notes}”
                                </Body>
                              </View>
                            ) : null}
                          </View>
                          <View className="items-end">
                            <DisplaySm className="text-foreground text-[20px]">
                              {formatPrice(item.totalPrice)}
                            </DisplaySm>
                            <MonoBold
                              className="text-muted text-[10px] mt-0.5"
                              style={{ letterSpacing: 0.8 }}
                            >
                              {item.items.length} ITEM{item.items.length === 1 ? "" : "S"}
                            </MonoBold>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </Link>

                  {/* Status transition row */}
                  <View
                    className="px-4 py-3"
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: colors["border-soft"],
                      backgroundColor: colors["background-elevated"],
                    }}
                  >
                    <Label className="mb-2">UPDATE STATUS</Label>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6 }}
                    >
                      {STATUSES.map((s) => {
                        const active = status === s;
                        const allowed = active || canTransitionOrderStatus(status, s);
                        return (
                          <Pressable
                            key={s}
                            disabled={active || updateStatus.isPending || !allowed}
                            onPress={() => updateStatus.mutate({ id: item.id, status: s })}
                            className="active:opacity-80"
                          >
                            <View
                              className="px-2.5 py-1 rounded-full"
                              style={{
                                backgroundColor: active
                                  ? colors.primary
                                  : colors.surface,
                                borderWidth: 1,
                                borderColor: active
                                  ? colors.primary
                                  : colors["border-soft"],
                                opacity: !allowed ? 0.35 : 1,
                              }}
                            >
                              <MonoBold
                                className="text-[10px]"
                                style={{
                                  color: active ? colors.background : colors.foreground,
                                  letterSpacing: 0.8,
                                }}
                              >
                                {s.toUpperCase()}
                              </MonoBold>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </Card>
              </Animated.View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

function BuyerChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <View
        className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
        style={{
          backgroundColor: active ? colors.primary : colors["background-elevated"],
          borderWidth: 1.5,
          borderColor: active ? colors.primary : colors["border-soft"],
        }}
      >
        <Body
          className="text-[12px]"
          style={{ color: active ? colors.background : colors.foreground }}
          numberOfLines={1}
        >
          {label}
        </Body>
        <MonoBold
          className="text-[10px]"
          style={{
            color: active ? colors.background : colors.muted,
            opacity: active ? 0.8 : 1,
          }}
        >
          {count}
        </MonoBold>
      </View>
    </Pressable>
  );
}
