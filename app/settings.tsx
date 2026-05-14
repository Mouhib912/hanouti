import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { changePassword, deleteAccount } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout, refresh } = useAuth();
  const utils = trpc.useUtils();
  const profileQ = trpc.profile.get.useQuery();

  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (profileQ.data) {
      setBusinessName(profileQ.data.businessName ?? "");
      setLocation(profileQ.data.location ?? "");
      setContactPhone(profileQ.data.contactPhone ?? "");
    }
  }, [profileQ.data]);

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: async () => {
      utils.profile.get.invalidate();
      utils.providers.list.invalidate();
      await refresh();
      setFeedback({ kind: "success", message: "Profile updated." });
    },
    onError: (err) => setFeedback({ kind: "error", message: err.message }),
  });

  const dirty =
    profileQ.data != null &&
    (businessName.trim() !== (profileQ.data.businessName ?? "") ||
      location.trim() !== (profileQ.data.location ?? "") ||
      contactPhone.trim() !== (profileQ.data.contactPhone ?? ""));

  const onSave = () => {
    setFeedback(null);
    updateProfile.mutate({
      businessName: businessName.trim() || undefined,
      location: location.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
    });
  };

  const onLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const isProvider = user?.userType === "provider";

  return (
    <ScreenContainer className="px-5">
      <Stack.Screen options={{ title: "Settings", headerShown: true }} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="py-4">
          <Text className="text-foreground text-xl font-bold">Account</Text>
          <View className="flex-row items-center gap-1.5 mt-1">
            <View
              className={`w-1.5 h-1.5 rounded-full ${isProvider ? "bg-primary" : "bg-accent"}`}
            />
            <Text className="text-muted text-xs">
              {isProvider ? "Provider workspace" : "Buyer workspace"}
            </Text>
            <Text className="text-muted-soft text-xs">·</Text>
            <Text className="text-muted text-xs">{user?.phone ?? "—"}</Text>
          </View>
        </View>

        {profileQ.isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View className="bg-surface border border-border rounded-2xl p-4 gap-3">
            <Text className="text-foreground font-semibold">Business profile</Text>

            <View>
              <Text className="text-muted text-xs mb-1.5">
                {isProvider ? "Shop name" : "Buyer / business name"}
              </Text>
              <TextInput
                className="border border-border rounded-xl px-4 py-3 text-foreground bg-background"
                placeholder="Name"
                placeholderTextColor={colors["muted-soft"]}
                value={businessName}
                onChangeText={setBusinessName}
                autoCapitalize="words"
              />
            </View>

            <View>
              <Text className="text-muted text-xs mb-1.5">Location</Text>
              <View className="flex-row items-center bg-background border border-border rounded-xl px-3">
                <Ionicons name="location-outline" size={16} color={colors.muted} />
                <TextInput
                  className="flex-1 py-3 pl-2 text-foreground"
                  placeholder="City, district, or address"
                  placeholderTextColor={colors["muted-soft"]}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            <View>
              <Text className="text-muted text-xs mb-1.5">Contact phone</Text>
              <View className="flex-row items-center bg-background border border-border rounded-xl px-3">
                <Ionicons name="call-outline" size={16} color={colors.muted} />
                <TextInput
                  className="flex-1 py-3 pl-2 text-foreground"
                  placeholder="Phone shown to the other side of the order"
                  placeholderTextColor={colors["muted-soft"]}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {feedback ? (
              <View
                className={`flex-row items-center gap-2 rounded-xl p-3 ${
                  feedback.kind === "success" ? "bg-success/10" : "bg-error/10"
                }`}
              >
                <Ionicons
                  name={feedback.kind === "success" ? "checkmark-circle" : "alert-circle"}
                  size={16}
                  color={feedback.kind === "success" ? colors.success : colors.error}
                />
                <Text
                  className={`text-sm flex-1 ${
                    feedback.kind === "success" ? "text-success" : "text-error"
                  }`}
                >
                  {feedback.message}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              className="bg-primary rounded-2xl py-3.5 items-center active:opacity-80 disabled:opacity-40"
              disabled={!dirty || updateProfile.isPending}
              onPress={onSave}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-background font-semibold">Save changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {user?.userType === "buyer" ? <AddressManager colors={colors} /> : null}

        <PasswordSection colors={colors} />

        <View className="bg-surface border border-border rounded-2xl mt-4 overflow-hidden">
          <View className="px-4 py-3 border-b border-border">
            <Text className="text-muted text-xs uppercase tracking-wider">Preferences</Text>
          </View>
          <View className="px-4 py-3.5 flex-row items-center gap-3">
            <Ionicons name="notifications-outline" size={18} color={colors.muted} />
            <View className="flex-1">
              <Text className="text-foreground">Order notifications</Text>
              <Text className="text-muted text-xs">Coming soon — push delivery is being scoped.</Text>
            </View>
            <Text className="text-muted-soft text-xs">Off</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onLogout}
          className="mt-6 bg-error/10 rounded-2xl py-3.5 items-center flex-row justify-center gap-2 active:opacity-80"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text className="text-error font-semibold">Log out</Text>
        </TouchableOpacity>

        <DangerZone
          colors={colors}
          onDeleted={() => router.replace("/auth/login")}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

function AddressManager({ colors }: { colors: ReturnType<typeof useColors> }) {
  const utils = trpc.useUtils();
  const addressesQ = trpc.addresses.list.useQuery();
  const create = trpc.addresses.create.useMutation({
    onSuccess: () => {
      setLabel("");
      setAddress("");
      setMakeDefault(false);
      setShowForm(false);
      utils.addresses.list.invalidate();
    },
  });
  const setDefault = trpc.addresses.setDefault.useMutation({
    onSuccess: () => utils.addresses.list.invalidate(),
  });
  const remove = trpc.addresses.delete.useMutation({
    onSuccess: () => utils.addresses.list.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const canSubmit = label.trim().length > 0 && address.trim().length > 0;

  return (
    <View className="bg-surface border border-border rounded-2xl mt-4 overflow-hidden">
      <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
        <Text className="text-muted text-xs uppercase tracking-wider">Delivery addresses</Text>
        <TouchableOpacity
          onPress={() => setShowForm((s) => !s)}
          className="flex-row items-center gap-1 active:opacity-70"
          hitSlop={6}
        >
          <Ionicons
            name={showForm ? "close" : "add"}
            size={14}
            color={colors.primary}
          />
          <Text className="text-primary text-xs font-semibold">
            {showForm ? "Cancel" : "Add"}
          </Text>
        </TouchableOpacity>
      </View>

      {showForm ? (
        <View className="px-4 py-3 gap-2 border-b border-border">
          <TextInput
            className="border border-border rounded-xl px-3 py-2.5 text-foreground bg-background"
            placeholder='Label (e.g. "Shop" or "Warehouse")'
            placeholderTextColor={colors["muted-soft"]}
            value={label}
            onChangeText={setLabel}
            autoCapitalize="words"
          />
          <TextInput
            className="border border-border rounded-xl px-3 py-2.5 text-foreground bg-background"
            placeholder="Address"
            placeholderTextColor={colors["muted-soft"]}
            value={address}
            onChangeText={setAddress}
            multiline
          />
          <TouchableOpacity
            className="flex-row items-center gap-2 active:opacity-70"
            onPress={() => setMakeDefault((v) => !v)}
            hitSlop={6}
          >
            <View
              className={`w-4 h-4 rounded border ${makeDefault ? "bg-primary border-primary" : "border-border"} items-center justify-center`}
            >
              {makeDefault ? (
                <Ionicons name="checkmark" size={12} color={colors.background} />
              ) : null}
            </View>
            <Text className="text-muted text-xs">Set as default</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-primary rounded-xl py-2.5 items-center active:opacity-80 disabled:opacity-40"
            disabled={!canSubmit || create.isPending}
            onPress={() =>
              create.mutate({
                label: label.trim(),
                address: address.trim(),
                isDefault: makeDefault,
              })
            }
          >
            {create.isPending ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold text-sm">Save address</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {addressesQ.isLoading ? (
        <View className="py-6 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (addressesQ.data ?? []).length === 0 ? (
        <View className="px-4 py-5">
          <Text className="text-muted text-xs text-center">
            Add an address to skip typing it at checkout.
          </Text>
        </View>
      ) : (
        (addressesQ.data ?? []).map((a, idx) => (
          <View
            key={a.id}
            className={`px-4 py-3 flex-row items-center gap-3 ${
              idx > 0 ? "border-t border-border" : ""
            }`}
          >
            <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
              <Ionicons name="location" size={16} color={colors.primary} />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className="text-foreground font-medium" numberOfLines={1}>
                  {a.label}
                </Text>
                {a.isDefault ? (
                  <View className="bg-success/15 rounded-full px-2 py-0.5">
                    <Text className="text-success text-[10px] font-semibold">Default</Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-muted text-xs" numberOfLines={2}>
                {a.address}
              </Text>
            </View>
            {!a.isDefault ? (
              <TouchableOpacity
                onPress={() => setDefault.mutate({ id: a.id })}
                hitSlop={6}
                className="active:opacity-70"
              >
                <Ionicons name="star-outline" size={18} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Delete address?",
                  `"${a.label}" will be removed from your saved addresses.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => remove.mutate({ id: a.id }),
                    },
                  ],
                )
              }
              disabled={remove.isPending}
              hitSlop={6}
              className="active:opacity-70"
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

function PasswordSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const canSubmit =
    current.length >= 8 && next.length >= 8 && next === confirm && current !== next;

  const onSubmit = async () => {
    setFeedback(null);
    setSubmitting(true);
    try {
      await changePassword(current, next);
      reset();
      setFeedback({ kind: "success", message: "Password updated." });
      setOpen(false);
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not change password.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="bg-surface border border-border rounded-2xl mt-4 overflow-hidden">
      <TouchableOpacity
        className="px-4 py-3 border-b border-border flex-row items-center justify-between active:opacity-70"
        onPress={() => setOpen((o) => !o)}
      >
        <Text className="text-muted text-xs uppercase tracking-wider">Password</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.muted} />
      </TouchableOpacity>

      {open ? (
        <View className="px-4 py-3 gap-2">
          <TextInput
            className="border border-border rounded-xl px-3 py-2.5 text-foreground bg-background"
            placeholder="Current password"
            placeholderTextColor={colors["muted-soft"]}
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            className="border border-border rounded-xl px-3 py-2.5 text-foreground bg-background"
            placeholder="New password (min 8 chars)"
            placeholderTextColor={colors["muted-soft"]}
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            className="border border-border rounded-xl px-3 py-2.5 text-foreground bg-background"
            placeholder="Confirm new password"
            placeholderTextColor={colors["muted-soft"]}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
          />
          {feedback ? (
            <View
              className={`flex-row items-center gap-2 rounded-xl p-3 ${
                feedback.kind === "success" ? "bg-success/10" : "bg-error/10"
              }`}
            >
              <Ionicons
                name={feedback.kind === "success" ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={feedback.kind === "success" ? colors.success : colors.error}
              />
              <Text
                className={`text-sm flex-1 ${
                  feedback.kind === "success" ? "text-success" : "text-error"
                }`}
              >
                {feedback.message}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            className="bg-primary rounded-xl py-2.5 items-center active:opacity-80 disabled:opacity-40"
            disabled={!canSubmit || submitting}
            onPress={onSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold text-sm">Update password</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View className="px-4 py-3">
          <Text className="text-muted text-xs">Tap to change your password.</Text>
        </View>
      )}
    </View>
  );
}

function DangerZone({
  colors,
  onDeleted,
}: {
  colors: ReturnType<typeof useColors>;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This cannot be undone. Your profile, cart, addresses, and notification subscriptions will be removed. Past orders are kept for record.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            setError(null);
            setSubmitting(true);
            try {
              await deleteAccount(password);
              onDeleted();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not delete account.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View className="mt-6 border border-error/30 rounded-2xl overflow-hidden">
      <TouchableOpacity
        className="px-4 py-3 flex-row items-center justify-between active:opacity-70"
        onPress={() => setOpen((o) => !o)}
      >
        <Text className="text-error text-xs uppercase tracking-wider font-semibold">
          Danger zone
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.error} />
      </TouchableOpacity>

      {open ? (
        <View className="px-4 pb-4 gap-2">
          <Text className="text-muted text-xs leading-relaxed">
            Confirm with your current password to delete this account permanently.
          </Text>
          <TextInput
            className="border border-border rounded-xl px-3 py-2.5 text-foreground bg-background"
            placeholder="Current password"
            placeholderTextColor={colors["muted-soft"]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {error ? (
            <View className="flex-row items-center gap-2 bg-error/10 rounded-xl p-2.5">
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text className="text-error text-xs flex-1">{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            className="bg-error rounded-xl py-2.5 items-center active:opacity-80 disabled:opacity-40"
            disabled={password.length < 8 || submitting}
            onPress={confirmDelete}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="text-background font-semibold text-sm">Delete my account</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
