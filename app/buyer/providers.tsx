import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarTint(seed: number) {
  const tints = [
    { bg: "bg-primary/15", text: "text-primary" },
    { bg: "bg-accent/15", text: "text-accent" },
    { bg: "bg-warning/15", text: "text-warning" },
    { bg: "bg-success/15", text: "text-success" },
  ];
  return tints[seed % tints.length];
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

  return (
    <ScreenContainer className="px-5">
      <Stack.Screen options={{ title: "Suppliers", headerShown: true }} />

      <View className="pt-4 pb-3">
        <View className="bg-surface border border-border rounded-2xl flex-row items-center px-4">
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            className="flex-1 py-3 pl-2 text-foreground"
            placeholder="Search by name or location"
            placeholderTextColor={colors["muted-soft"]}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors["muted-soft"]} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {providersQ.isLoading ? (
        <ActivityIndicator color={colors.primary} className="mt-12" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={providersQ.isFetching && !providersQ.isLoading}
              onRefresh={() => providersQ.refetch()}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            debouncedQuery.length >= 2 && (productSearchQ.data?.length ?? 0) > 0 ? (
              <View className="mb-3">
                <Text className="text-muted text-[11px] uppercase tracking-wider mb-2">
                  Matching products
                </Text>
                <View className="gap-2">
                  {(productSearchQ.data ?? []).map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => router.push(`/buyer/product/${p.id}`)}
                      className="bg-surface border border-border rounded-2xl p-3 flex-row items-center gap-3 active:opacity-80"
                    >
                      {p.imageUrl ? (
                        <Image
                          source={{ uri: resolveImageUrl(p.imageUrl) ?? undefined }}
                          style={{ width: 44, height: 44, borderRadius: 10 }}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View className="w-11 h-11 rounded-xl bg-background border border-border items-center justify-center">
                          <Ionicons name="cube-outline" size={18} color={colors["muted-soft"]} />
                        </View>
                      )}
                      <View className="flex-1 min-w-0">
                        <Text className="text-foreground font-medium" numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text className="text-muted text-xs" numberOfLines={1}>
                          {p.providerBusinessName} · ${p.price}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors["muted-soft"]} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-muted text-[11px] uppercase tracking-wider mt-4 mb-1">
                  Suppliers
                </Text>
              </View>
            ) : null
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
          renderItem={({ item, index }) => {
            const tint = avatarTint(item.id);
            return (
              <Animated.View
                entering={FadeInDown.springify().damping(18).delay(Math.min(index, 6) * 25)}
                layout={LinearTransition.springify().damping(18)}
              >
                <Link href={`/buyer/provider/${item.id}`} asChild>
                  <TouchableOpacity className="bg-surface border border-border rounded-2xl p-4 active:opacity-80 flex-row items-center gap-3">
                  <View className={`w-12 h-12 rounded-2xl items-center justify-center ${tint.bg}`}>
                    <Text className={`font-bold ${tint.text}`}>
                      {initialsOf(item.businessName ?? "?")}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-foreground font-semibold" numberOfLines={1}>
                      {item.businessName}
                    </Text>
                    {item.location ? (
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Ionicons name="location-outline" size={12} color={colors.muted} />
                        <Text className="text-muted text-xs" numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    ) : null}
                    <View className="flex-row items-center gap-1 mt-1.5">
                      <Ionicons name="star" size={12} color={colors.warning} />
                      <Text className="text-foreground text-xs font-medium">
                        {item.rating ?? "—"}
                      </Text>
                    </View>
                  </View>
                    <Ionicons name="chevron-forward" size={18} color={colors["muted-soft"]} />
                  </TouchableOpacity>
                </Link>
              </Animated.View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
