import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";

import { Card, Pill } from "@/components/receipt-card";
import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import {
  Body,
  BodyBold,
  Display,
  Label,
  Mono,
  MonoBold,
} from "@/components/typography";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ProviderCategoriesScreen() {
  const router = useRouter();
  const colors = useColors();
  const utils = trpc.useUtils();
  const list = trpc.categories.listMine.useQuery();
  const create = trpc.categories.create.useMutation({
    onSuccess: () => {
      setName("");
      setError(null);
      utils.categories.listMine.invalidate();
    },
    onError: (err) => setError(err.message),
  });
  const remove = trpc.categories.delete.useMutation({
    onSuccess: () => utils.categories.listMine.invalidate(),
    onError: (err) => setError(err.message),
  });

  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = list.data ?? [];

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

      <View className="px-5 pt-3">
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
              <Ionicons name="pricetags" size={11} color={colors.primary} />
              <Label className="text-foreground">CATEGORIES</Label>
            </Pill>
          </View>

          <View className="mt-5 mb-1">
            <Display className="text-foreground text-[36px] leading-[40px]">
              Organise{" "}
              <Display
                className="text-[36px] leading-[40px]"
                style={{ color: colors.primary }}
              >
                your shelf.
              </Display>
            </Display>
            <Body className="text-muted text-sm leading-5 mt-2 max-w-[92%]">
              Categories group your products so buyers can filter your catalog.
            </Body>
          </View>
        </Animated.View>

        {/* Add category form */}
        <Animated.View entering={FadeInUp.duration(420).delay(80)} className="mt-6 mb-5">
          <View className="flex-row gap-2 items-stretch">
            <View
              className="flex-1 flex-row items-center rounded-2xl px-3.5"
              style={{
                backgroundColor: colors["background-elevated"],
                borderWidth: 1.5,
                borderColor: focused ? colors.primary : colors["border-soft"],
              }}
            >
              <Ionicons
                name="add"
                size={18}
                color={focused ? colors.primary : colors.muted}
              />
              <TextInput
                className="flex-1 py-3.5 pl-2 font-body"
                style={{ color: colors.foreground }}
                placeholder="New category (e.g. Pâtes & couscous)"
                placeholderTextColor={colors["muted-soft"]}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>
            <Pressable
              disabled={!name.trim() || create.isPending}
              onPress={() => create.mutate({ name: name.trim() })}
              className="active:opacity-90"
              style={{ opacity: !name.trim() || create.isPending ? 0.5 : 1 }}
            >
              <View
                className="rounded-2xl px-5 justify-center"
                style={{ backgroundColor: colors.primary, height: "100%" }}
              >
                {create.isPending ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <MonoBold
                    className="text-[12px]"
                    style={{ color: colors.background, letterSpacing: 1.2 }}
                  >
                    ADD
                  </MonoBold>
                )}
              </View>
            </Pressable>
          </View>

          {error ? (
            <View
              className="flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5 mt-3"
              style={{ backgroundColor: colors.error + "14" }}
            >
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Body className="text-sm flex-1" style={{ color: colors.error }}>
                {error}
              </Body>
            </View>
          ) : null}
        </Animated.View>
      </View>

      {list.isLoading ? (
        <ActivityIndicator color={colors.primary} className="mt-12" />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListHeaderComponent={
            categories.length > 0 ? (
              <View className="flex-row items-center gap-2 mb-3">
                <Label>{categories.length} CATEGORIES</Label>
                <View className="h-px flex-1 bg-border-soft" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="pricetags-outline"
              title="No categories yet"
              description="Add at least one so you can start listing products."
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.springify().damping(18).delay(Math.min(index, 6) * 30)}
              layout={LinearTransition.springify().damping(18)}
            >
              <Card raised className="px-3.5 py-3 flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.primary + "16" }}
                >
                  <Ionicons name="pricetag" size={16} color={colors.primary} />
                </View>
                <View className="flex-1 min-w-0">
                  <BodyBold className="text-foreground" numberOfLines={1}>
                    {item.name}
                  </BodyBold>
                  <Mono className="text-muted text-[10px] mt-0.5">
                    №{String(item.id).padStart(3, "0")}
                  </Mono>
                </View>
                <Pressable
                  className="w-9 h-9 rounded-full items-center justify-center active:opacity-60"
                  disabled={remove.isPending}
                  hitSlop={4}
                  onPress={() =>
                    Alert.alert(
                      "Delete category?",
                      `"${item.name}" will be removed. Products in this category must be reassigned first.`,
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
                  style={{ backgroundColor: colors.error + "10" }}
                >
                  <Ionicons name="trash" size={14} color={colors.error} />
                </Pressable>
              </Card>
            </Animated.View>
          )}
        />
      )}
    </ScreenContainer>
  );
}
