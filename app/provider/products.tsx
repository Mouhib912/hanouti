import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { EmptyState } from "@/components/empty-state";
import { ProductImagePicker } from "@/components/product-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";

export default function ProviderProductsScreen() {
  const router = useRouter();
  const colors = useColors();
  const utils = trpc.useUtils();
  const productsQ = trpc.products.listMine.useQuery();
  const categoriesQ = trpc.categories.listMine.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = trpc.products.create.useMutation({
    onSuccess: () => {
      setName("");
      setPrice("");
      setQuantity("0");
      setImageUrl(null);
      setError(null);
      setShowForm(false);
      utils.products.listMine.invalidate();
    },
    onError: (err) => setError(err.message),
  });
  const update = trpc.products.update.useMutation({
    onSuccess: () => utils.products.listMine.invalidate(),
    onError: (err) => setError(err.message),
  });
  const remove = trpc.products.delete.useMutation({
    onSuccess: () => utils.products.listMine.invalidate(),
    onError: (err) => setError(err.message),
  });

  const categories = categoriesQ.data ?? [];
  const products = productsQ.data ?? [];
  const categoryName = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const canCreate =
    name.trim().length > 0 &&
    /^\d+(\.\d{1,2})?$/.test(price.trim()) &&
    /^\d+$/.test(quantity.trim()) &&
    categoryId !== null;

  return (
    <ScreenContainer className="px-5">
      <Stack.Screen options={{ title: "Products", headerShown: true }} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center justify-between py-4">
          <View>
            <Text className="text-foreground text-xl font-bold">Catalog</Text>
            <Text className="text-muted text-sm">
              {products.length} item{products.length === 1 ? "" : "s"} ·{" "}
              {products.filter((p) => p.inStock).length} in stock
            </Text>
          </View>
          <TouchableOpacity
            className={`flex-row items-center gap-1.5 rounded-full px-4 py-2.5 active:opacity-80 ${
              showForm ? "bg-surface border border-border" : "bg-primary"
            }`}
            onPress={() => setShowForm((s) => !s)}
          >
            <Ionicons
              name={showForm ? "close" : "add"}
              size={18}
              color={showForm ? colors.foreground : colors.background}
            />
            <Text className={`${showForm ? "text-foreground" : "text-background"} font-semibold text-sm`}>
              {showForm ? "Close" : "New product"}
            </Text>
          </TouchableOpacity>
        </View>

        {showForm ? (
          categories.length === 0 ? (
            <View className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex-row gap-3 mb-4">
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
              <View className="flex-1">
                <Text className="text-foreground font-semibold">Add a category first</Text>
                <Text className="text-muted text-xs mb-2">
                  Every product needs a category so buyers can filter your catalog.
                </Text>
                <Link href="/provider/categories" className="text-warning font-medium text-sm">
                  Go to Categories →
                </Link>
              </View>
            </View>
          ) : (
            <View className="bg-surface border border-border rounded-2xl p-4 gap-3 mb-5">
              <Text className="text-foreground font-semibold">Add a new product</Text>

              <View>
                <Text className="text-muted text-xs mb-1.5">Category</Text>
                <View className="flex-row flex-wrap gap-2">
                  {categories.map((c) => {
                    const active = categoryId === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        className={`px-3 py-1.5 rounded-full border ${
                          active
                            ? "bg-primary border-primary"
                            : "bg-background border-border"
                        }`}
                        onPress={() => setCategoryId(c.id)}
                      >
                        <Text
                          className={`text-sm ${active ? "text-background font-medium" : "text-foreground"}`}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TextInput
                className="border border-border rounded-xl px-4 py-3 text-foreground bg-background"
                placeholder="Product name"
                placeholderTextColor={colors["muted-soft"]}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <View className="flex-row gap-2">
                <View className="flex-1 flex-row items-center bg-background border border-border rounded-xl px-3">
                  <Text className="text-muted text-sm">$</Text>
                  <TextInput
                    className="flex-1 py-3 pl-1 text-foreground"
                    placeholder="0.00"
                    placeholderTextColor={colors["muted-soft"]}
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View className="flex-1 flex-row items-center bg-background border border-border rounded-xl px-3">
                  <Ionicons name="layers-outline" size={16} color={colors.muted} />
                  <TextInput
                    className="flex-1 py-3 pl-2 text-foreground"
                    placeholder="Qty"
                    placeholderTextColor={colors["muted-soft"]}
                    keyboardType="number-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
              </View>

              <ProductImagePicker value={imageUrl} onChange={setImageUrl} />

              {error ? (
                <View className="flex-row items-center gap-2 bg-error/10 rounded-xl p-3">
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text className="text-error text-sm flex-1">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                className="bg-primary rounded-2xl py-3.5 items-center active:opacity-80 disabled:opacity-50"
                disabled={!canCreate || create.isPending}
                onPress={() =>
                  create.mutate({
                    name: name.trim(),
                    price: price.trim(),
                    quantity: parseInt(quantity.trim(), 10),
                    categoryId: categoryId!,
                    imageUrl: imageUrl ?? undefined,
                  })
                }
              >
                {create.isPending ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text className="text-background font-semibold">Add to catalog</Text>
                )}
              </TouchableOpacity>
            </View>
          )
        ) : null}

        {productsQ.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : products.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="No products yet"
            description="Tap “New product” to add your first item."
          />
        ) : (
          <FlatList
            scrollEnabled={false}
            data={products}
            keyExtractor={(item) => String(item.id)}
            ItemSeparatorComponent={() => <View className="h-2.5" />}
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.springify().damping(18).delay(Math.min(index, 6) * 20)}
                layout={LinearTransition.springify().damping(18)}
                className="bg-surface border border-border rounded-2xl p-3 flex-row items-center gap-3"
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: resolveImageUrl(item.imageUrl) ?? undefined }}
                    style={{ width: 64, height: 64, borderRadius: 12 }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View className="w-16 h-16 rounded-xl bg-background border border-border items-center justify-center">
                    <Ionicons name="image-outline" size={22} color={colors["muted-soft"]} />
                  </View>
                )}

                <View className="flex-1 min-w-0">
                  <Text className="text-foreground font-semibold" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <View className="bg-background border border-border rounded-full px-2 py-0.5">
                      <Text className="text-muted text-[11px]">
                        {categoryName.get(item.categoryId) ?? "—"}
                      </Text>
                    </View>
                    <Text className="text-muted text-xs">·</Text>
                    <Text className="text-foreground font-semibold text-sm">${item.price}</Text>
                    <Text className="text-muted text-xs">·</Text>
                    <Text className="text-muted text-xs">qty {item.quantity ?? 0}</Text>
                  </View>
                  <View className="flex-row items-center gap-2 mt-2">
                    <Switch
                      value={item.inStock}
                      onValueChange={(v) => update.mutate({ id: item.id, inStock: v })}
                      thumbColor={item.inStock ? colors.background : undefined}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                    />
                    <Text className={`text-xs ${item.inStock ? "text-success" : "text-muted"}`}>
                      {item.inStock ? "In stock" : "Out of stock"}
                    </Text>
                  </View>
                </View>

                <View className="gap-1">
                  <TouchableOpacity
                    className="w-9 h-9 rounded-full bg-background items-center justify-center active:opacity-60"
                    onPress={() => router.push(`/provider/product/${item.id}`)}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="w-9 h-9 rounded-full bg-background items-center justify-center active:opacity-60"
                    disabled={remove.isPending}
                    onPress={() =>
                      Alert.alert(
                        "Delete product?",
                        `"${item.name}" will be permanently removed from your catalog.`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => remove.mutate({ id: item.id }),
                          },
                        ],
                      )
                    }
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
