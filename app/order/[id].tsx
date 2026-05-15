import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { Card, Pill } from "@/components/receipt-card";
import { ScreenContainer } from "@/components/screen-container";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import { StatusTimeline } from "@/components/status-timeline";
import {
  Body,
  BodyBold,
  Display,
  DisplaySm,
  Label,
  Mono,
  MonoBold,
} from "@/components/typography";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";
import { formatPhone, formatPrice } from "@/lib/utils";
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
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!orderQ.data) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Body className="text-muted text-center">
          {orderQ.error?.message ?? "Order not found"}
        </Body>
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

  const party = isProviderOnOrder ? order.buyer : order.provider;
  const partyKind = isProviderOnOrder ? "BUYER" : "SUPPLIER";

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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 }}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(360)}>
          <View className="flex-row items-center justify-between pt-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center bg-surface active:opacity-70"
              hitSlop={6}
            >
              <Ionicons name="arrow-back" size={18} color={colors.foreground} />
            </Pressable>
            <StatusBadge status={status} size="md" />
          </View>

          <View className="mt-5 mb-1">
            <Mono className="text-muted text-[11px]">
              №{String(order.id).padStart(4, "0")} ·{" "}
              {new Date(order.createdAt).toLocaleDateString("fr-TN", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })}
            </Mono>
            <Display className="text-foreground text-[36px] leading-[40px] mt-1">
              Order{" "}
              <Display
                className="text-[36px] leading-[40px]"
                style={{ color: colors.primary }}
              >
                #{order.id}.
              </Display>
            </Display>
          </View>
        </Animated.View>

        {/* Timeline */}
        <Animated.View entering={FadeInUp.duration(420).delay(60)} className="mt-6">
          <Card raised className="px-4 py-4">
            <Label className="mb-3">PROGRESS</Label>
            <StatusTimeline status={status} />
          </Card>
        </Animated.View>

        {/* Counterparty */}
        {party ? (
          <Animated.View entering={FadeInUp.duration(420).delay(120)} className="mt-3">
            <Card raised className="px-4 py-3.5">
              <Label className="mb-2">{partyKind}</Label>
              <View className="flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.primary + "16" }}
                >
                  <Ionicons
                    name={isProviderOnOrder ? "person" : "storefront"}
                    size={16}
                    color={colors.primary}
                  />
                </View>
                <View className="flex-1 min-w-0">
                  <BodyBold className="text-foreground" numberOfLines={1}>
                    {party.businessName}
                  </BodyBold>
                  <View className="flex-row items-center gap-3 mt-1 flex-wrap">
                    {party.contactPhone ? (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="call" size={11} color={colors.muted} />
                        <Mono className="text-muted text-[11px]">
                          {formatPhone(party.contactPhone)}
                        </Mono>
                      </View>
                    ) : null}
                    {!isProviderOnOrder && order.provider?.location ? (
                      <View className="flex-row items-center gap-1">
                        <Ionicons name="location" size={11} color={colors.muted} />
                        <Body className="text-muted text-[11px]" numberOfLines={1}>
                          {order.provider.location}
                        </Body>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </Card>
          </Animated.View>
        ) : null}

        {/* Delivery */}
        <Animated.View entering={FadeInUp.duration(420).delay(180)} className="mt-3">
          <Card raised className="px-4 py-3.5">
            <Label className="mb-2">DELIVERY</Label>
            <View className="flex-row items-start gap-2">
              <Ionicons
                name="location"
                size={14}
                color={colors.muted}
                style={{ marginTop: 3 }}
              />
              <Body className="text-foreground flex-1 leading-5">{order.deliveryAddress}</Body>
            </View>
            {order.notes ? (
              <View
                className="mt-3 pt-3 flex-row items-start gap-2"
                style={{ borderTopWidth: 1, borderTopColor: colors["border-soft"] }}
              >
                <Ionicons
                  name="chatbox"
                  size={14}
                  color={colors.muted}
                  style={{ marginTop: 3 }}
                />
                <Body className="text-foreground italic flex-1 leading-5">
                  “{order.notes}”
                </Body>
              </View>
            ) : null}
          </Card>
        </Animated.View>

        {/* Items + total */}
        <Animated.View entering={FadeInUp.duration(420).delay(240)} className="mt-3">
          <Card raised className="overflow-hidden">
            <View className="px-4 pt-3.5 pb-2 flex-row items-center justify-between">
              <Label>ITEMS</Label>
              <Mono className="text-muted text-[10px]">
                {order.items.length} LINE{order.items.length === 1 ? "" : "S"}
              </Mono>
            </View>
            <View className="px-4 pb-3 gap-2.5">
              {order.items.map((it, idx) => {
                const meta = productById.get(it.productId);
                const line = it.price * it.quantity;
                return (
                  <View key={`${it.productId}-${idx}`} className="flex-row items-center gap-3">
                    {meta?.imageUrl ? (
                      <Image
                        source={{ uri: resolveImageUrl(meta.imageUrl) ?? undefined }}
                        style={{ width: 40, height: 40, borderRadius: 10 }}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors["border-soft"],
                        }}
                      >
                        <Ionicons name="image-outline" size={14} color={colors["muted-soft"]} />
                      </View>
                    )}
                    <View className="flex-1 min-w-0">
                      <Body className="text-foreground text-[13px]" numberOfLines={1}>
                        {meta?.name ?? `Product #${it.productId}`}
                      </Body>
                      <Mono className="text-muted text-[10px] mt-0.5">
                        {formatPrice(it.price)} ×{it.quantity}
                      </Mono>
                    </View>
                    <MonoBold className="text-foreground text-[12px]">
                      {formatPrice(line)}
                    </MonoBold>
                  </View>
                );
              })}
            </View>
            <View
              className="px-4 py-3 flex-row items-center justify-between"
              style={{
                borderTopWidth: 1,
                borderTopColor: colors["border-soft"],
                backgroundColor: colors["background-elevated"],
              }}
            >
              <Label>TOTAL</Label>
              <DisplaySm
                className="text-[22px]"
                style={{ color: colors.primary }}
              >
                {formatPrice(order.totalPrice)}
              </DisplaySm>
            </View>
          </Card>
        </Animated.View>

        {/* Provider-only: status update */}
        {isProviderOnOrder ? (
          <Animated.View entering={FadeInUp.duration(420).delay(300)} className="mt-3">
            <Card raised className="px-4 py-3.5">
              <Label className="mb-2.5">UPDATE STATUS</Label>
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
                      onPress={() => updateStatus.mutate({ id: order.id, status: s })}
                      className="active:opacity-80"
                    >
                      <View
                        className="px-3 py-1.5 rounded-full"
                        style={{
                          backgroundColor: active ? colors.primary : colors["background-elevated"],
                          borderWidth: 1.5,
                          borderColor: active ? colors.primary : colors["border-soft"],
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
            </Card>
          </Animated.View>
        ) : null}

        {/* Buyer-only: review (delivered orders) + reorder + cancel */}
        {isBuyerOnOrder ? (
          <Animated.View entering={FadeInUp.duration(420).delay(300)} className="mt-3 gap-3">
            {status === "delivered" ? (
              <ReviewSection orderId={order.id} providerId={order.providerId} />
            ) : null}
            {reorderNote ? (
              <View
                className="flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5"
                style={{ backgroundColor: colors.primary + "12" }}
              >
                <Ionicons name="information-circle" size={16} color={colors.primary} />
                <Body className="text-sm flex-1" style={{ color: colors["primary-deep"] }}>
                  {reorderNote}
                </Body>
              </View>
            ) : null}

            <Pressable
              disabled={reorder.isPending}
              onPress={() => {
                setReorderNote(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                reorder.mutate({ id: order.id });
              }}
              className="active:opacity-90"
              style={{ opacity: reorder.isPending ? 0.5 : 1 }}
            >
              <View
                className="rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
                style={{ backgroundColor: colors.primary }}
              >
                {reorder.isPending ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="repeat" size={16} color={colors.background} />
                    <MonoBold
                      className="text-[12px]"
                      style={{ color: colors.background, letterSpacing: 1.2 }}
                    >
                      REORDER THESE ITEMS
                    </MonoBold>
                  </>
                )}
              </View>
            </Pressable>

            {status === "pending" ? (
              <Pressable
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
                className="active:opacity-80"
              >
                <View
                  className="rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
                  style={{
                    backgroundColor: "transparent",
                    borderWidth: 1.5,
                    borderColor: colors.error + "60",
                  }}
                >
                  {cancelByBuyer.isPending ? (
                    <ActivityIndicator color={colors.error} />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={16} color={colors.error} />
                      <MonoBold
                        className="text-[12px]"
                        style={{ color: colors.error, letterSpacing: 1.2 }}
                      >
                        CANCEL ORDER
                      </MonoBold>
                    </>
                  )}
                </View>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * ReviewSection — shown on delivered orders for the buyer.
 * If no review exists: opens to a star picker + comment input.
 * If a review exists: shows the stars + comment with an Edit affordance.
 */
function ReviewSection({ orderId, providerId }: { orderId: number; providerId: number }) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const reviewQ = trpc.reviews.forOrder.useQuery({ orderId });
  const upsert = trpc.reviews.upsert.useMutation({
    onSuccess: async () => {
      await utils.reviews.forOrder.invalidate({ orderId });
      await utils.reviews.byProvider.invalidate({ providerId });
      await utils.providers.list.invalidate();
      await utils.providers.get.invalidate({ id: providerId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    },
    onError: (err) => setError(err.message),
  });

  const existing = reviewQ.data ?? null;
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment ?? "");
    } else {
      setRating(0);
      setComment("");
    }
  }, [existing]);

  const isEmpty = !existing && !editing;
  const isExpanded = editing || !existing;

  if (reviewQ.isLoading) {
    return (
      <Card raised className="px-4 py-4 items-center">
        <ActivityIndicator color={colors.primary} />
      </Card>
    );
  }

  // Already submitted, read-only view with edit affordance.
  if (existing && !editing) {
    return (
      <Card raised className="px-4 py-4">
        <View className="flex-row items-center justify-between mb-2">
          <Label>YOUR REVIEW</Label>
          <Pressable onPress={() => setEditing(true)} hitSlop={6} className="active:opacity-60">
            <MonoBold
              className="text-[11px]"
              style={{ color: colors.primary, letterSpacing: 1.2 }}
            >
              EDIT
            </MonoBold>
          </Pressable>
        </View>
        <StarRow rating={existing.rating} />
        {existing.comment ? (
          <Body className="text-foreground text-sm mt-3 leading-5 italic">
            “{existing.comment}”
          </Body>
        ) : null}
        <Mono className="text-muted text-[10px] mt-3">
          {new Date(existing.createdAt).toLocaleDateString("fr-TN", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })}
        </Mono>
      </Card>
    );
  }

  return (
    <Card raised className="px-4 py-4">
      <Label className="mb-1">{existing ? "EDIT YOUR REVIEW" : "RATE THIS ORDER"}</Label>
      <Body className="text-muted text-xs leading-4 mb-3">
        How was your experience? Your rating helps other buyers find good suppliers.
      </Body>

      <StarRow rating={rating} interactive onChange={setRating} size={32} />

      <View className="mt-4">
        <Label className="mb-2">OPTIONAL · COMMENT</Label>
        <View
          className="rounded-2xl px-3.5"
          style={{
            backgroundColor: colors["background-elevated"],
            borderWidth: 1.5,
            borderColor: colors["border-soft"],
          }}
        >
          <TextInput
            className="py-3 font-body"
            style={{ color: colors.foreground, minHeight: 70 }}
            placeholder="Optional — what stood out?"
            placeholderTextColor={colors["muted-soft"]}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={1000}
          />
        </View>
      </View>

      {error ? (
        <View
          className="flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5 mt-3"
          style={{ backgroundColor: colors.error + "14" }}
        >
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Body className="text-sm flex-1" style={{ color: colors.error }}>
            {error}
          </Body>
        </View>
      ) : null}

      <View className="flex-row gap-2 mt-3">
        {existing ? (
          <Pressable
            onPress={() => {
              setEditing(false);
              setError(null);
              setRating(existing.rating);
              setComment(existing.comment ?? "");
            }}
            className="flex-1 active:opacity-85"
          >
            <View
              className="rounded-2xl py-3 items-center"
              style={{
                backgroundColor: colors["background-elevated"],
                borderWidth: 1.5,
                borderColor: colors["border-soft"],
              }}
            >
              <BodyBold className="text-foreground text-[13px]">Cancel</BodyBold>
            </View>
          </Pressable>
        ) : null}
        <Pressable
          disabled={rating < 1 || upsert.isPending}
          onPress={() => {
            setError(null);
            upsert.mutate({
              orderId,
              rating,
              comment: comment.trim() || undefined,
            });
          }}
          className={existing ? "flex-[2] active:opacity-90" : "flex-1 active:opacity-90"}
          style={{ opacity: rating < 1 || upsert.isPending ? 0.5 : 1 }}
        >
          <View
            className="rounded-2xl py-3 items-center flex-row justify-center gap-2"
            style={{ backgroundColor: colors.primary }}
          >
            {upsert.isPending ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Ionicons name="star" size={14} color={colors.background} />
                <MonoBold
                  className="text-[12px]"
                  style={{ color: colors.background, letterSpacing: 1.2 }}
                >
                  {existing ? "UPDATE REVIEW" : "SUBMIT REVIEW"}
                </MonoBold>
              </>
            )}
          </View>
        </Pressable>
      </View>

      {isEmpty ? (
        <Body className="text-muted text-[10px] mt-3 text-center">
          Tap stars to rate — required before submitting.
        </Body>
      ) : null}
      {!isExpanded ? null : null /* keep var unused warning at bay */}
    </Card>
  );
}

/**
 * StarRow — read-only by default, interactive when onChange is provided.
 */
function StarRow({
  rating,
  size = 18,
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (n: number) => void;
}) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= rating;
        const Wrapper: React.ComponentType<{ children: React.ReactNode }> = interactive
          ? ({ children }) => (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange?.(n);
                }}
                hitSlop={4}
                className="active:opacity-70"
              >
                {children}
              </Pressable>
            )
          : ({ children }) => <View>{children}</View>;
        return (
          <Wrapper key={n}>
            <Ionicons
              name={filled ? "star" : "star-outline"}
              size={size}
              color={filled ? colors.primary : colors["muted-soft"]}
            />
          </Wrapper>
        );
      })}
    </View>
  );
}
