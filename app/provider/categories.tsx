import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { EmptyState } from "@/components/empty-state";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ProviderCategoriesScreen() {
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
  const [error, setError] = useState<string | null>(null);

  return (
    <ScreenContainer className="px-5">
      <Stack.Screen options={{ title: "Categories", headerShown: true }} />

      <View className="pt-4 pb-5 gap-3">
        <View className="flex-row items-start gap-3 bg-primary/5 border border-primary/15 rounded-2xl p-3">
          <Ionicons name="pricetags-outline" size={18} color={colors.primary} />
          <Text className="text-muted text-xs flex-1 leading-relaxed">
            Categories group your products. Buyers see them when browsing your shop.
          </Text>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1 bg-surface border border-border rounded-xl px-3 flex-row items-center">
            <Ionicons name="add" size={18} color={colors.muted} />
            <TextInput
              className="flex-1 py-3 pl-2 text-foreground"
              placeholder="New category (e.g. Dairy)"
              placeholderTextColor={colors["muted-soft"]}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
          <TouchableOpacity
            className="bg-primary rounded-xl px-5 justify-center active:opacity-80 disabled:opacity-50"
            disabled={!name.trim() || create.isPending}
            onPress={() => create.mutate({ name: name.trim() })}
          >
            {create.isPending ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold">Add</Text>
            )}
          </TouchableOpacity>
        </View>
        {error ? (
          <View className="flex-row items-center gap-2 bg-error/10 rounded-xl p-2.5">
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text className="text-error text-sm flex-1">{error}</Text>
          </View>
        ) : null}
      </View>

      {list.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            <EmptyState
              icon="pricetags-outline"
              title="No categories yet"
              description="Add at least one so you can start listing products."
            />
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between bg-surface border border-border rounded-2xl px-4 py-3">
              <View className="flex-row items-center gap-3 flex-1 min-w-0">
                <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
                  <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                </View>
                <Text className="text-foreground font-medium" numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <TouchableOpacity
                className="w-9 h-9 rounded-full items-center justify-center active:opacity-60"
                disabled={remove.isPending}
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
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}
