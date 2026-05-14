import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import { Card, Pill } from "@/components/receipt-card";
import { ScreenContainer } from "@/components/screen-container";
import {
  Body,
  Display,
  DisplaySm,
  Label,
  MonoBold,
} from "@/components/typography";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { login, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace("/(tabs)");
  }, [loading, isAuthenticated, router]);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(phone.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      {/* Soft green atmosphere */}
      <LinearGradient
        colors={[colors.primary + "1A", colors.background + "00"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.6 }}
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
          {/* HEADER */}
          <Animated.View entering={FadeInDown.duration(360)}>
            <View className="flex-row justify-between items-center pt-2">
              <Pill intent="ghost">
                <View
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: colors.primary }}
                />
                <Label className="text-foreground">SIGN IN</Label>
              </Pill>
            </View>
          </Animated.View>

          {/* HEADLINE */}
          <Animated.View entering={FadeInDown.duration(420).delay(60)}>
            <View className="mt-10 mb-2">
              <Display className="text-foreground text-[44px] leading-[44px]">
                Welcome
              </Display>
              <Display
                className="text-[44px] leading-[44px] mt-1"
                style={{ color: colors.primary }}
              >
                back.
              </Display>
            </View>
            <Body className="text-muted text-sm leading-5 mt-3 mb-8 max-w-[88%]">
              Sign in with your phone number to keep ordering or fulfilling.
            </Body>
          </Animated.View>

          {/* FIELDS */}
          <Animated.View entering={FadeInUp.duration(420).delay(140)}>
            <View className="gap-3 mb-5">
              <Field
                icon="call-outline"
                placeholder="Phone (8 digits, e.g. 55 123 456)"
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={20}
                value={phone}
                onChangeText={setPhone}
              />
              <Field
                icon="lock-closed-outline"
                placeholder="Password"
                secureTextEntry={!showPassword}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    hitSlop={8}
                    className="active:opacity-60 p-1"
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>
                }
              />
            </View>
          </Animated.View>

          {error ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <View
                className="flex-row items-start gap-2 rounded-2xl px-3.5 py-3 mb-4"
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
          <Animated.View entering={FadeInUp.duration(420).delay(220)}>
            <Pressable
              disabled={submitting || !phone || !password}
              onPress={onSubmit}
              className="active:opacity-90"
              style={{ opacity: !phone || !password ? 0.5 : 1 }}
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
                    <DisplaySm style={{ color: colors.background }}>Sign in</DisplaySm>
                    <Ionicons name="arrow-forward" size={18} color={colors.background} />
                  </>
                )}
              </Card>
            </Pressable>
          </Animated.View>

          {/* FOOTER LINK */}
          <Animated.View
            entering={FadeInUp.duration(420).delay(280)}
            className="flex-row justify-center items-center gap-1.5 mt-6"
          >
            <Body className="text-muted text-sm">New here?</Body>
            <Link href="/auth/register" asChild>
              <Pressable className="active:opacity-60">
                <MonoBold className="text-[11px]" style={{ color: colors.primary, letterSpacing: 1.2 }}>
                  CREATE ACCOUNT →
                </MonoBold>
              </Pressable>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  trailing?: React.ReactNode;
};

function Field({ icon, trailing, ...rest }: FieldProps) {
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
      {trailing}
    </View>
  );
}
