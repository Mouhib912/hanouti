import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { Card, Pill } from "@/components/receipt-card";
import { ProductImagePicker } from "@/components/product-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import {
  Body,
  BodyBold,
  Display,
  Label,
  MonoBold,
} from "@/components/typography";
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
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!productQ.data) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={32} color={colors.muted} />
        <Body className="text-muted mt-2">Product not found</Body>
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
    <ScreenContainer>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={[colors.primary + "1A", colors.background + "00"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 0.7 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 280 }}
        pointerEvents="none"
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20, paddingTop: 8 }}
      >
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
              <Ionicons name="create" size={11} color={colors.primary} />
              <Label className="text-foreground">EDIT</Label>
            </Pill>
          </View>

          <View className="mt-5 mb-5">
            <Display className="text-foreground text-[30px] leading-[34px]" numberOfLines={2}>
              {productQ.data.name}
            </Display>
            <Body className="text-muted text-sm leading-5 mt-2">
              Update price, stock, photo, or move it to a different category.
            </Body>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(420).delay(60)} className="gap-4">
          <Card raised className="px-4 py-4">
            <Label className="mb-2">PRODUCT PHOTO</Label>
            <ProductImagePicker value={imageUrl} onChange={setImageUrl} />
          </Card>

          <Card raised className="px-4 py-4">
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
                        borderColor: active ? colors.foreground : colors["border-soft"],
                      }}
                    >
                      <BodyBold
                        className="text-[12px]"
                        style={{ color: active ? colors.background : colors.foreground }}
                      >
                        {c.name}
                      </BodyBold>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <FormText
            icon="cube-outline"
            label="NAME"
            placeholder="Product name"
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

          <Card raised className="px-4 py-3.5 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Label>VISIBILITY</Label>
              <BodyBold className="text-foreground text-[14px] mt-1">
                {inStock ? "Available to buyers" : "Hidden from buyers"}
              </BodyBold>
              <Body className="text-muted text-xs mt-0.5">
                Toggle this when the item runs out so customers see accurate availability.
              </Body>
            </View>
            <Switch
              value={inStock}
              onValueChange={setInStock}
              thumbColor={inStock ? colors.background : colors["muted-soft"]}
              trackColor={{ false: colors["border-soft"], true: colors.primary }}
            />
          </Card>

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
            disabled={!canSave || update.isPending}
            onPress={() =>
              update.mutate({
                id: productId,
                name: name.trim(),
                price: price.trim(),
                quantity: parseInt(quantity.trim(), 10),
                categoryId: categoryId!,
                inStock,
                imageUrl,
              })
            }
            className="active:opacity-90 mt-2"
            style={{ opacity: !canSave || update.isPending ? 0.5 : 1 }}
          >
            <View
              className="rounded-2xl py-4 items-center flex-row justify-center gap-2"
              style={{ backgroundColor: colors.primary }}
            >
              {update.isPending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={colors.background} />
                  <MonoBold
                    className="text-[12px]"
                    style={{ color: colors.background, letterSpacing: 1.2 }}
                  >
                    SAVE CHANGES
                  </MonoBold>
                </>
              )}
            </View>
          </Pressable>
        </Animated.View>
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
