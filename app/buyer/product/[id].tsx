import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";

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
      router.push("/buyer/cart");
    },
    onError: (err) => setError(err.message),
  });

  if (productQ.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ title: "Product", headerShown: true }} />
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  const product = productQ.data;
  if (!product) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Stack.Screen options={{ title: "Product", headerShown: true }} />
        <Ionicons name="alert-circle-outline" size={32} color={colors.muted} />
        <Text className="text-muted mt-2">Product not found.</Text>
      </ScreenContainer>
    );
  }

  const unitPrice = Number(product.price);
  const lineTotal = unitPrice * qty;

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: product.name, headerShown: true }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-5 pt-4">
          <View className="aspect-square bg-surface border border-border rounded-3xl overflow-hidden items-center justify-center">
            {product.imageUrl ? (
              <Image
                source={{ uri: resolveImageUrl(product.imageUrl) ?? undefined }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Ionicons name="image-outline" size={64} color={colors["muted-soft"]} />
            )}
          </View>
        </View>

        <View className="px-5 pt-5 gap-2">
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="text-foreground text-2xl font-bold">{product.name}</Text>
              <Text className="text-primary text-2xl font-bold mt-1">${product.price}</Text>
            </View>
            <View
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
                product.inStock ? "bg-success/15" : "bg-error/15"
              }`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${
                  product.inStock ? "bg-success" : "bg-error"
                }`}
              />
              <Text
                className={`text-xs font-medium ${
                  product.inStock ? "text-success" : "text-error"
                }`}
              >
                {product.inStock ? "In stock" : "Out of stock"}
              </Text>
            </View>
          </View>

          {providerQ.data ? (
            <TouchableOpacity
              onPress={() => router.push(`/buyer/provider/${providerQ.data?.id}`)}
              className="flex-row items-center gap-2 bg-surface border border-border rounded-2xl px-3.5 py-3 active:opacity-80"
            >
              <View className="w-8 h-8 rounded-full bg-primary/15 items-center justify-center">
                <Ionicons name="storefront-outline" size={16} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-medium" numberOfLines={1}>
                  {providerQ.data.businessName}
                </Text>
                {providerQ.data.location ? (
                  <Text className="text-muted text-xs" numberOfLines={1}>
                    {providerQ.data.location}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors["muted-soft"]} />
            </TouchableOpacity>
          ) : null}

          {product.description ? (
            <View className="bg-surface border border-border rounded-2xl p-4 mt-1">
              <Text className="text-muted text-xs uppercase tracking-wider mb-1.5">About</Text>
              <Text className="text-foreground leading-relaxed">{product.description}</Text>
            </View>
          ) : null}

          <View className="bg-surface border border-border rounded-2xl p-4 mt-1 flex-row items-center justify-between">
            <Text className="text-foreground font-medium">Quantity</Text>
            <View className="flex-row items-center bg-background border border-border rounded-full">
              <TouchableOpacity
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
              </TouchableOpacity>
              <Text className="w-10 text-center text-foreground font-bold text-base">{qty}</Text>
              <TouchableOpacity
                className="w-10 h-10 items-center justify-center active:opacity-60"
                onPress={() => setQty((q) => q + 1)}
                hitSlop={4}
              >
                <Ionicons name="add" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View className="flex-row items-center gap-2 bg-error/10 rounded-xl p-3 mt-1">
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text className="text-error text-sm flex-1">{error}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="absolute left-5 right-5 bottom-5 bg-background-elevated border border-border rounded-3xl px-4 py-3 flex-row items-center gap-3">
        <View>
          <Text className="text-muted text-[11px] uppercase tracking-wider">Total</Text>
          <Text className="text-foreground text-xl font-bold">${lineTotal.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          className="flex-1 bg-primary rounded-2xl py-3.5 items-center flex-row justify-center gap-2 active:opacity-80 disabled:opacity-40"
          disabled={!product.inStock || addToCart.isPending}
          onPress={() => {
            setError(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            addToCart.mutate({ productId: product.id, quantity: qty });
          }}
        >
          {addToCart.isPending ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Ionicons name="cart-outline" size={18} color={colors.background} />
              <Text className="text-background font-semibold">Add to cart</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
