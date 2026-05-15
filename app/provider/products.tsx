import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";

import { Card, Pill } from "@/components/receipt-card";
import { EmptyState } from "@/components/empty-state";
import { ProductImagePicker } from "@/components/product-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import {
  Body,
  BodyBold,
  Display,
  DisplaySm,
  Label,
  Mono,
  MonoBold,
} from "@/components/typography";
import { useColors } from "@/hooks/use-colors";
import { resolveImageUrl } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/utils";

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

  const inStockCount = products.filter((p) => p.inStock).length;

  const canCreate =
    name.trim().length > 0 &&
    /^\d+(\.\d{1,2})?$/.test(price.trim()) &&
    /^\d+$/.test(quantity.trim()) &&
    categoryId !== null;

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

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20, paddingTop: 8 }}
      >
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
              <Ionicons name="cube" size={11} color={colors.primary} />
              <Label className="text-foreground">CATALOG</Label>
            </Pill>
          </View>

          <View className="mt-5 mb-1">
            <Display className="text-foreground text-[36px] leading-[40px]">
              Your{" "}
              <Display
                className="text-[36px] leading-[40px]"
                style={{ color: colors.primary }}
              >
                catalog.
              </Display>
            </Display>
            <Body className="text-muted text-sm leading-5 mt-2">
              <BodyBold style={{ color: colors.primary }}>{inStockCount} in stock</BodyBold>
              {" · "}
              {products.length} item{products.length === 1 ? "" : "s"} total
            </Body>
          </View>
        </Animated.View>

        {/* New product toggle */}
        <Animated.View entering={FadeInUp.duration(420).delay(60)} className="mt-5">
          <Pressable
            onPress={() => setShowForm((s) => !s)}
            className="active:opacity-90"
          >
            <Card raised className="px-4 py-3 flex-row items-center gap-3">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: showForm ? colors.surface : colors.primary,
                }}
              >
                <Ionicons
                  name={showForm ? "close" : "add"}
                  size={20}
                  color={showForm ? colors.foreground : colors.background}
                />
              </View>
              <View className="flex-1">
                <BodyBold className="text-foreground">
                  {showForm ? "Close form" : "Add a product"}
                </BodyBold>
                <Body className="text-muted text-xs mt-0.5">
                  {showForm
                    ? "Discards anything unsaved"
                    : "Name, price, photo, category"}
                </Body>
              </View>
              <Ionicons
                name={showForm ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors["muted-soft"]}
              />
            </Card>
          </Pressable>
        </Animated.View>

        {/* Inline form */}
        {showForm ? (
          categories.length === 0 ? (
            <Animated.View entering={FadeInUp.duration(360)} className="mt-3">
              <Card
                raised
                className="px-4 py-3.5 flex-row gap-3 items-start"
                style={{ borderColor: colors.primary + "40", borderWidth: 1.5 }}
              >
                <View
                  className="w-9 h-9 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.primary + "16" }}
                >
                  <Ionicons name="alert-circle" size={16} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <BodyBold className="text-foreground">Add a category first</BodyBold>
                  <Body className="text-muted text-xs leading-4 mt-1">
                    Every product needs a category so buyers can filter your catalog.
                  </Body>
                  <Link href="/provider/categories" asChild>
                    <Pressable className="active:opacity-60 mt-2 self-start">
                      <MonoBold
                        className="text-[11px]"
                        style={{ color: colors.primary, letterSpacing: 1.2 }}
                      >
                        GO TO CATEGORIES →
                      </MonoBold>
                    </Pressable>
                  </Link>
                </View>
              </Card>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.duration(360)} className="mt-3">
              <Card raised className="px-4 py-4 gap-4">
                <View>
                  <Label className="mb-2">CATEGORY</Label>
                  <View className="flex-row flex-wrap gap-2">
                    {categories.map((c) => {
                      const active = categoryId === c.id;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setCategoryId(c.id)}
                          className="active:opacity-80"
                        >
                          <View
                            className="px-3 py-1.5 rounded-full"
                            style={{
                              backgroundColor: active
                                ? colors.foreground
                                : colors["background-elevated"],
                              borderWidth: 1.5,
                              borderColor: active
                                ? colors.foreground
                                : colors["border-soft"],
                            }}
                          >
                            <BodyBold
                              className="text-[12px]"
                              style={{
                                color: active ? colors.background : colors.foreground,
                              }}
                            >
                              {c.name}
                            </BodyBold>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <FormText
                  icon="cube-outline"
                  label="NAME"
                  placeholder="e.g. Couscous fin Warda 1 kg"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <FormText
                      icon="cash-outline"
                      label="PRICE (DT)"
                      placeholder="0,00"
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View className="flex-1">
                    <FormText
                      icon="layers-outline"
                      label="QUANTITY"
                      placeholder="0"
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View>
                  <Label className="mb-2">PRODUCT PHOTO</Label>
                  <ProductImagePicker value={imageUrl} onChange={setImageUrl} />
                </View>

                {error ? (
                  <View
                    className="flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5"
                    style={{ backgroundColor: colors.error + "14" }}
                  >
                    <Ionicons name="alert-circle" size={16} color={colors.error} />
                    <Body className="text-sm flex-1" style={{ color: colors.error }}>
                      {error}
                    </Body>
                  </View>
                ) : null}

                <Pressable
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
                  className="active:opacity-90"
                  style={{ opacity: !canCreate || create.isPending ? 0.5 : 1 }}
                >
                  <View
                    className="rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {create.isPending ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <>
                        <Ionicons name="add" size={18} color={colors.background} />
                        <MonoBold
                          className="text-[12px]"
                          style={{ color: colors.background, letterSpacing: 1.2 }}
                        >
                          ADD TO CATALOG
                        </MonoBold>
                      </>
                    )}
                  </View>
                </Pressable>
              </Card>
            </Animated.View>
          )
        ) : null}

        {/* Products list */}
        <View className="mt-6">
          {productsQ.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : products.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="No products yet"
              description="Tap “Add a product” to put your first item on the shelf."
            />
          ) : (
            <>
              <View className="flex-row items-center gap-2 mb-3">
                <Label>ITEMS · {products.length}</Label>
                <View className="h-px flex-1 bg-border-soft" />
              </View>
              <FlatList
                scrollEnabled={false}
                data={products}
                keyExtractor={(item) => String(item.id)}
                ItemSeparatorComponent={() => <View className="h-2.5" />}
                renderItem={({ item, index }) => (
                  <Animated.View
                    entering={FadeInDown.springify().damping(18).delay(Math.min(index, 6) * 25)}
                    layout={LinearTransition.springify().damping(18)}
                  >
                    <Card raised className="px-3 py-3 flex-row items-center gap-3">
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: resolveImageUrl(item.imageUrl) ?? undefined }}
                          style={{ width: 68, height: 68, borderRadius: 14 }}
                          contentFit="cover"
                          transition={150}
                        />
                      ) : (
                        <View
                          className="w-[68px] h-[68px] rounded-2xl items-center justify-center"
                          style={{
                            backgroundColor: colors["background-elevated"],
                            borderWidth: 1,
                            borderColor: colors["border-soft"],
                          }}
                        >
                          <Ionicons name="image-outline" size={22} color={colors["muted-soft"]} />
                        </View>
                      )}

                      <View className="flex-1 min-w-0">
                        <BodyBold className="text-foreground text-[14px]" numberOfLines={1}>
                          {item.name}
                        </BodyBold>
                        <View className="flex-row items-center gap-1.5 mt-1">
                          <DisplaySm className="text-foreground text-[16px]">
                            {formatPrice(item.price)}
                          </DisplaySm>
                          <Mono className="text-muted text-[10px]">
                            · qty {item.quantity ?? 0}
                          </Mono>
                        </View>
                        <View className="flex-row items-center gap-2 mt-1.5">
                          <Pill
                            intent="ghost"
                            className="py-0 px-2"
                          >
                            <Mono
                              className="text-[10px]"
                              style={{ color: colors.muted, letterSpacing: 0.8 }}
                            >
                              {categoryName.get(item.categoryId)?.toUpperCase() ?? "—"}
                            </Mono>
                          </Pill>
                          <View className="flex-row items-center gap-1">
                            <Switch
                              value={item.inStock}
                              onValueChange={(v) =>
                                update.mutate({ id: item.id, inStock: v })
                              }
                              thumbColor={item.inStock ? colors.background : colors["muted-soft"]}
                              trackColor={{
                                false: colors["border-soft"],
                                true: colors.primary,
                              }}
                              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                            <Mono
                              className="text-[10px]"
                              style={{
                                color: item.inStock ? colors.primary : colors["muted-soft"],
                                letterSpacing: 0.8,
                              }}
                            >
                              {item.inStock ? "IN STOCK" : "HIDDEN"}
                            </Mono>
                          </View>
                        </View>
                      </View>

                      <View className="gap-1.5">
                        <Pressable
                          className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
                          style={{ backgroundColor: colors.primary + "14" }}
                          onPress={() => router.push(`/provider/product/${item.id}`)}
                        >
                          <Ionicons name="create" size={14} color={colors.primary} />
                        </Pressable>
                        <Pressable
                          className="w-9 h-9 rounded-full items-center justify-center active:opacity-70"
                          style={{ backgroundColor: colors.error + "10" }}
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
                          <Ionicons name="trash" size={14} color={colors.error} />
                        </Pressable>
                      </View>
                    </Card>
                  </Animated.View>
                )}
              />
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function FormText({
  icon,
  label,
  ...rest
}: React.ComponentProps<typeof TextInput> & {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Label className="mb-2">{label}</Label>
      <View
        className="flex-row items-center rounded-2xl px-3.5"
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
    </View>
  );
}
