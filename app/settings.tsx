import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { AvatarPicker } from "@/components/avatar-picker";
import { Card, Pill } from "@/components/receipt-card";
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
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { changePassword, deleteAccount } from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";
import { formatPhone } from "@/lib/utils";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, logout, refresh } = useAuth();
  const utils = trpc.useUtils();
  const profileQ = trpc.profile.get.useQuery();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
      setAvatarUrl(profileQ.data.avatarUrl ?? null);
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
      contactPhone.trim() !== (profileQ.data.contactPhone ?? "") ||
      avatarUrl !== (profileQ.data.avatarUrl ?? null));

  const onSave = () => {
    setFeedback(null);
    updateProfile.mutate({
      businessName: businessName.trim() || undefined,
      location: location.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      avatarUrl,
    });
  };

  const onLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const isProvider = user?.userType === "provider";

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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 }}
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
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: colors.primary }}
              />
              <Label className="text-foreground">
                {isProvider ? "PROVIDER" : "BUYER"} · SETTINGS
              </Label>
            </Pill>
          </View>

          <View className="mt-5 mb-1">
            <Display className="text-foreground text-[36px] leading-[40px]">
              Your{" "}
              <Display
                className="text-[36px] leading-[40px]"
                style={{ color: colors.primary }}
              >
                account.
              </Display>
            </Display>
            <View className="flex-row items-center gap-2 mt-2">
              <Mono className="text-muted text-[11px]">
                {formatPhone(user?.phone)}
              </Mono>
              <View className="w-1 h-1 rounded-full bg-muted-soft" />
              <Mono className="text-muted text-[11px]">
                ID №{String(user?.id ?? 0).padStart(4, "0")}
              </Mono>
            </View>
          </View>
        </Animated.View>

        {profileQ.isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <Animated.View entering={FadeInUp.duration(420).delay(60)} className="mt-7 gap-4">
            {/* Avatar + identity */}
            <Card raised className="px-4 py-5 items-center">
              <AvatarPicker
                value={avatarUrl}
                onChange={setAvatarUrl}
                size={104}
                caption="Tap to update your profile photo"
              />
              <View className="items-center mt-2">
                <DisplaySm className="text-foreground text-[18px]" numberOfLines={1}>
                  {businessName || "Untitled business"}
                </DisplaySm>
                {user?.name ? (
                  <Body className="text-muted text-xs mt-0.5" numberOfLines={1}>
                    {user.name}
                  </Body>
                ) : null}
              </View>
            </Card>

            {/* Profile fields */}
            <Card raised className="px-4 py-4 gap-3.5">
              <Label>BUSINESS PROFILE</Label>

              <FormField
                icon="business-outline"
                label="BUSINESS NAME"
                placeholder={isProvider ? "Shop name" : "Buyer / business name"}
                value={businessName}
                onChangeText={setBusinessName}
                autoCapitalize="words"
              />
              <FormField
                icon="location-outline"
                label="LOCATION"
                placeholder="City, district, or address"
                value={location}
                onChangeText={setLocation}
              />
              <FormField
                icon="call-outline"
                label="CONTACT PHONE"
                placeholder="Shown to the other side of the order"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />

              {feedback ? (
                <View
                  className="flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5"
                  style={{
                    backgroundColor:
                      (feedback.kind === "success" ? colors.primary : colors.error) + "14",
                  }}
                >
                  <Ionicons
                    name={feedback.kind === "success" ? "checkmark-circle" : "alert-circle"}
                    size={16}
                    color={feedback.kind === "success" ? colors.primary : colors.error}
                  />
                  <Body
                    className="text-sm flex-1"
                    style={{
                      color: feedback.kind === "success" ? colors["primary-deep"] : colors.error,
                    }}
                  >
                    {feedback.message}
                  </Body>
                </View>
              ) : null}

              <Pressable
                disabled={!dirty || updateProfile.isPending}
                onPress={onSave}
                className="active:opacity-90 mt-1"
                style={{ opacity: !dirty || updateProfile.isPending ? 0.5 : 1 }}
              >
                <View
                  className="rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
                  style={{ backgroundColor: colors.primary }}
                >
                  {updateProfile.isPending ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color={colors.background} />
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
            </Card>

            {user?.userType === "buyer" ? <AddressManager /> : null}

            <PasswordSection />

            <NotificationsCard />

            {/* Log out */}
            <Pressable onPress={onLogout} className="active:opacity-85">
              <Card raised className="px-4 py-3.5 flex-row items-center gap-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.surface }}
                >
                  <Ionicons name="log-out-outline" size={18} color={colors.foreground} />
                </View>
                <View className="flex-1">
                  <BodyBold className="text-foreground">Log out</BodyBold>
                  <Body className="text-muted text-xs mt-0.5">
                    Sign out of this device.
                  </Body>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors["muted-soft"]} />
              </Card>
            </Pressable>

            <DangerZone onDeleted={() => router.replace("/auth/login")} />
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function FormField({
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
          autoCapitalize="none"
          {...rest}
        />
      </View>
    </View>
  );
}

function AddressManager() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const addressesQ = trpc.addresses.list.useQuery();
  const create = trpc.addresses.create.useMutation({
    onSuccess: () => {
      setLabel("");
      setAddressStr("");
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
  const [addressStr, setAddressStr] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const canSubmit = label.trim().length > 0 && addressStr.trim().length > 0;
  const addresses = addressesQ.data ?? [];

  return (
    <Card raised className="px-4 py-4">
      <View className="flex-row items-center justify-between mb-3">
        <Label>DELIVERY ADDRESSES</Label>
        <Pressable
          onPress={() => setShowForm((s) => !s)}
          hitSlop={6}
          className="active:opacity-60"
        >
          <MonoBold
            className="text-[11px]"
            style={{ color: colors.primary, letterSpacing: 1.2 }}
          >
            {showForm ? "CANCEL ×" : "+ ADD"}
          </MonoBold>
        </Pressable>
      </View>

      {showForm ? (
        <Animated.View entering={FadeInUp.duration(240)} className="gap-3 mb-3">
          <FormField
            icon="pricetag-outline"
            label="LABEL"
            placeholder='e.g. "Shop" or "Warehouse"'
            value={label}
            onChangeText={setLabel}
            autoCapitalize="words"
          />
          <FormField
            icon="location-outline"
            label="ADDRESS"
            placeholder="Full street address"
            value={addressStr}
            onChangeText={setAddressStr}
            multiline
          />
          <Pressable
            onPress={() => setMakeDefault((v) => !v)}
            hitSlop={6}
            className="flex-row items-center gap-2 active:opacity-60"
          >
            <View
              className="w-5 h-5 rounded items-center justify-center"
              style={{
                backgroundColor: makeDefault ? colors.primary : "transparent",
                borderWidth: 1.5,
                borderColor: makeDefault ? colors.primary : colors["border-soft"],
              }}
            >
              {makeDefault ? (
                <Ionicons name="checkmark" size={12} color={colors.background} />
              ) : null}
            </View>
            <Body className="text-foreground text-xs">Set as default</Body>
          </Pressable>
          <Pressable
            disabled={!canSubmit || create.isPending}
            onPress={() =>
              create.mutate({
                label: label.trim(),
                address: addressStr.trim(),
                isDefault: makeDefault,
              })
            }
            className="active:opacity-90"
            style={{ opacity: !canSubmit || create.isPending ? 0.5 : 1 }}
          >
            <View
              className="rounded-2xl py-3 items-center"
              style={{ backgroundColor: colors.primary }}
            >
              {create.isPending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <MonoBold
                  className="text-[11px]"
                  style={{ color: colors.background, letterSpacing: 1.2 }}
                >
                  SAVE ADDRESS
                </MonoBold>
              )}
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      {addressesQ.isLoading ? (
        <View className="py-6 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <Body className="text-muted text-xs text-center py-4">
          Add an address to skip typing it at checkout.
        </Body>
      ) : (
        <View className="gap-2">
          {addresses.map((a) => (
            <View
              key={a.id}
              className="flex-row items-center gap-3 px-3 py-2.5 rounded-2xl"
              style={{
                backgroundColor: colors["background-elevated"],
                borderWidth: 1,
                borderColor: colors["border-soft"],
              }}
            >
              <View
                className="w-9 h-9 rounded-xl items-center justify-center"
                style={{ backgroundColor: colors.primary + "16" }}
              >
                <Ionicons name="location" size={14} color={colors.primary} />
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-2">
                  <BodyBold className="text-foreground text-[13px]" numberOfLines={1}>
                    {a.label}
                  </BodyBold>
                  {a.isDefault ? (
                    <Pill intent="ghost" className="py-0 px-1.5">
                      <Mono className="text-[9px]" style={{ color: colors.primary, letterSpacing: 0.8 }}>
                        DEFAULT
                      </Mono>
                    </Pill>
                  ) : null}
                </View>
                <Body className="text-muted text-[11px] mt-0.5 leading-4" numberOfLines={2}>
                  {a.address}
                </Body>
              </View>
              {!a.isDefault ? (
                <Pressable
                  onPress={() => setDefault.mutate({ id: a.id })}
                  hitSlop={6}
                  className="active:opacity-70 w-8 h-8 items-center justify-center"
                >
                  <Ionicons name="star-outline" size={16} color={colors.muted} />
                </Pressable>
              ) : null}
              <Pressable
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
                className="active:opacity-70 w-8 h-8 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={15} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function PasswordSection() {
  const colors = useColors();
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
    <Card raised className="overflow-hidden">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="px-4 py-3.5 flex-row items-center justify-between active:opacity-80"
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.surface }}
          >
            <Ionicons name="lock-closed-outline" size={16} color={colors.foreground} />
          </View>
          <View className="flex-1">
            <BodyBold className="text-foreground">Password</BodyBold>
            <Body className="text-muted text-xs mt-0.5">
              {open ? "Enter new password" : "Tap to change your password"}
            </Body>
          </View>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors["muted-soft"]}
        />
      </Pressable>

      {open ? (
        <Animated.View
          entering={FadeInUp.duration(240)}
          className="px-4 pb-4 gap-3"
          style={{ borderTopWidth: 1, borderTopColor: colors["border-soft"] }}
        >
          <View className="h-3" />
          <FormField
            icon="key-outline"
            label="CURRENT"
            placeholder="Current password"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
          />
          <FormField
            icon="lock-closed-outline"
            label="NEW (8+ CHARS)"
            placeholder="New password"
            value={next}
            onChangeText={setNext}
            secureTextEntry
          />
          <FormField
            icon="lock-closed-outline"
            label="CONFIRM"
            placeholder="Repeat new password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
          {feedback ? (
            <View
              className="flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5"
              style={{
                backgroundColor:
                  (feedback.kind === "success" ? colors.primary : colors.error) + "14",
              }}
            >
              <Ionicons
                name={feedback.kind === "success" ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={feedback.kind === "success" ? colors.primary : colors.error}
              />
              <Body
                className="text-sm flex-1"
                style={{
                  color: feedback.kind === "success" ? colors["primary-deep"] : colors.error,
                }}
              >
                {feedback.message}
              </Body>
            </View>
          ) : null}
          <Pressable
            disabled={!canSubmit || submitting}
            onPress={onSubmit}
            className="active:opacity-90"
            style={{ opacity: !canSubmit || submitting ? 0.5 : 1 }}
          >
            <View
              className="rounded-2xl py-3 items-center"
              style={{ backgroundColor: colors.primary }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <MonoBold
                  className="text-[11px]"
                  style={{ color: colors.background, letterSpacing: 1.2 }}
                >
                  UPDATE PASSWORD
                </MonoBold>
              )}
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </Card>
  );
}

function NotificationsCard() {
  const colors = useColors();
  return (
    <Card raised className="px-4 py-3.5 flex-row items-center gap-3">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: colors.primary + "16" }}
      >
        <Ionicons name="notifications" size={16} color={colors.primary} />
      </View>
      <View className="flex-1">
        <BodyBold className="text-foreground">Push notifications</BodyBold>
        <Body className="text-muted text-xs mt-0.5 leading-4">
          On — providers ping on new orders, buyers ping on status changes. Toggle in the OS
          settings.
        </Body>
      </View>
      <Pill intent="ghost">
        <View
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: colors.primary }}
        />
        <Mono className="text-[10px]" style={{ color: colors.primary, letterSpacing: 0.8 }}>
          ON
        </Mono>
      </Pill>
    </Card>
  );
}

function DangerZone({ onDeleted }: { onDeleted: () => void }) {
  const colors = useColors();
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
    <View
      className="rounded-2xl overflow-hidden mt-3"
      style={{
        borderWidth: 1.5,
        borderColor: colors.error + "60",
        backgroundColor: colors.error + "08",
      }}
    >
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="px-4 py-3.5 flex-row items-center justify-between active:opacity-80"
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.error + "18" }}
          >
            <Ionicons name="warning" size={16} color={colors.error} />
          </View>
          <View className="flex-1">
            <BodyBold style={{ color: colors.error }}>Danger zone</BodyBold>
            <Body className="text-muted text-xs mt-0.5">Delete your account permanently.</Body>
          </View>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.error}
        />
      </Pressable>

      {open ? (
        <Animated.View
          entering={FadeInUp.duration(240)}
          className="px-4 pb-4 gap-3"
          style={{ borderTopWidth: 1, borderTopColor: colors.error + "30" }}
        >
          <View className="h-3" />
          <Body className="text-muted text-xs leading-5">
            Confirm with your current password to delete this account permanently.
          </Body>
          <FormField
            icon="key-outline"
            label="CURRENT PASSWORD"
            placeholder="Current password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? (
            <View
              className="flex-row items-center gap-2 rounded-2xl px-3.5 py-2.5"
              style={{ backgroundColor: colors.error + "14" }}
            >
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Body className="text-xs flex-1" style={{ color: colors.error }}>
                {error}
              </Body>
            </View>
          ) : null}
          <Pressable
            disabled={password.length < 8 || submitting}
            onPress={confirmDelete}
            className="active:opacity-90"
            style={{ opacity: password.length < 8 || submitting ? 0.5 : 1 }}
          >
            <View
              className="rounded-2xl py-3 items-center"
              style={{ backgroundColor: colors.error }}
            >
              {submitting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <MonoBold
                  className="text-[11px]"
                  style={{ color: colors.background, letterSpacing: 1.2 }}
                >
                  DELETE MY ACCOUNT
                </MonoBold>
              )}
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
