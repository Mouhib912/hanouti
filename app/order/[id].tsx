import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Image } from "expo-image";

import { ScreenContainer } from "@/components/screen-container";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import { StatusTimeline } from "@/components/status-timeline";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/utils";
import { canTransitionOrderStatus } from "@/shared/const";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "ready", "delivered", "cancelled"];

export default function OrderDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [reorderNote, setReorderNote] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const orderQ = trpc.orders.get.useQuery(
    { id: orderId },
    {
      enabled: !!orderId,
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "delivered" || s === "cancelled" ? false : 10_000;
      },
    },
  );

  const productIds = useMemo(
    () => (orderQ.data?.items ?? []).map((it) => it.productId),
    [orderQ.data],
  );
  const productsQ = trpc.products.byIds.useQuery(
    { ids: productIds },
    { enabled: productIds.length > 0 },
  );

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      utils.orders.get.invalidate({ id: orderId });
      utils.orders.listProvider.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const cancelByBuyer = trpc.orders.cancelByBuyer.useMutation({
    onSuccess: () => {
      utils.orders.get.invalidate({ id: orderId });
      utils.orders.listBuyer.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    onError: (err) => setReorderNote(err.message),
  });

  const reorder = trpc.orders.reorder.useMutation({
    onSuccess: ({ added, skipped }) => {
      utils.cart.detailed.invalidate();
      utils.cart.list.invalidate();
      if (added === 0) {
        setReorderNote("All items are out of stock right now.");
        return;
      }
      if (skipped > 0) {
        setReorderNote(`${added} added, ${skipped} skipped (out of stock).`);
      }
      router.push("/buyer/cart");
    },
    onError: (err) => setReorderNote(err.message),
  });

  if (orderQ.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ title: "Order", headerShown: true }} />
        <ActivityIndicator />
      </ScreenContainer>
    );
  }

  if (!orderQ.data) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ title: "Order", headerShown: true }} />
        <Text className="text-muted">{orderQ.error?.message ?? "Order not found"}</Text>
      </ScreenContainer>
    );
  }

  const order = orderQ.data;
  const status = order.status as OrderStatus;
  const isProviderOnOrder = user?.id === order.providerId;
  const isBuyerOnOrder = user?.id === order.buyerId;

  const productById = new Map<number, { name: string; imageUrl: string | null }>();
  for (const p of productsQ.data ?? []) {
    productById.set(p.id, { name: p.name, imageUrl: p.imageUrl ?? null });
  }

  return (
    <ScreenContainer className="p-6">
      <Stack.Screen options={{ title: `Order #${order.id}`, headerShown: true }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="flex-row items-center justify-between pb-3">
          <Text className="text-2xl font-bold text-foreground">Order #{order.id}</Text>
          <StatusBadge status={status} size="md" />
        </View>

        <View className="bg-surface border border-border rounded-2xl p-4 mb-3">
          <StatusTimeline status={status} />
        </View>

        {(() => {
          const party = isProviderOnOrder ? order.buyer : order.provider;
          if (!party) return null;
          const partyLabel = isProviderOnOrder ? "Buyer" : "Supplier";
          const icon = isProviderOnOrder ? "person-outline" : "storefront-outline";
          return (
            <View className="bg-surface border border-border rounded-2xl p-4 gap-1 mb-3">
              <Text className="text-muted text-sm">{partyLabel}</Text>
              <View className="flex-row items-center gap-2">
                <Ionicons name={icon} size={16} color={colors.primary} />
                <Text className="text-foreground font-medium" numberOfLines={1}>
                  {party.businessName}
                </Text>
              </View>
              {party.contactPhone ? (
                <View className="flex-row items-center gap-2 mt-1">
                  <Ionicons name="call-outline" size={14} color={colors.muted} />
                  <Text className="text-muted text-sm">{party.contactPhone}</Text>
                </View>
              ) : null}
              {!isProviderOnOrder && order.provider?.location ? (
                <View className="flex-row items-center gap-2 mt-1">
                  <Ionicons name="location-outline" size={14} color={colors.muted} />
                  <Text className="text-muted text-sm">{order.provider.location}</Text>
                </View>
              ) : null}
            </View>
          );
        })()}

        <View className="bg-surface border border-border rounded-2xl p-4 gap-2">
          <Text className="text-muted text-sm">Delivery address</Text>
          <Text className="text-foreground">{order.deliveryAddress}</Text>
          {order.notes ? (
            <>
              <Text className="text-muted text-sm mt-2">Notes</Text>
              <Text className="text-foreground italic">“{order.notes}”</Text>
            </>
          ) : null}
        </View>

        <View className="bg-surface border border-border rounded-2xl p-4 mt-3 gap-2">
          <Text className="text-muted text-sm pb-1">Items</Text>
          {order.items.map((it, idx) => {
            const meta = productById.get(it.productId);
            return (
              <View key={`${it.productId}-${idx}`} className="flex-row items-center gap-2">
                {meta?.imageUrl ? (
                  <Image
                    source={{ uri: resolveImageUrl(meta.imageUrl) ?? undefined }}
                    style={{ width: 36, height: 36, borderRadius: 6 }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View className="w-9 h-9 rounded-md bg-background border border-border" />
                )}
                <Text className="text-foreground flex-1">
                  {meta?.name ?? `Product #${it.productId}`}
                  <Text className="text-muted"> × {it.quantity}</Text>
                </Text>
                <Text className="text-foreground">${(it.price * it.quantity).toFixed(2)}</Text>
              </View>
            );
          })}
          <View className="flex-row justify-between pt-2 mt-1 border-t border-border">
            <Text className="text-foreground font-semibold">Total</Text>
            <Text className="text-foreground font-semibold">{formatPrice(order.totalPrice)}</Text>
          </View>
        </View>

        {isProviderOnOrder ? (
          <View className="bg-surface border border-border rounded-2xl p-4 mt-3 gap-2">
            <Text className="text-muted text-sm">Update status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {STATUSES.map((s) => {
                const active = status === s;
                const allowed = active || canTransitionOrderStatus(status, s);
                return (
                  <TouchableOpacity
                    key={s}
                    className={`px-3 py-1.5 rounded-full border ${
                      active ? "bg-primary border-primary" : "bg-background border-border"
                    } ${!allowed ? "opacity-40" : ""}`}
                    disabled={active || updateStatus.isPending || !allowed}
                    onPress={() => updateStatus.mutate({ id: order.id, status: s })}
                  >
                    <Text className={active ? "text-background" : "text-foreground"}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {isBuyerOnOrder ? (
          <View className="mt-4 gap-2">
            {reorderNote ? (
              <View className="flex-row items-center gap-2 bg-warning/10 rounded-xl p-3">
                <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                <Text className="text-warning text-sm flex-1">{reorderNote}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              className="bg-primary rounded-2xl py-3.5 items-center flex-row justify-center gap-2 active:opacity-80 disabled:opacity-50"
              disabled={reorder.isPending}
              onPress={() => {
                setReorderNote(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                reorder.mutate({ id: order.id });
              }}
            >
              {reorder.isPending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons name="repeat-outline" size={18} color={colors.background} />
                  <Text className="text-background font-semibold">Reorder these items</Text>
                </>
              )}
            </TouchableOpacity>

            {status === "pending" ? (
              <TouchableOpacity
                className="bg-error/10 rounded-2xl py-3.5 items-center flex-row justify-center gap-2 active:opacity-80 disabled:opacity-50"
                disabled={cancelByBuyer.isPending}
                onPress={() =>
                  Alert.alert(
                    "Cancel this order?",
                    "The supplier will be notified. You can reorder later if you change your mind.",
                    [
                      { text: "Keep it", style: "cancel" },
                      {
                        text: "Cancel order",
                        style: "destructive",
                        onPress: () => {
                          setReorderNote(null);
                          cancelByBuyer.mutate({ id: order.id });
                        },
                      },
                    ],
                  )
                }
              >
                {cancelByBuyer.isPending ? (
                  <ActivityIndicator color={colors.error} />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                    <Text className="text-error font-semibold">Cancel order</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
