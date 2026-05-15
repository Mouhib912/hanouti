import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, FadeOut, LinearTransition } from "react-native-reanimated";

import { Card, Pill } from "@/components/receipt-card";
import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import { Body, BodyBold, Display, DisplaySm, Label, Mono, MonoBold } from "@/components/typography";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/utils";

type DetailedItem = {
  cartItemId: number;
  quantity: number;
  productId: number;
  productName: string;
  price: string;
  inStock: boolean;
  imageUrl: string | null;
  providerId: number;
  providerBusinessName: string;
};

type ProviderGroup = {
  providerId: number;
  providerBusinessName: string;
  items: DetailedItem[];
  total: number;
};

export default function BuyerCartScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const cartQ = trpc.cart.detailed.useQuery();
  const addressesQ = trpc.addresses.list.useQuery();
  const [actionError, setActionError] = useState<string | null>(null);

  const updateItem = trpc.cart.update.useMutation({
    onMutate: async ({ id, quantity }) => {
      await utils.cart.detailed.cancel();
      const prev = utils.cart.detailed.getData();
      utils.cart.detailed.setData(undefined, (old) => {
        if (!old) return old;
        if (quantity === 0) return old.filter((it) => it.cartItemId !== id);
        return old.map((it) => (it.cartItemId === id ? { ...it, quantity } : it));
      });
      return { prev };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev) utils.cart.detailed.setData(undefined, ctx.prev);
      setActionError(err.message);
    },
    onSettled: () => utils.cart.detailed.invalidate(),
  });

  const removeItem = trpc.cart.remove.useMutation({
    onMutate: async ({ id }) => {
      await utils.cart.detailed.cancel();
      const prev = utils.cart.detailed.getData();
      utils.cart.detailed.setData(undefined, (old) =>
        old ? old.filter((it) => it.cartItemId !== id) : old,
      );
      return { prev };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev) utils.cart.detailed.setData(undefined, ctx.prev);
      setActionError(err.message);
    },
    onSettled: () => utils.cart.detailed.invalidate(),
  });

  const checkout = trpc.orders.checkoutProvider.useMutation({
    onSuccess: (orderId) => {
      utils.cart.detailed.invalidate();
      utils.cart.list.invalidate();
      utils.orders.listBuyer.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/order/${orderId}`);
    },
    onError: (err) => setActionError(err.message),
  });

  const groups: ProviderGroup[] = useMemo(() => {
    const map = new Map<number, ProviderGroup>();
    for (const item of cartQ.data ?? []) {
      const g = map.get(item.providerId) ?? {
        providerId: item.providerId,
        providerBusinessName: item.providerBusinessName,
        items: [],
        total: 0,
      };
      g.items.push(item);
      g.total += Number(item.price) * item.quantity;
      map.set(item.providerId, g);
    }
    return Array.from(map.values());
  }, [cartQ.data]);

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  const totalItems = groups.reduce(
    (sum, g) => sum + g.items.reduce((s, it) => s + it.quantity, 0),
    0,
  );

  if (cartQ.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

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
            <Pill intent="ghost">
              <Ionicons name="cart" size={11} color={colors.primary} />
              <Label className="text-foreground">CART</Label>
            </Pill>
          </View>

          <View className="mt-5 mb-1">
            <Display className="text-foreground text-[36px] leading-[40px]">
              Your{" "}
              <Display
                className="text-[36px] leading-[40px]"
                style={{ color: colors.primary }}
              >
                cart.
              </Display>
            </Display>
            <Body className="text-muted text-sm leading-5 mt-2 max-w-[92%]">
              Each supplier checks out separately — review and place orders below.
            </Body>
          </View>
        </Animated.View>

        {groups.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(420).delay(80)} className="mt-6">
            <EmptyState
              icon="cart-outline"
              title="Your cart is empty"
              description="Browse suppliers and add items — each supplier checks out separately."
              action={
                <Pressable
                  onPress={() => router.push("/buyer/providers")}
                  className="active:opacity-85"
                >
                  <Card intent="primary" raised className="px-5 py-2.5">
                    <BodyBold style={{ color: colors.background }}>Browse suppliers</BodyBold>
                  </Card>
                </Pressable>
              }
            />
          </Animated.View>
        ) : (
          <>
            {/* Grand total summary */}
            <Animated.View entering={FadeInUp.duration(420).delay(80)} className="mt-6 mb-5">
              <Card raised className="px-4 py-4">
                <View className="flex-row items-end justify-between">
                  <View>
                    <Label>CART TOTAL</Label>
                    <Display
                      className="mt-1 text-[34px] leading-9"
                      style={{ color: colors.primary }}
                    >
                      {formatPrice(grandTotal)}
                    </Display>
                  </View>
                  <View className="items-end gap-1.5">
                    <Pill intent="ghost">
                      <MonoBold className="text-foreground text-[10px]">
                        {totalItems} ITEM{totalItems === 1 ? "" : "S"}
                      </MonoBold>
                    </Pill>
                    <Pill intent="ghost">
                      <MonoBold className="text-foreground text-[10px]">
                        {groups.length} SUPPLIER{groups.length === 1 ? "" : "S"}
                      </MonoBold>
                    </Pill>
                  </View>
                </View>
              </Card>
            </Animated.View>

            {actionError ? (
              <Animated.View entering={FadeInDown.duration(300)} className="mb-3">
                <View
                  className="flex-row items-start gap-2 rounded-2xl px-3.5 py-2.5"
                  style={{ backgroundColor: colors.error + "14" }}
                >
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Body className="text-sm flex-1" style={{ color: colors.error }}>
                    {actionError}
                  </Body>
                  <Pressable onPress={() => setActionError(null)} hitSlop={6}>
                    <Ionicons name="close" size={14} color={colors.error} />
                  </Pressable>
                </View>
              </Animated.View>
            ) : null}

            <View className="gap-4">
              {groups.map((g, idx) => (
                <Animated.View
                  key={g.providerId}
                  entering={FadeInDown.springify().damping(18).delay(Math.min(idx, 4) * 60)}
                  exiting={FadeOut.duration(200)}
                  layout={LinearTransition.springify().damping(18)}
                >
                  <ProviderCartBlock
                    group={g}
                    savedAddresses={addressesQ.data ?? []}
                    onChangeQuantity={(id, qty) => updateItem.mutate({ id, quantity: qty })}
                    onRemove={(id) => removeItem.mutate({ id })}
                    onCheckout={(deliveryAddress, notes) =>
                      checkout.mutate({
                        providerId: g.providerId,
                        deliveryAddress,
                        notes: notes || undefined,
                      })
                    }
                    pending={checkout.isPending && checkout.variables?.providerId === g.providerId}
                  />
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

type SavedAddress = { id: number; label: string; address: string; isDefault: boolean };

function ProviderCartBlock({
  group,
  savedAddresses,
  onChangeQuantity,
  onRemove,
  onCheckout,
  pending,
}: {
  group: ProviderGroup;
  savedAddresses: SavedAddress[];
  onChangeQuantity: (cartItemId: number, quantity: number) => void;
  onRemove: (cartItemId: number) => void;
  onCheckout: (deliveryAddress: string, notes: string) => void;
  pending: boolean;
}) {
  const colors = useColors();
  const defaultAddress = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [address, setAddress] = useState(defaultAddress?.address ?? "");
  const [touched, setTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (!touched && !address && defaultAddress) {
      setAddress(defaultAddress.address);
    }
  }, [defaultAddress, touched, address]);

  return (
    <Card raised className="overflow-hidden">
      {/* Provider header strip */}
      <View
        className="flex-row items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: colors["background-elevated"],
          borderBottomWidth: 1,
          borderBottomColor: colors["border-soft"],
        }}
      >
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: colors.primary + "16" }}
        >
          <Ionicons name="storefront" size={16} color={colors.primary} />
        </View>
        <View className="flex-1 min-w-0">
          <Label>SUPPLIER</Label>
          <BodyBold className="text-foreground" numberOfLines={1}>
            {group.providerBusinessName}
          </BodyBold>
        </View>
      </View>

      {/* Items */}
      <View className="px-4 py-3 gap-3">
        {group.items.map((it) => (
          <View key={it.cartItemId} className="flex-row items-center gap-3">
            {it.imageUrl ? (
              <Image
                source={{ uri: resolveImageUrl(it.imageUrl) ?? undefined }}
                style={{ width: 52, height: 52, borderRadius: 12 }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View
                className="w-[52px] h-[52px] rounded-xl items-center justify-center"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors["border-soft"],
                }}
              >
                <Ionicons name="image-outline" size={18} color={colors["muted-soft"]} />
              </View>
            )}
            <View className="flex-1 min-w-0">
              <BodyBold className="text-foreground text-[13px]" numberOfLines={1}>
                {it.productName}
              </BodyBold>
              <Mono className="text-muted text-[11px] mt-0.5">
                {formatPrice(it.price)} ×{it.quantity} ·{" "}
                <Mono style={{ color: colors.foreground }}>
                  {formatPrice(Number(it.price) * it.quantity)}
                </Mono>
              </Mono>
            </View>
            <View
              className="flex-row items-center rounded-full overflow-hidden"
              style={{
                borderWidth: 1,
                borderColor: colors["border-soft"],
                backgroundColor: colors["background-elevated"],
              }}
            >
              <Pressable
                className="w-8 h-8 items-center justify-center active:opacity-60"
                onPress={() => onChangeQuantity(it.cartItemId, Math.max(0, it.quantity - 1))}
                hitSlop={4}
              >
                <Ionicons name="remove" size={14} color={colors.foreground} />
              </Pressable>
              <View className="w-6 items-center">
                <MonoBold className="text-foreground text-[12px]">{it.quantity}</MonoBold>
              </View>
              <Pressable
                className="w-8 h-8 items-center justify-center active:opacity-60"
                onPress={() => onChangeQuantity(it.cartItemId, it.quantity + 1)}
                hitSlop={4}
              >
                <Ionicons name="add" size={14} color={colors.foreground} />
              </Pressable>
            </View>
            <Pressable
              className="w-7 h-7 items-center justify-center active:opacity-60"
              onPress={() => onRemove(it.cartItemId)}
              hitSlop={6}
            >
              <Ionicons name="close" size={15} color={colors["muted-soft"]} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Subtotal + checkout */}
      <View
        className="px-4 py-3"
        style={{ borderTopWidth: 1, borderTopColor: colors["border-soft"] }}
      >
        <View className="flex-row items-center justify-between">
          <Label>SUBTOTAL</Label>
          <DisplaySm className="text-foreground text-[20px]">
            {formatPrice(group.total)}
          </DisplaySm>
        </View>

        {showCheckout ? (
          <Animated.View entering={FadeInUp.duration(240)} className="gap-3 pt-4">
            {savedAddresses.length > 0 ? (
              <View>
                <Label className="mb-2">SAVED ADDRESSES</Label>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {savedAddresses.map((a) => {
                    const active = address.trim() === a.address.trim();
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => {
                          setTouched(true);
                          setAddress(a.address);
                        }}
                        className="active:opacity-80"
                      >
                        <View
                          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
                          style={{
                            backgroundColor: active ? colors.foreground : colors["background-elevated"],
                            borderWidth: 1.5,
                            borderColor: active ? colors.foreground : colors["border-soft"],
                          }}
                        >
                          <Ionicons
                            name={a.isDefault ? "star" : "location"}
                            size={11}
                            color={active ? colors.background : colors.muted}
                          />
                          <BodyBold
                            className="text-[11px]"
                            style={{ color: active ? colors.background : colors.foreground }}
                          >
                            {a.label}
                          </BodyBold>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <FormRow
              icon="location-outline"
              placeholder="Delivery address"
              value={address}
              onChangeText={(v) => {
                setTouched(true);
                setAddress(v);
              }}
              multiline
            />
            <FormRow
              icon="chatbox-outline"
              placeholder="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
            />

            <View className="flex-row gap-2 mt-1">
              <Pressable
                onPress={() => setShowCheckout(false)}
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
              <Pressable
                disabled={!address.trim() || pending}
                onPress={() => onCheckout(address.trim(), notes.trim())}
                className="flex-[2] active:opacity-90"
                style={{ opacity: !address.trim() || pending ? 0.5 : 1 }}
              >
                <View
                  className="rounded-2xl py-3 items-center flex-row justify-center gap-2"
                  style={{ backgroundColor: colors.primary }}
                >
                  {pending ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <>
                      <Ionicons name="bag-check" size={16} color={colors.background} />
                      <MonoBold
                        className="text-[12px]"
                        style={{ color: colors.background, letterSpacing: 1.2 }}
                      >
                        PLACE ORDER
                      </MonoBold>
                    </>
                  )}
                </View>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <Pressable
            onPress={() => setShowCheckout(true)}
            className="active:opacity-90 mt-3"
          >
            <View
              className="rounded-2xl py-3 items-center flex-row justify-center gap-2"
              style={{ backgroundColor: colors.primary }}
            >
              <Ionicons name="bag-check-outline" size={16} color={colors.background} />
              <MonoBold
                className="text-[12px]"
                style={{ color: colors.background, letterSpacing: 1.2 }}
              >
                CHECKOUT THIS SUPPLIER
              </MonoBold>
            </View>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

function FormRow({
  icon,
  ...rest
}: React.ComponentProps<typeof TextInput> & {
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View
      className="flex-row items-center rounded-xl px-3"
      style={{
        backgroundColor: colors["background-elevated"],
        borderWidth: 1.5,
        borderColor: focused ? colors.primary : colors["border-soft"],
      }}
    >
      <Ionicons name={icon} size={16} color={focused ? colors.primary : colors.muted} />
      <TextInput
        className="flex-1 py-3 pl-2 font-body"
        style={{ color: colors.foreground }}
        placeholderTextColor={colors["muted-soft"]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
    </View>
  );
}
