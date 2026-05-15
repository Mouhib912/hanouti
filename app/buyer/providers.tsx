import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";

import { Card, Pill } from "@/components/receipt-card";
import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import { Body, BodyBold, Display, Label, Mono, MonoBold } from "@/components/typography";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/utils";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function BuyerProvidersScreen() {
  const colors = useColors();
  const router = useRouter();
  const providersQ = trpc.providers.list.useQuery();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const trimmedQuery = query.trim();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(trimmedQuery), 250);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  const productSearchQ = trpc.products.search.useQuery(
    { q: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 },
  );

  const filtered = useMemo(() => {
    const data = providersQ.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (p) =>
        (p.businessName ?? "").toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q),
    );
  }, [providersQ.data, query]);

  const productMatches = productSearchQ.data ?? [];
  const hasProductMatches = debouncedQuery.length >= 2 && productMatches.length > 0;

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Soft green wash behind the hero */}
      <LinearGradient
        colors={[colors.primary + "1A", colors.background + "00"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 0.7 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

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
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: colors.primary }}
              />
              <Label className="text-foreground">SUPPLIERS</Label>
            </Pill>
          </View>

          <View className="mt-5 mb-1">
            <Display className="text-foreground text-[36px] leading-[40px]">
              Find your{" "}
              <Display
                className="text-[36px] leading-[40px]"
                style={{ color: colors.primary }}
              >
                suppliers.
              </Display>
            </Display>
          </View>
          <Body className="text-muted text-sm leading-5 mt-2 max-w-[92%]">
            Browse shops nearby, or search a product across all of them.
          </Body>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(360).delay(80)} className="mt-5 mb-2">
          <View
            className="flex-row items-center rounded-2xl px-4"
            style={{
              backgroundColor: colors["background-elevated"],
              borderWidth: 1.5,
              borderColor: query ? colors.primary : colors["border-soft"],
            }}
          >
            <Ionicons name="search" size={18} color={query ? colors.primary : colors.muted} />
            <TextInput
              className="flex-1 py-3.5 pl-3 text-foreground font-body"
              placeholder="Supplier, location, or product…"
              placeholderTextColor={colors["muted-soft"]}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              style={{ color: colors.foreground }}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60">
                <Ionicons name="close-circle" size={18} color={colors["muted-soft"]} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </View>

      {providersQ.isLoading ? (
        <ActivityIndicator color={colors.primary} className="mt-12" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={providersQ.isFetching && !providersQ.isLoading}
              onRefresh={() => providersQ.refetch()}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            hasProductMatches ? (
              <Animated.View entering={FadeInUp.duration(360)} className="mb-5">
                <View className="flex-row items-center gap-2 mb-2.5">
                  <Label>PRODUCT MATCHES</Label>
                  <View className="h-px flex-1 bg-border-soft" />
                  <Mono className="text-muted text-[10px]">
                    {productMatches.length}
                  </Mono>
                </View>
                <View className="gap-2">
                  {productMatches.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push(`/buyer/product/${p.id}`)}
                      className="active:opacity-85"
                    >
                      <Card raised className="px-3 py-2.5 flex-row items-center gap-3">
                        {p.imageUrl ? (
                          <Image
                            source={{ uri: resolveImageUrl(p.imageUrl) ?? undefined }}
                            style={{ width: 44, height: 44, borderRadius: 10 }}
                            contentFit="cover"
                            transition={150}
                          />
                        ) : (
                          <View
                            className="w-11 h-11 rounded-xl items-center justify-center"
                            style={{
                              backgroundColor: colors.surface,
                              borderWidth: 1,
                              borderColor: colors["border-soft"],
                            }}
                          >
                            <Ionicons name="cube-outline" size={18} color={colors["muted-soft"]} />
                          </View>
                        )}
                        <View className="flex-1 min-w-0">
                          <BodyBold className="text-foreground" numberOfLines={1}>
                            {p.name}
                          </BodyBold>
                          <Body className="text-muted text-xs" numberOfLines={1}>
                            {p.providerBusinessName} · {formatPrice(p.price)}
                          </Body>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors["muted-soft"]} />
                      </Card>
                    </Pressable>
                  ))}
                </View>
                <View className="flex-row items-center gap-2 mt-5 mb-1">
                  <Label>SUPPLIERS</Label>
                  <View className="h-px flex-1 bg-border-soft" />
                </View>
              </Animated.View>
            ) : (
              <View className="flex-row items-center gap-2 mb-3">
                <Label>NEARBY · TOP RATED</Label>
                <View className="h-px flex-1 bg-border-soft" />
                <Mono className="text-muted text-[10px]">{filtered.length}</Mono>
              </View>
            )
          }
          ListEmptyComponent={
            <EmptyState
              icon="storefront-outline"
              title={query ? "No matches" : "No suppliers yet"}
              description={
                query
                  ? "Try a different search term."
                  : "Suppliers will appear here as they join the marketplace."
              }
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.springify().damping(18).delay(Math.min(index, 6) * 30)}
              layout={LinearTransition.springify().damping(18)}
            >
              <Link href={`/buyer/provider/${item.id}`} asChild>
                <Pressable className="active:opacity-85">
                  <Card raised className="px-4 py-4 flex-row items-center gap-3.5">
                    <View
                      className="w-14 h-14 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: colors.foreground }}
                    >
                      <MonoBold
                        style={{ color: colors.background, fontSize: 13, letterSpacing: 0.8 }}
                      >
                        {initialsOf(item.businessName ?? "?")}
                      </MonoBold>
                    </View>
                    <View className="flex-1 min-w-0">
                      <BodyBold className="text-foreground text-[15px]" numberOfLines={1}>
                        {item.businessName}
                      </BodyBold>
                      {item.location ? (
                        <View className="flex-row items-center gap-1 mt-1">
                          <Ionicons name="location" size={11} color={colors.muted} />
                          <Body className="text-muted text-xs" numberOfLines={1}>
                            {item.location}
                          </Body>
                        </View>
                      ) : null}
                      <View className="flex-row items-center gap-1 mt-1.5">
                        <Ionicons name="star" size={11} color={colors.primary} />
                        <MonoBold className="text-foreground text-[10px]">
                          {item.rating ?? "—"}
                        </MonoBold>
                        <Body className="text-muted text-[10px] ml-1">rating</Body>
                      </View>
                    </View>
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: colors.primary + "14",
                      }}
                    >
                      <Ionicons name="arrow-forward" size={13} color={colors.primary} />
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
