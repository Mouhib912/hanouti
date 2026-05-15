import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";

import { Card, Pill } from "@/components/receipt-card";
import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import { Body, BodyBold, Display, DisplaySm, Label, Mono, MonoBold } from "@/components/typography";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/utils";

export default function BuyerOrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const ordersQ = trpc.orders.listBuyer.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const orders = ordersQ.data ?? [];
  const activeCount = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  ).length;

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
      </View>

      {ordersQ.isLoading ? (
        <ActivityIndicator color={colors.primary} className="mt-12" />
      ) : (
        <FlatList
          data={orders}
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
              <EmptyState
                icon="receipt-outline"
                title="No orders yet"
                description="When you check out from a supplier, your orders will appear here."
              />
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
