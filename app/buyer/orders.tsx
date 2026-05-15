import { Ionicons } from "@expo/vector-icons";
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

type StatusFilter = "active" | "delivered" | "cancelled" | "all";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

export default function BuyerOrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const ordersQ = trpc.orders.listBuyer.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [supplierFilter, setSupplierFilter] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const orders = ordersQ.data ?? [];

  // Distinct suppliers from the orders list — for the supplier filter pills.
  const suppliers = useMemo(() => {
    const seen = new Map<number, string>();
    for (const o of orders) {
      if (!seen.has(o.providerId)) {
        seen.set(o.providerId, o.providerBusinessName ?? `Supplier #${o.providerId}`);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      // Status
      if (statusFilter === "active") {
        if (o.status === "delivered" || o.status === "cancelled") return false;
      } else if (statusFilter !== "all" && o.status !== statusFilter) {
        return false;
      }
      // Supplier
      if (supplierFilter !== "all" && o.providerId !== supplierFilter) return false;
      // Search (order id, supplier name, address, notes)
      if (q) {
        const hay = [
          String(o.id),
          o.providerBusinessName ?? "",
          o.deliveryAddress,
          o.notes ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, supplierFilter, query]);

  const activeCount = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  ).length;

  const filtersActive =
    statusFilter !== "active" || supplierFilter !== "all" || query.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter("active");
    setSupplierFilter("all");
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
              <Label className="text-foreground">MY ORDERS</Label>
            </Pill>
          </View>

          <View className="mt-5 mb-1">
            <Display className="text-foreground text-[36px] leading-[40px]">
              Your{" "}
              <Display
                className="text-[36px] leading-[40px]"
                style={{ color: colors.primary }}
              >
                orders.
              </Display>
            </Display>
          </View>
          {activeCount > 0 ? (
            <Body className="text-muted text-sm leading-5 mt-2">
              <BodyBold style={{ color: colors.primary }}>{activeCount} active</BodyBold>
              {" · "}tracking refreshes every 15 seconds.
            </Body>
          ) : (
            <Body className="text-muted text-sm leading-5 mt-2 max-w-[92%]">
              Every order you place lives here — from supplier confirmation to delivery.
            </Body>
          )}
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
                placeholder="Search order #, supplier, address…"
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

        {/* Status filter */}
        {orders.length > 0 ? (
          <Animated.View entering={FadeInUp.duration(360).delay(120)} className="mt-4 -mx-5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
            >
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.key;
                const count =
                  f.key === "all"
                    ? orders.length
                    : f.key === "active"
                      ? activeCount
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
                        backgroundColor: active ? colors.foreground : colors["background-elevated"],
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
        ) : null}

        {/* Supplier filter */}
        {suppliers.length > 1 ? (
          <Animated.View entering={FadeInUp.duration(360).delay(160)} className="mt-3 -mx-5">
            <View className="px-5 mb-2">
              <Label>FROM · SUPPLIER</Label>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
            >
              <SupplierChip
                label="All suppliers"
                count={orders.length}
                active={supplierFilter === "all"}
                onPress={() => setSupplierFilter("all")}
              />
              {suppliers.map((s) => {
                const count = orders.filter((o) => o.providerId === s.id).length;
                return (
                  <SupplierChip
                    key={s.id}
                    label={s.name}
                    count={count}
                    active={supplierFilter === s.id}
                    onPress={() => setSupplierFilter(s.id)}
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
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 32,
          }}
          refreshControl={
            <RefreshControl
              refreshing={ordersQ.isFetching && !ordersQ.isLoading}
              onRefresh={() => ordersQ.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeInUp.duration(420).delay(80)}>
              {orders.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="No orders yet"
                  description="When you check out from a supplier, your orders will appear here."
                />
              ) : (
                <EmptyState
                  icon="filter-outline"
                  title="No orders match"
                  description={
                    filtersActive
                      ? "Try a different status, supplier, or search."
                      : "Try a different search."
                  }
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
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.springify().damping(18).delay(Math.min(index, 6) * 30)}
              layout={LinearTransition.springify().damping(18)}
            >
              <Link href={`/order/${item.id}`} asChild>
                <Pressable className="active:opacity-90">
                  <Card raised className="px-4 py-3.5">
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
                          })}
                        </Mono>
                      </View>
                      <StatusBadge status={item.status as OrderStatus} />
                    </View>

                    {/* Supplier line */}
                    {item.providerBusinessName ? (
                      <View className="flex-row items-center gap-1.5 mb-2">
                        <Ionicons
                          name="storefront"
                          size={11}
                          color={colors.primary}
                        />
                        <BodyBold
                          className="text-foreground text-[13px]"
                          numberOfLines={1}
                        >
                          {item.providerBusinessName}
                        </BodyBold>
                      </View>
                    ) : null}

                    <View className="flex-row items-end justify-between mt-1">
                      <View className="flex-1 pr-3">
                        <Body className="text-muted text-xs leading-4" numberOfLines={2}>
                          {item.deliveryAddress}
                        </Body>
                        {item.notes ? (
                          <View className="flex-row items-start gap-1.5 mt-1.5">
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
                        <DisplaySm className="text-foreground text-[18px]">
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
                  </Card>
                </Pressable>
              </Link>
            </Animated.View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

function SupplierChip({
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
