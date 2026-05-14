import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";

import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";

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

  if (cartQ.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ title: "Cart", headerShown: true }} />
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5">
      <Stack.Screen options={{ title: "Cart", headerShown: true }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {groups.length === 0 ? (
          <EmptyState
            icon="cart-outline"
            title="Your cart is empty"
            description="Browse suppliers and add items — each supplier checks out separately."
            action={
              <TouchableOpacity
                onPress={() => router.push("/buyer/providers")}
                className="bg-primary rounded-full px-5 py-2.5 active:opacity-80"
              >
                <Text className="text-background font-semibold">Browse suppliers</Text>
              </TouchableOpacity>
            }
          />
        ) : (
          <View className="gap-4 pt-3">
            {actionError ? (
              <View className="flex-row items-start gap-2 bg-error/10 rounded-xl p-3">
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text className="text-error text-sm flex-1">{actionError}</Text>
                <TouchableOpacity onPress={() => setActionError(null)} hitSlop={6}>
                  <Ionicons name="close" size={14} color={colors.error} />
                </TouchableOpacity>
              </View>
            ) : null}
            <View className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex-row items-center justify-between">
              <View>
                <Text className="text-muted text-xs uppercase tracking-wider">Cart total</Text>
                <Text className="text-foreground text-2xl font-bold mt-1">
                  ${grandTotal.toFixed(2)}
                </Text>
              </View>
              <View className="bg-background rounded-full px-3 py-1.5 border border-border">
                <Text className="text-foreground text-xs">
                  {groups.length} supplier{groups.length === 1 ? "" : "s"}
                </Text>
              </View>
            </View>

            {groups.map((g, idx) => (
              <Animated.View
                key={g.providerId}
                entering={FadeInDown.springify().damping(18).delay(Math.min(idx, 4) * 30)}
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
    <View className="bg-surface border border-border rounded-2xl overflow-hidden">
      <View className="flex-row items-center gap-2 px-4 py-3 border-b border-border bg-background-elevated">
        <View className="w-8 h-8 rounded-full bg-primary/15 items-center justify-center">
          <Ionicons name="storefront-outline" size={16} color={colors.primary} />
        </View>
        <Text className="text-foreground font-semibold flex-1" numberOfLines={1}>
          {group.providerBusinessName}
        </Text>
      </View>

      <View className="px-4 py-3 gap-3">
        {group.items.map((it) => (
          <View key={it.cartItemId} className="flex-row items-center gap-3">
            {it.imageUrl ? (
              <Image
                source={{ uri: resolveImageUrl(it.imageUrl) ?? undefined }}
                style={{ width: 48, height: 48, borderRadius: 10 }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <View className="w-12 h-12 rounded-xl bg-background border border-border items-center justify-center">
                <Ionicons name="image-outline" size={18} color={colors["muted-soft"]} />
              </View>
            )}
            <View className="flex-1 min-w-0">
              <Text className="text-foreground" numberOfLines={1}>
                {it.productName}
              </Text>
              <Text className="text-muted text-xs">
                ${it.price} · ${(Number(it.price) * it.quantity).toFixed(2)}
              </Text>
            </View>
            <View className="flex-row items-center bg-background border border-border rounded-full">
              <TouchableOpacity
                className="w-8 h-8 items-center justify-center active:opacity-60"
                onPress={() => onChangeQuantity(it.cartItemId, Math.max(0, it.quantity - 1))}
                hitSlop={4}
              >
                <Ionicons name="remove" size={16} color={colors.foreground} />
              </TouchableOpacity>
              <Text className="w-6 text-center text-foreground font-medium">{it.quantity}</Text>
              <TouchableOpacity
                className="w-8 h-8 items-center justify-center active:opacity-60"
                onPress={() => onChangeQuantity(it.cartItemId, it.quantity + 1)}
                hitSlop={4}
              >
                <Ionicons name="add" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              className="w-7 h-7 items-center justify-center active:opacity-60"
              onPress={() => onRemove(it.cartItemId)}
              hitSlop={6}
            >
              <Ionicons name="close" size={16} color={colors["muted-soft"]} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View className="border-t border-border px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-muted text-sm">Subtotal</Text>
          <Text className="text-foreground font-bold text-lg">${group.total.toFixed(2)}</Text>
        </View>

        {showCheckout ? (
          <View className="gap-2 pt-3">
            {savedAddresses.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
              >
                {savedAddresses.map((a) => {
                  const active = address.trim() === a.address.trim();
                  return (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => {
                        setTouched(true);
                        setAddress(a.address);
                      }}
                      className={`px-3 py-1.5 rounded-full border flex-row items-center gap-1.5 ${
                        active ? "bg-primary border-primary" : "bg-background border-border"
                      }`}
                    >
                      <Ionicons
                        name={a.isDefault ? "star" : "location-outline"}
                        size={12}
                        color={active ? colors.background : colors.muted}
                      />
                      <Text
                        className={`text-xs ${active ? "text-background font-semibold" : "text-foreground"}`}
                      >
                        {a.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}
            <View className="bg-background border border-border rounded-xl px-3 flex-row items-center">
              <Ionicons name="location-outline" size={16} color={colors.muted} />
              <TextInput
                className="flex-1 py-3 pl-2 text-foreground"
                placeholder="Delivery address"
                placeholderTextColor={colors["muted-soft"]}
                value={address}
                onChangeText={(v) => {
                  setTouched(true);
                  setAddress(v);
                }}
                multiline
              />
            </View>
            <View className="bg-background border border-border rounded-xl px-3 flex-row items-center">
              <Ionicons name="chatbox-outline" size={16} color={colors.muted} />
              <TextInput
                className="flex-1 py-3 pl-2 text-foreground"
                placeholder="Notes (optional)"
                placeholderTextColor={colors["muted-soft"]}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setShowCheckout(false)}
                className="flex-1 bg-background border border-border rounded-2xl py-3 items-center active:opacity-80"
              >
                <Text className="text-foreground font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-[2] bg-primary rounded-2xl py-3 items-center active:opacity-80 disabled:opacity-50"
                disabled={!address.trim() || pending}
                onPress={() => onCheckout(address.trim(), notes.trim())}
              >
                {pending ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text className="text-background font-semibold">Place order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            className="bg-primary rounded-2xl py-3 items-center active:opacity-80 mt-3 flex-row justify-center gap-2"
            onPress={() => setShowCheckout(true)}
          >
            <Ionicons name="bag-check-outline" size={18} color={colors.background} />
            <Text className="text-background font-semibold">Checkout this supplier</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
