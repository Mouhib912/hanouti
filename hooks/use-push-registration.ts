import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { trpc } from "@/lib/trpc";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function openOrderFromNotification(data: unknown) {
  if (!data || typeof data !== "object") return;
  const payload = data as { orderId?: number | string };
  const orderId = Number(payload.orderId);
  if (!orderId) return;
  router.push(`/order/${orderId}`);
}

export function usePushRegistration(enabled: boolean) {
  const register = trpc.pushTokens.register.useMutation();
  const attempted = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openOrderFromNotification(response.notification.request.content.data);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openOrderFromNotification(response.notification.request.content.data);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled) {
      attempted.current = false;
      return;
    }
    if (attempted.current) return;
    if (Platform.OS === "web") return;
    attempted.current = true;

    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (status !== "granted") {
          const { status: requested } = await Notifications.requestPermissionsAsync();
          status = requested;
        }
        if (status !== "granted") return;

        const projectId =
          (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
            ?.projectId ?? Constants.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );

        register.mutate({
          token: tokenData.data,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
      } catch (err) {
        console.warn("[push] registration skipped", err);
      }
    })();
  }, [enabled, register]);
}
