import * as db from "./db";

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  channelId?: string;
};

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

async function sendExpoPush(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("[push] Expo push gateway returned", res.status, body);
    }
  } catch (err) {
    console.warn("[push] failed to deliver to Expo", err);
  }
}

async function notifyUser(
  userId: number,
  payload: { title: string; body: string; data?: Record<string, unknown> },
) {
  const tokens = await db.getPushTokensForUser(userId);
  if (tokens.length === 0) return;

  await sendExpoPush(
    tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: "default" as const,
    })),
  );
}

export async function notifyProviderNewOrder(
  providerId: number,
  orderId: number,
  totalPrice: string,
) {
  await notifyUser(providerId, {
    title: "New order received",
    body: `Order #${orderId} · $${totalPrice}`,
    data: { type: "order:new", orderId },
  });
}

export async function notifyProviderOrderCancelled(providerId: number, orderId: number) {
  await notifyUser(providerId, {
    title: "Order cancelled",
    body: `Order #${orderId} was cancelled by the buyer.`,
    data: { type: "order:cancelled", orderId },
  });
}

export async function notifyBuyerStatusChange(
  buyerId: number,
  orderId: number,
  status: string,
) {
  const label =
    status === "confirmed"
      ? "Order confirmed"
      : status === "ready"
        ? "Order ready"
        : status === "delivered"
          ? "Order delivered"
          : status === "cancelled"
            ? "Order cancelled"
            : "Order update";

  await notifyUser(buyerId, {
    title: label,
    body: `Order #${orderId} is now ${status}.`,
    data: { type: "order:status", orderId, status },
  });
}
