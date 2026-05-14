import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";

import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";

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
        <Stack.Screen options={{ title: "Catalog", headerShown: true }} />
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!providerQ.data) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Stack.Screen options={{ title: "Catalog", headerShown: true }} />
        <Ionicons name="storefront-outline" size={32} color={colors.muted} />
        <Text className="text-muted mt-2 text-center">
          {providerQ.error?.message ?? "Supplier not found."}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/buyer/providers")}
          className="bg-primary rounded-2xl px-5 py-2.5 mt-4 active:opacity-80"
        >
          <Text className="text-background font-semibold">Browse suppliers</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          title: providerQ.data?.businessName ?? "Catalog",
          headerShown: true,
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-5 pt-3 pb-4">
          <Text className="text-foreground text-2xl font-bold" numberOfLines={1}>
            {providerQ.data?.businessName}
          </Text>
          <View className="flex-row items-center gap-3 mt-1">
            {providerQ.data?.location ? (
              <View className="flex-row items-center gap-1">
                <Ionicons name="location-outline" size={13} color={colors.muted} />
                <Text className="text-muted text-sm">{providerQ.data.location}</Text>
              </View>
            ) : null}
            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={13} color={colors.warning} />
              <Text className="text-muted text-sm">{providerQ.data?.rating ?? "—"}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="cube-outline" size={13} color={colors.muted} />
              <Text className="text-muted text-sm">
                {products.length} item{products.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>
        </View>

        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}
          >
            <CategoryPill
              label="All"
              active={activeCategoryId === null}
              onPress={() => setActiveCategoryId(null)}
            />
            {categories.map((c) => (
              <CategoryPill
                key={c.id}
                label={c.name}
                active={activeCategoryId === c.id}
                onPress={() => setActiveCategoryId(c.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        {error ? (
          <View className="mx-5 mt-2 flex-row items-center gap-2 bg-error/10 rounded-xl p-3">
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text className="text-error text-sm flex-1">{error}</Text>
          </View>
        ) : null}

        <View className="px-5 pt-2 gap-2.5">
          {visibleProducts.length === 0 ? (
            <EmptyState
              icon="basket-outline"
              title="No products in this category"
              description="Try a different category or come back later."
            />
          ) : (
            visibleProducts.map((p, idx) => {
              const adding = pendingProductId === p.id && addToCart.isPending;
              return (
                <Animated.View
                  key={p.id}
                  entering={FadeInDown.springify().damping(18).delay(Math.min(idx, 6) * 20)}
                  exiting={FadeOut.duration(150)}
                  layout={LinearTransition.springify().damping(18)}
                >
                  <TouchableOpacity
                    onPress={() => router.push(`/buyer/product/${p.id}`)}
                    activeOpacity={0.8}
                    className={`bg-surface border border-border rounded-2xl p-3 flex-row items-center gap-3 ${
                      !p.inStock ? "opacity-60" : ""
                    }`}
                  >
                  {p.imageUrl ? (
                    <Image
                      source={{ uri: resolveImageUrl(p.imageUrl) ?? undefined }}
                      style={{ width: 72, height: 72, borderRadius: 14 }}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View className="w-[72px] h-[72px] rounded-2xl bg-background border border-border items-center justify-center">
                      <Ionicons name="image-outline" size={24} color={colors["muted-soft"]} />
                    </View>
                  )}
                  <View className="flex-1 min-w-0">
                    <Text className="text-foreground font-semibold" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text className="text-foreground text-lg font-bold mt-0.5">${p.price}</Text>
                    {!p.inStock ? (
                      <View className="flex-row items-center gap-1 mt-1">
                        <View className="w-1.5 h-1.5 rounded-full bg-error" />
                        <Text className="text-error text-xs">Out of stock</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-1 mt-1">
                        <View className="w-1.5 h-1.5 rounded-full bg-success" />
                        <Text className="text-success text-xs">In stock</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    className="w-11 h-11 rounded-full bg-primary items-center justify-center active:opacity-80 disabled:opacity-40"
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
                  </TouchableOpacity>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>

      {cartCount > 0 ? (
        <View className="absolute left-5 right-5 bottom-5">
          <TouchableOpacity
            onPress={() => router.push("/buyer/cart")}
            className="bg-foreground rounded-2xl px-5 py-3.5 flex-row items-center gap-3 active:opacity-90 shadow-lg"
          >
            <View className="w-9 h-9 rounded-full bg-background/15 items-center justify-center">
              <Ionicons name="cart" size={18} color={colors.background} />
            </View>
            <View className="flex-1">
              <Text className="text-background font-semibold">View cart</Text>
              <Text className="text-background/70 text-xs">
                {cartCount} item{cartCount === 1 ? "" : "s"} waiting
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function CategoryPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`px-3.5 py-1.5 rounded-full border ${
        active ? "bg-foreground border-foreground" : "bg-surface border-border"
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-sm ${active ? "text-background font-semibold" : "text-foreground"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
