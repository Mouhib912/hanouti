import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { type ComponentProps, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { resolveImageUrl } from "@/lib/_core/api";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { Card, Pill } from "@/components/receipt-card";
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
import { usePushRegistration } from "@/hooks/use-push-registration";
import { trpc } from "@/lib/trpc";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type ActionLink = {
  href:
    | "/provider/categories"
    | "/provider/products"
    | "/provider/orders"
    | "/buyer/providers"
    | "/buyer/cart"
    | "/buyer/orders";
  title: string;
  desc: string;
  icon: IoniconName;
};

const PROVIDER_LINKS: ActionLink[] = [
  { href: "/provider/products", title: "Catalog", desc: "Products, stock, photos", icon: "cube-outline" },
  { href: "/provider/orders", title: "Incoming orders", desc: "Confirm, prep, dispatch", icon: "receipt-outline" },
  { href: "/provider/categories", title: "Categories", desc: "Organize the catalog", icon: "pricetags-outline" },
];

const BUYER_LINKS: ActionLink[] = [
  { href: "/buyer/providers", title: "Browse suppliers", desc: "Find shops nearby", icon: "storefront-outline" },
  { href: "/buyer/cart", title: "Cart", desc: "Review before checkout", icon: "cart-outline" },
  { href: "/buyer/orders", title: "My orders", desc: "Track every delivery", icon: "time-outline" },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, loading, isAuthenticated } = useAuth();
  usePushRegistration(isAuthenticated);

  const isProvider = user?.userType === "provider";

  const providerProductsQ = trpc.products.listMine.useQuery(undefined, {
    enabled: isAuthenticated && isProvider,
  });
  const providerOrdersQ = trpc.orders.listProvider.useQuery(undefined, {
    enabled: isAuthenticated && isProvider,
  });
  const buyerCartQ = trpc.cart.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.userType === "buyer",
  });
  const buyerOrdersQ = trpc.orders.listBuyer.useQuery(undefined, {
    enabled: isAuthenticated && user?.userType === "buyer",
  });
  const providersQ = trpc.providers.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.userType === "buyer",
  });

  const featuredProviders = useMemo(() => {
    const list = providersQ.data ?? [];
    return [...list]
      .sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0))
      .slice(0, 6);
  }, [providersQ.data]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  const refreshing =
    providerProductsQ.isFetching ||
    providerOrdersQ.isFetching ||
    buyerCartQ.isFetching ||
    buyerOrdersQ.isFetching;

  const onRefresh = () => {
    if (isProvider) {
      providerProductsQ.refetch();
      providerOrdersQ.refetch();
    } else {
      buyerCartQ.refetch();
      buyerOrdersQ.refetch();
      providersQ.refetch();
    }
  };

  const stats = useMemo<{ label: string; value: number; tone: "neutral" | "good" | "alert" }[]>(() => {
    if (isProvider) {
      const products = providerProductsQ.data ?? [];
      const orders = providerOrdersQ.data ?? [];
      const open = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length;
      const outOfStock = products.filter((p) => !p.inStock).length;
      return [
        { label: "Open orders", value: open, tone: open > 0 ? "good" : "neutral" },
        { label: "In catalog", value: products.length, tone: "neutral" },
        { label: "Out of stock", value: outOfStock, tone: outOfStock > 0 ? "alert" : "neutral" },
      ];
    }
    const cart = buyerCartQ.data ?? [];
    const orders = buyerOrdersQ.data ?? [];
    const open = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length;
    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
    return [
      { label: "In cart", value: cartCount, tone: cartCount > 0 ? "good" : "neutral" },
      { label: "In transit", value: open, tone: open > 0 ? "good" : "neutral" },
      { label: "Lifetime", value: orders.length, tone: "neutral" },
    ];
  }, [isProvider, providerProductsQ.data, providerOrdersQ.data, buyerCartQ.data, buyerOrdersQ.data]);

  const cartCount = buyerCartQ.data?.reduce((sum, c) => sum + c.quantity, 0) ?? 0;
  const links = isProvider ? PROVIDER_LINKS : BUYER_LINKS;
  const displayName = user?.businessName ?? user?.name ?? "Welcome";
  const avatarUri = resolveImageUrl(user?.avatarUrl);
  const initials = (user?.businessName ?? user?.name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading || !user) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Soft atmospheric brand-green wash behind the hero. */}
      <LinearGradient
        colors={[colors.primary + "1F", colors.background + "00"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 0.65 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 360 }}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <Animated.View entering={FadeInDown.duration(420)}>
          <View className="flex-row items-center justify-between pt-2">
            <Pill intent="ghost">
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: colors.primary }}
              />
              <Label className="text-foreground">
                {isProvider ? "PROVIDER" : "BUYER"}
              </Label>
            </Pill>
            <Pressable
              onPress={() => router.push("/settings")}
              className="w-11 h-11 rounded-full items-center justify-center overflow-hidden active:opacity-80"
              style={{
                backgroundColor: colors.foreground,
                borderWidth: 2,
                borderColor: colors.background,
              }}
              hitSlop={6}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              ) : (
                <MonoBold
                  className="text-[11px]"
                  style={{ color: colors.background, letterSpacing: 0.6 }}
                >
                  {initials}
                </MonoBold>
              )}
            </Pressable>
          </View>

          <View className="mt-6 mb-1">
            <Body className="text-muted text-sm">{greet()},</Body>
            <Display
              className="text-foreground text-[40px] leading-[44px] mt-1"
              numberOfLines={2}
            >
              {displayName}.
            </Display>
          </View>

          <Body className="text-muted text-sm leading-5 mt-2 mb-6 max-w-[90%]">
            {isProvider
              ? "Your shop at a glance — orders moving, stock in check, catalog ready."
              : "Find your suppliers, restock with a tap, track every delivery."}
          </Body>
        </Animated.View>

        {/* STATS — three confident numbers in a row */}
        <Animated.View entering={FadeInUp.duration(420).delay(80)}>
          <View className="flex-row gap-3 mb-7">
            {stats.map((s, i) => {
              // White + green system: positive stats glow green, alerts go ink-heavy
              // (the label carries the urgency, no need for an extra colour).
              const valueColor =
                s.tone === "good" ? colors.primary : colors.foreground;
              return (
                <Animated.View
                  key={s.label}
                  entering={FadeIn.duration(400).delay(160 + i * 70)}
                  style={{ flex: 1 }}
                >
                  <Card raised className="px-3.5 py-4">
                    <Display
                      className="text-foreground text-[32px] leading-9"
                      style={{ color: valueColor }}
                    >
                      {String(s.value).padStart(2, "0")}
                    </Display>
                    <Body className="text-muted text-[11px] mt-1 leading-4">
                      {s.label}
                    </Body>
                  </Card>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* FEATURED SUPPLIERS — BUYER */}
        {!isProvider && featuredProviders.length > 0 ? (
          <Animated.View entering={FadeInUp.duration(420).delay(180)} className="mb-7">
            <View className="flex-row items-center justify-between mb-3">
              <Label>FEATURED · TOP RATED</Label>
              <Link href="/buyer/providers" asChild>
                <Pressable className="active:opacity-60">
                  <MonoBold className="text-foreground text-[11px]">SEE ALL →</MonoBold>
                </Pressable>
              </Link>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 4 }}
            >
              {featuredProviders.map((p, i) => (
                <Animated.View
                  key={p.id}
                  entering={SlideInRight.duration(380).delay(220 + i * 50)}
                >
                  <Link href={`/buyer/provider/${p.id}`} asChild>
                    <Pressable className="active:opacity-85">
                      <Card raised className="w-52 px-4 py-4">
                        <View className="flex-row items-start justify-between mb-3">
                          <View
                            className="w-10 h-10 rounded-xl items-center justify-center"
                            style={{ backgroundColor: colors.foreground }}
                          >
                            <Ionicons name="storefront" size={16} color={colors.background} />
                          </View>
                          <Pill intent="ghost" className="py-0.5 px-2">
                            <Ionicons name="star" size={10} color={colors.primary} />
                            <MonoBold className="text-foreground text-[10px]">
                              {p.rating ?? "—"}
                            </MonoBold>
                          </Pill>
                        </View>
                        <BodyBold className="text-foreground text-base leading-5" numberOfLines={2}>
                          {p.businessName}
                        </BodyBold>
                        {p.location ? (
                          <View className="flex-row items-center gap-1 mt-1">
                            <Ionicons name="location" size={11} color={colors.muted} />
                            <Body className="text-muted text-[11px]" numberOfLines={1}>
                              {p.location}
                            </Body>
                          </View>
                        ) : null}
                      </Card>
                    </Pressable>
                  </Link>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* NAVIGATION */}
        <Animated.View entering={FadeInUp.duration(420).delay(260)}>
          <Label className="mb-3">
            {isProvider ? "MANAGE · SHOP" : "SHOP · ORDER"}
          </Label>

          <View className="gap-3">
            {links.map((link, i) => {
              const isCart = link.href === "/buyer/cart";
              return (
                <Animated.View
                  key={link.href}
                  entering={FadeInUp.duration(360).delay(300 + i * 50)}
                >
                  <Link href={link.href} asChild>
                    <Pressable className="active:opacity-85">
                      <Card raised className="px-4 py-3.5">
                        <View className="flex-row items-center gap-3.5">
                          <View className="w-11 h-11 rounded-xl bg-background-elevated items-center justify-center">
                            <Ionicons name={link.icon} size={20} color={colors.foreground} />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                              <BodyBold className="text-foreground text-base">
                                {link.title}
                              </BodyBold>
                              {isCart && cartCount > 0 ? (
                                <Pill intent="primary" className="py-0.5 px-2">
                                  <MonoBold className="text-background text-[10px]">{cartCount}</MonoBold>
                                </Pill>
                              ) : null}
                            </View>
                            <Body className="text-muted text-xs mt-0.5">
                              {link.desc}
                            </Body>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={colors["muted-soft"]} />
                        </View>
                      </Card>
                    </Pressable>
                  </Link>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* HINT / CTA FOOTER */}
        <Animated.View entering={FadeInUp.duration(420).delay(500)} className="mt-7">
          {isProvider ? (
            <ProviderHint colors={colors} />
          ) : (
            <BuyerHint colors={colors} cartCount={cartCount} />
          )}
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

function greet() {
  const hr = new Date().getHours();
  if (hr < 5) return "Working late";
  if (hr < 12) return "Good morning";
  if (hr < 18) return "Good afternoon";
  return "Good evening";
}

function ProviderHint({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <Card raised className="px-4 py-3.5 flex-row gap-3 items-start">
      <View
        className="w-9 h-9 rounded-xl items-center justify-center"
        style={{ backgroundColor: colors.tape + "22" }}
      >
        <Ionicons name="bulb-outline" size={16} color={colors.tape} />
      </View>
      <View className="flex-1">
        <BodyBold className="text-foreground text-sm">Keep it fresh</BodyBold>
        <Body className="text-muted text-xs leading-5 mt-0.5">
          Toggle stock status as items run out so buyers see accurate availability.
        </Body>
      </View>
    </Card>
  );
}

function BuyerHint({
  colors,
  cartCount,
}: {
  colors: ReturnType<typeof useColors>;
  cartCount: number;
}) {
  if (cartCount === 0) {
    return (
      <Card raised className="px-4 py-3.5 flex-row gap-3 items-start">
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: colors.tape + "22" }}
        >
          <Ionicons name="leaf-outline" size={16} color={colors.tape} />
        </View>
        <View className="flex-1">
          <BodyBold className="text-foreground text-sm">Start exploring</BodyBold>
          <Body className="text-muted text-xs leading-5 mt-0.5">
            Browse suppliers to fill your cart. Each supplier checks out separately.
          </Body>
        </View>
      </Card>
    );
  }
  return (
    <Link href="/buyer/cart" asChild>
      <Pressable className="active:opacity-90">
        <Card intent="primary" raised className="px-4 py-3.5 flex-row items-center gap-3">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            <Ionicons name="cart" size={18} color={colors.background} />
          </View>
          <View className="flex-1">
            <DisplaySm
              className="text-base"
              style={{ color: colors.background }}
            >
              Check out
            </DisplaySm>
            <Mono
              className="text-[10px] mt-0.5"
              style={{ color: colors.background, opacity: 0.85 }}
            >
              {cartCount} ITEM{cartCount === 1 ? "" : "S"} · READY TO ORDER
            </Mono>
          </View>
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.background }}
          >
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
