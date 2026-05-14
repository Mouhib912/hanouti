import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ProductImagePicker } from "@/components/product-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ProviderProductEditScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);

  const utils = trpc.useUtils();
  const productQ = trpc.products.get.useQuery({ id: productId }, { enabled: !!productId });
  const categoriesQ = trpc.categories.listMine.useQuery();
  const update = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.listMine.invalidate();
      utils.products.get.invalidate({ id: productId });
      router.back();
    },
    onError: (err) => setError(err.message),
  });

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [inStock, setInStock] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productQ.data) {
      setName(productQ.data.name);
      setPrice(productQ.data.price);
      setQuantity(String(productQ.data.quantity ?? 0));
      setCategoryId(productQ.data.categoryId);
      setInStock(productQ.data.inStock);
      setImageUrl(productQ.data.imageUrl ?? null);
    }
  }, [productQ.data]);

  if (productQ.isLoading || categoriesQ.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Stack.Screen options={{ title: "Edit product", headerShown: true }} />
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!productQ.data) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Stack.Screen options={{ title: "Edit product", headerShown: true }} />
        <Ionicons name="alert-circle-outline" size={32} color={colors.muted} />
        <Text className="text-muted mt-2">Product not found</Text>
      </ScreenContainer>
    );
  }

  const categories = categoriesQ.data ?? [];
  const canSave =
    name.trim().length > 0 &&
    /^\d+(\.\d{1,2})?$/.test(price.trim()) &&
    /^\d+$/.test(quantity.trim()) &&
    categoryId !== null;

  return (
    <ScreenContainer className="px-5">
      <Stack.Screen options={{ title: "Edit product", headerShown: true }} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 12 }}
      >
        <View className="gap-4">
          <ProductImagePicker value={imageUrl} onChange={setImageUrl} />

          <View>
            <Text className="text-muted text-xs mb-1.5">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((c) => {
                const active = categoryId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    className={`px-3 py-1.5 rounded-full border ${
                      active ? "bg-primary border-primary" : "bg-surface border-border"
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

          <View>
            <Text className="text-muted text-xs mb-1.5">Name</Text>
            <TextInput
              className="border border-border rounded-xl px-4 py-3 text-foreground bg-surface"
              placeholder="Product name"
              placeholderTextColor={colors["muted-soft"]}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-muted text-xs mb-1.5">Price</Text>
              <View className="flex-row items-center bg-surface border border-border rounded-xl px-3">
                <Text className="text-muted">$</Text>
                <TextInput
                  className="flex-1 py-3 pl-1 text-foreground"
                  placeholder="0.00"
                  placeholderTextColor={colors["muted-soft"]}
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-muted text-xs mb-1.5">Quantity</Text>
              <TextInput
                className="border border-border rounded-xl px-4 py-3 text-foreground bg-surface"
                placeholder="0"
                placeholderTextColor={colors["muted-soft"]}
                keyboardType="number-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
          </View>

          <View className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
            <View className="flex-1">
              <Text className="text-foreground font-medium">Available to buyers</Text>
              <Text className="text-muted text-xs">{inStock ? "In stock" : "Out of stock"}</Text>
            </View>
            <Switch
              value={inStock}
              onValueChange={setInStock}
              thumbColor={inStock ? colors.background : undefined}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {error ? (
            <View className="flex-row items-center gap-2 bg-error/10 rounded-xl p-3">
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text className="text-error text-sm flex-1">{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 items-center active:opacity-80 disabled:opacity-50 mt-2"
            disabled={!canSave || update.isPending}
            onPress={() =>
              update.mutate({
                id: productId,
                name: name.trim(),
                price: price.trim(),
                quantity: parseInt(quantity.trim(), 10),
                categoryId: categoryId!,
                inStock,
                imageUrl: imageUrl,
              })
            }
          >
            {update.isPending ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold">Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
