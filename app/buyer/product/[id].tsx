import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { Card, Pill } from "@/components/receipt-card";
import { ScreenContainer } from "@/components/screen-container";
import { Body, BodyBold, Display, DisplaySm, Label, Mono, MonoBold } from "@/components/typography";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/utils";

export default function BuyerProductDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);

  const productQ = trpc.products.get.useQuery({ id: productId }, { enabled: !!productId });
  const providerQ = trpc.providers.get.useQuery(
    { id: productQ.data?.providerId ?? 0 },
    { enabled: !!productQ.data?.providerId },
  );

  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.detailed.invalidate();
      utils.cart.list.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push("/buyer/cart");
    },
    onError: (err) => setError(err.message),
  });

  if (productQ.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  const product = productQ.data;
  if (!product) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={32} color={colors.muted} />
        <Body className="text-muted mt-2">Product not found.</Body>
      </ScreenContainer>
    );
  }

  const unitPrice = Number(product.price);
  const lineTotal = unitPrice * qty;
  const inStock = product.inStock;

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Hero image */}
        <Animated.View entering={FadeInDown.duration(420)}>
          <View className="px-5 pt-3">
            <View className="flex-row items-center justify-between mb-3">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full items-center justify-center bg-surface active:opacity-70"
                hitSlop={6}
              >
                <Ionicons name="arrow-back" size={18} color={colors.foreground} />
              </Pressable>
              <Pill intent="ghost">
                <View
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: inStock ? colors.primary : colors["muted-soft"] }}
                />
                <Label className="text-foreground">{inStock ? "IN STOCK" : "OUT OF STOCK"}</Label>
              </Pill>
            </View>

            <View
              className="aspect-square rounded-3xl overflow-hidden items-center justify-center"
              style={{
                backgroundColor: colors["background-elevated"],
                borderWidth: 1,
                borderColor: colors["border-soft"],
              }}
            >
              {product.imageUrl ? (
                <Image
                  source={{ uri: resolveImageUrl(product.imageUrl) ?? undefined }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View className="items-center gap-2">
                  <Ionicons name="image-outline" size={48} color={colors["muted-soft"]} />
                  <Mono className="text-muted text-[10px]" style={{ letterSpacing: 1.2 }}>
                    NO IMAGE
                  </Mono>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Name + price */}
        <Animated.View entering={FadeInUp.duration(420).delay(80)}>
          <View className="px-5 pt-6">
            <Display className="text-foreground text-[28px] leading-8" numberOfLines={3}>
              {product.name}
            </Display>
            <View className="flex-row items-baseline gap-3 mt-3">
              <DisplaySm
                style={{ color: colors.primary, fontSize: 30 }}
              >
                {formatPrice(product.price)}
              </DisplaySm>
              <Mono className="text-muted text-[11px]">per unit</Mono>
            </View>
          </View>
        </Animated.View>

        {/* Supplier link */}
        {providerQ.data ? (
          <Animated.View entering={FadeInUp.duration(420).delay(160)} className="px-5 mt-5">
            <Pressable
              onPress={() => router.push(`/buyer/provider/${providerQ.data?.id}`)}
              className="active:opacity-85"
            >
              <Card raised className="px-3.5 py-3 flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.primary + "16" }}
                >
                  <Ionicons name="storefront" size={16} color={colors.primary} />
                </View>
                <View className="flex-1 min-w-0">
                  <Label>SOLD BY</Label>
                  <BodyBold className="text-foreground mt-0.5" numberOfLines={1}>
                    {providerQ.data.businessName}
                  </BodyBold>
                  {providerQ.data.location ? (
                    <Body className="text-muted text-xs mt-0.5" numberOfLines={1}>
                      {providerQ.data.location}
                    </Body>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors["muted-soft"]} />
              </Card>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Description */}
        {product.description ? (
          <Animated.View entering={FadeInUp.duration(420).delay(220)} className="px-5 mt-3">
            <Card raised className="px-4 py-4">
              <Label className="mb-2">ABOUT</Label>
              <Body className="text-foreground leading-6">{product.description}</Body>
            </Card>
          </Animated.View>
        ) : null}

        {/* Quantity */}
        <Animated.View entering={FadeInUp.duration(420).delay(280)} className="px-5 mt-3">
          <Card raised className="px-4 py-3.5 flex-row items-center justify-between">
            <View>
              <Label>QUANTITY</Label>
              <Body className="text-muted text-xs mt-0.5">Adjust before adding</Body>
            </View>
            <View
              className="flex-row items-center rounded-full overflow-hidden"
              style={{
                backgroundColor: colors["background-elevated"],
                borderWidth: 1.5,
                borderColor: colors["border-soft"],
              }}
            >
              <Pressable
                className="w-10 h-10 items-center justify-center active:opacity-60"
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                hitSlop={4}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={qty <= 1 ? colors["muted-soft"] : colors.foreground}
                />
              </Pressable>
              <View className="w-10 items-center">
                <DisplaySm className="text-foreground text-[18px]">{qty}</DisplaySm>
              </View>
              <Pressable
                className="w-10 h-10 items-center justify-center active:opacity-60"
                onPress={() => setQty((q) => q + 1)}
                hitSlop={4}
              >
                <Ionicons name="add" size={18} color={colors.foreground} />
              </Pressable>
            </View>
          </Card>
        </Animated.View>

        {error ? (
          <Animated.View entering={FadeInDown.duration(300)} className="px-5 mt-3">
            <View
              className="flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5"
              style={{ backgroundColor: colors.error + "14" }}
            >
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Body className="text-sm flex-1" style={{ color: colors.error }}>
                {error}
              </Body>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Sticky add-to-cart bar */}
      <View
        className="absolute left-4 right-4"
        style={{ bottom: 16 }}
      >
        <LinearGradient
          colors={[colors.background + "00", colors.background]}
          locations={[0, 0.4]}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -28,
            left: 0,
            right: 0,
            height: 28,
          }}
        />
        <Card raised className="px-3 py-3 flex-row items-center gap-3">
          <View className="pl-1">
            <Label>TOTAL</Label>
            <DisplaySm className="text-foreground text-[20px]">{formatPrice(lineTotal)}</DisplaySm>
          </View>
          <Pressable
            disabled={!inStock || addToCart.isPending}
            onPress={() => {
              setError(null);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              addToCart.mutate({ productId: product.id, quantity: qty });
            }}
            className="flex-1 active:opacity-90"
            style={{ opacity: !inStock || addToCart.isPending ? 0.4 : 1 }}
          >
            <View
              className="rounded-2xl px-4 py-3.5 flex-row items-center justify-center gap-2"
              style={{ backgroundColor: colors.primary }}
            >
              {addToCart.isPending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons name="cart" size={18} color={colors.background} />
                  <MonoBold
                    className="text-[12px]"
                    style={{ color: colors.background, letterSpacing: 1.2 }}
                  >
                    ADD TO CART
                  </MonoBold>
                </>
              )}
            </View>
          </Pressable>
        </Card>
      </View>
    </ScreenContainer>
  );
}
