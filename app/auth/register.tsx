import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { type ComponentProps, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  MonoBold,
} from "@/components/typography";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type UserType = "buyer" | "provider";

const ROLE_OPTIONS: {
  value: UserType;
  title: string;
  subtitle: string;
  icon: IoniconName;
}[] = [
  {
    value: "buyer",
    title: "I'm a buyer",
    subtitle: "I run a grocery shop and want to order stock.",
    icon: "storefront-outline",
  },
  {
    value: "provider",
    title: "I'm a supplier",
    subtitle: "I sell products to grocery shops.",
    icon: "cube-outline",
  },
];

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useColors();
  const { register, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace("/(tabs)");
  }, [loading, isAuthenticated, router]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [userType, setUserType] = useState<UserType>("buyer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = phone && password.length >= 8 && name && businessName;

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await register({
        phone: phone.trim(),
        password,
        name: name.trim(),
        userType,
        businessName: businessName.trim(),
        location: location.trim() || undefined,
        avatarUrl: avatarUrl ?? undefined,
      });
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      {/* Soft green wash behind the hero — ties to the brand. */}
      <LinearGradient
        colors={[colors.primary + "1A", colors.background + "00"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.7 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 380 }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back / cancel */}
          <Animated.View entering={FadeInDown.duration(360)}>
            <View className="flex-row items-center justify-between pt-2 pb-3">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full items-center justify-center bg-surface active:opacity-70"
                hitSlop={6}
              >
                <Ionicons name="arrow-back" size={18} color={colors.foreground} />
              </Pressable>
              <Pill intent="ghost">
                <Ionicons name="leaf" size={11} color={colors.primary} />
                <Label className="text-foreground">SIGN UP</Label>
              </Pill>
            </View>
          </Animated.View>

          {/* HEADLINE */}
          <Animated.View entering={FadeInDown.duration(420).delay(60)}>
            <View className="mt-3 mb-6 max-w-[92%]">
              <Display className="text-foreground text-[36px] leading-[40px]">
                Set up your{" "}
                <Display
                  className="text-[36px] leading-[40px]"
                  style={{ color: colors.primary }}
                >
                  workspace.
                </Display>
              </Display>
              <Body className="text-muted text-sm leading-5 mt-3">
                Add a photo so your buyers (or suppliers) recognise you at a glance.
              </Body>
            </View>
          </Animated.View>

          {/* AVATAR */}
          <Animated.View
            entering={FadeInUp.duration(420).delay(140)}
            className="items-center mb-7 mt-2"
          >
            <AvatarPicker
              value={avatarUrl}
              onChange={setAvatarUrl}
              size={120}
              caption={avatarUrl ? "Tap to change photo" : "Tap to add a profile photo"}
            />
          </Animated.View>

          {/* ROLE PICKER */}
          <Animated.View entering={FadeInUp.duration(420).delay(200)} className="mb-6">
            <Label className="mb-3">CHOOSE · YOUR ROLE</Label>
            <View className="gap-3">
              {ROLE_OPTIONS.map((opt) => {
                const active = userType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setUserType(opt.value)}
                    className="active:opacity-90"
                  >
                    <Card
                      raised={active}
                      className="px-4 py-3.5 flex-row items-center gap-3"
                      style={{
                        borderColor: active ? colors.primary : colors["border-soft"],
                        borderWidth: 2,
                        backgroundColor: active
                          ? colors.primary + "0F"
                          : colors["background-elevated"],
                      }}
                    >
                      <View
                        className="w-11 h-11 rounded-xl items-center justify-center"
                        style={{
                          backgroundColor: active ? colors.primary : colors.surface,
                        }}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={20}
                          color={active ? colors.background : colors.foreground}
                        />
                      </View>
                      <View className="flex-1">
                        <BodyBold className="text-foreground text-[15px]">
                          {opt.title}
                        </BodyBold>
                        <Body className="text-muted text-xs mt-0.5 leading-4">
                          {opt.subtitle}
                        </Body>
                      </View>
                      <View
                        className="w-6 h-6 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: active ? colors.primary : "transparent",
                          borderWidth: active ? 0 : 1.5,
                          borderColor: colors["border-soft"],
                        }}
                      >
                        {active ? (
                          <Ionicons name="checkmark" size={14} color={colors.background} />
                        ) : null}
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* IDENTITY */}
          <Animated.View entering={FadeInUp.duration(420).delay(260)} className="mb-6">
            <Label className="mb-3">YOUR · DETAILS</Label>
            <View className="gap-3">
              <FormField
                icon="call-outline"
                placeholder="Phone number"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
              />
              <FormField
                icon="lock-closed-outline"
                placeholder="Password (8+ characters)"
                secureTextEntry
                autoComplete="password-new"
                value={password}
                onChangeText={setPassword}
              />
              <FormField
                icon="person-outline"
                placeholder="Your full name"
                autoCapitalize="words"
                autoComplete="name"
                value={name}
                onChangeText={setName}
              />
              <FormField
                icon={userType === "provider" ? "business-outline" : "cart-outline"}
                placeholder={userType === "provider" ? "Business name" : "Store name"}
                autoCapitalize="words"
                value={businessName}
                onChangeText={setBusinessName}
              />
              <FormField
                icon="location-outline"
                placeholder="Location (optional)"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </Animated.View>

          {error ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <View
                className="flex-row items-start gap-2 rounded-2xl px-3.5 py-3 mb-5"
                style={{ backgroundColor: colors.error + "14" }}
              >
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Body className="text-sm flex-1" style={{ color: colors.error }}>
                  {error}
                </Body>
              </View>
            </Animated.View>
          ) : null}

          {/* SUBMIT */}
          <Animated.View entering={FadeInUp.duration(420).delay(320)}>
            <Pressable
              disabled={submitting || !canSubmit}
              onPress={onSubmit}
              className="active:opacity-90"
              style={{ opacity: !canSubmit ? 0.5 : 1 }}
            >
              <Card
                intent="primary"
                raised
                className="px-4 py-4 flex-row items-center justify-center gap-2"
                style={{ borderRadius: 18 }}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <DisplaySm style={{ color: colors.background }}>
                      Create account
                    </DisplaySm>
                    <Ionicons name="arrow-forward" size={18} color={colors.background} />
                  </>
                )}
              </Card>
            </Pressable>
          </Animated.View>

          {/* FOOTER LINK */}
          <Animated.View
            entering={FadeInUp.duration(420).delay(380)}
            className="flex-row justify-center items-center gap-1.5 mt-5"
          >
            <Body className="text-muted text-sm">Already a member?</Body>
            <Link href="/auth/login" asChild>
              <Pressable className="active:opacity-60">
                <MonoBold className="text-[11px]" style={{ color: colors.primary, letterSpacing: 1.2 }}>
                  SIGN IN →
                </MonoBold>
              </Pressable>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

type FormFieldProps = ComponentProps<typeof TextInput> & {
  icon: IoniconName;
};

function FormField({ icon, ...rest }: FormFieldProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View
      className="flex-row items-center rounded-2xl px-4"
      style={{
        backgroundColor: colors["background-elevated"],
        borderWidth: 1.5,
        borderColor: focused ? colors.primary : colors["border-soft"],
      }}
    >
      <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.muted} />
      <TextInput
        className="flex-1 py-3.5 pl-3 text-foreground font-body"
        style={{ color: colors.foreground }}
        placeholderTextColor={colors["muted-soft"]}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
    </View>
  );
}
