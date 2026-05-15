import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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

export default function ProviderCatalogScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const providerId = Number(id);

  const providerQ = trpc.providers.get.useQuery({ id: providerId }, { enabled: !!providerId });
  const productsQ = trpc.products.byProvider.useQuery({ providerId }, { enabled: !!providerId });
  const categoriesQ = trpc.categories.listByProvider.useQuery(
    { providerId },
    { enabled: !!providerId },
  );
  const cartQ = trpc.cart.list.useQuery();

  const utils = trpc.useUtils();
  const addToCart = trpc.cart.add.useMutation({
    onSuccess: () => {
      utils.cart.detailed.invalidate();
      utils.cart.list.invalidate();
    },
  });

  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);

  const categories = categoriesQ.data ?? [];
  const products = productsQ.data ?? [];
  const cartCount = (cartQ.data ?? []).reduce((sum, c) => sum + c.quantity, 0);

  const visibleProducts = useMemo(
    () =>
      activeCategoryId == null
        ? products
        : products.filter((p) => p.categoryId === activeCategoryId),
    [products, activeCategoryId],
  );

  if (providerQ.isLoading || categoriesQ.isLoading || productsQ.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!providerQ.data) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon="storefront-outline"
          title="Supplier not found"
          description={providerQ.error?.message ?? "This supplier may no longer be available."}
          action={
            <Pressable
              onPress={() => router.replace("/buyer/providers")}
              className="active:opacity-85"
            >
              <Card intent="primary" raised className="px-5 py-2.5">
                <BodyBold style={{ color: colors.background }}>Browse suppliers</BodyBold>
              </Card>
            </Pressable>
          }
        />
      </ScreenContainer>
    );
  }

  const initials = (providerQ.data.businessName ?? "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={[colors.primary + "1F", colors.background + "00"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 0.7 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 340 }}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={{ paddingBottom: cartCount > 0 ? 110 : 32 }}>
        {/* Header */}
        <View className="px-5 pt-3">
          <Animated.View entering={FadeInDown.duration(360)}>
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full items-center justify-center bg-surface active:opacity-70"
                hitSlop={6}
              >
                <Ionicons name="arrow-back" size={18} color={colors.foreground} />
              </Pressable>
              <Pill intent="ghost">
                <Ionicons name="storefront" size={11} color={colors.primary} />
                <Label className="text-foreground">SUPPLIER</Label>
              </Pill>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(420).delay(60)}
            className="mt-5 flex-row items-center gap-3.5"
          >
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center"
              style={{ backgroundColor: colors.foreground }}
            >
              <MonoBold
                style={{ color: colors.background, fontSize: 16, letterSpacing: 1 }}
              >
                {initials}
              </MonoBold>
            </View>
            <View className="flex-1">
              <Display
                className="text-foreground text-[26px] leading-7"
                numberOfLines={2}
              >
                {providerQ.data.businessName}
              </Display>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(360).delay(140)}
            className="flex-row flex-wrap items-center gap-x-4 gap-y-1.5 mt-3"
          >
            {providerQ.data.location ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="location" size={12} color={colors.muted} />
                <Body className="text-muted text-xs">{providerQ.data.location}</Body>
              </View>
            ) : null}
            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={12} color={colors.primary} />
              <MonoBold className="text-foreground text-[11px]">
                {providerQ.data.rating ?? "—"}
              </MonoBold>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="cube" size={12} color={colors.muted} />
              <Body className="text-muted text-xs">
                {products.length} item{products.length === 1 ? "" : "s"}
              </Body>
            </View>
          </Animated.View>
        </View>

        {/* Category pills */}
        {categories.length > 0 ? (
          <Animated.View entering={FadeInUp.duration(360).delay(220)} className="mt-5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 4 }}
            >
              <CategoryPill
                label="All"
                count={products.length}
                active={activeCategoryId === null}
                onPress={() => setActiveCategoryId(null)}
              />
              {categories.map((c) => (
                <CategoryPill
                  key={c.id}
                  label={c.name}
                  count={products.filter((p) => p.categoryId === c.id).length}
                  active={activeCategoryId === c.id}
                  onPress={() => setActiveCategoryId(c.id)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {error ? (
          <View className="mx-5 mt-3">
            <View
              className="flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5"
              style={{ backgroundColor: colors.error + "14" }}
            >
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Body className="text-sm flex-1" style={{ color: colors.error }}>
                {error}
              </Body>
            </View>
          </View>
        ) : null}

        {/* Product list */}
        <View className="px-5 pt-5 gap-3">
          {visibleProducts.length === 0 ? (
            <EmptyState
              icon="basket-outline"
              title="Nothing in this category"
              description="Try a different category, or come back later."
            />
          ) : (
            visibleProducts.map((p, idx) => {
              const adding = pendingProductId === p.id && addToCart.isPending;
              return (
                <Animated.View
                  key={p.id}
                  entering={FadeInDown.springify().damping(18).delay(Math.min(idx, 6) * 25)}
                  exiting={FadeOut.duration(150)}
                  layout={LinearTransition.springify().damping(18)}
                >
                  <Pressable
                    onPress={() => router.push(`/buyer/product/${p.id}`)}
                    className="active:opacity-90"
                    style={{ opacity: p.inStock ? 1 : 0.6 }}
                  >
                    <Card raised className="px-3 py-3 flex-row items-center gap-3">
                      {p.imageUrl ? (
                        <Image
                          source={{ uri: resolveImageUrl(p.imageUrl) ?? undefined }}
                          style={{ width: 76, height: 76, borderRadius: 14 }}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View
                          className="w-[76px] h-[76px] rounded-2xl items-center justify-center"
                          style={{
                            backgroundColor: colors["background-elevated"],
                            borderWidth: 1,
                            borderColor: colors["border-soft"],
                          }}
                        >
                          <Ionicons name="image-outline" size={24} color={colors["muted-soft"]} />
                        </View>
                      )}
                      <View className="flex-1 min-w-0">
                        <BodyBold className="text-foreground" numberOfLines={2}>
                          {p.name}
                        </BodyBold>
                        <DisplaySm
                          className="mt-1"
                          style={{ color: colors.primary, fontSize: 18 }}
                        >
                          {formatPrice(p.price)}
                        </DisplaySm>
                        <View className="flex-row items-center gap-1 mt-1.5">
                          <View
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: p.inStock ? colors.primary : colors["muted-soft"],
                            }}
                          />
                          <Mono
                            className="text-[10px]"
                            style={{
                              color: p.inStock ? colors.primary : colors["muted-soft"],
                              letterSpacing: 0.8,
                            }}
                          >
                            {p.inStock ? "IN STOCK" : "OUT OF STOCK"}
                          </Mono>
                        </View>
                      </View>
                      <Pressable
                        className="w-12 h-12 rounded-2xl items-center justify-center active:opacity-80"
                        style={{
                          backgroundColor: colors.primary,
                          opacity: !p.inStock || addToCart.isPending ? 0.4 : 1,
                        }}
                        disabled={!p.inStock || addToCart.isPending}
                        onPress={(e) => {
                          e.stopPropagation();
                          setError(null);
                          setPendingProductId(p.id);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          addToCart.mutate(
                            { productId: p.id, quantity: 1 },
                            { onError: (err) => setError(err.message) },
                          );
                        }}
                      >
                        {adding ? (
                          <ActivityIndicator color={colors.background} size="small" />
                        ) : (
                          <Ionicons name="add" size={22} color={colors.background} />
                        )}
                      </Pressable>
                    </Card>
                  </Pressable>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Sticky "View cart" CTA */}
      {cartCount > 0 ? (
        <Animated.View
          entering={FadeInUp.duration(360)}
          className="absolute left-5 right-5"
          style={{ bottom: 20 }}
        >
          <Pressable
            onPress={() => router.push("/buyer/cart")}
            className="active:opacity-90"
          >
            <Card intent="primary" raised className="px-4 py-3.5 flex-row items-center gap-3">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
              >
                <Ionicons name="cart" size={18} color={colors.background} />
              </View>
              <View className="flex-1">
                <DisplaySm style={{ color: colors.background, fontSize: 16 }}>
                  View cart
                </DisplaySm>
                <Mono
                  className="text-[10px] mt-0.5"
                  style={{ color: colors.background, opacity: 0.85 }}
                >
                  {cartCount} ITEM{cartCount === 1 ? "" : "S"} WAITING
                </Mono>
              </View>
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.background }}
              >
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </View>
            </Card>
          </Pressable>
        </Animated.View>
      ) : null}
    </ScreenContainer>
  );
}

function CategoryPill({
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
          {label}
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
}
