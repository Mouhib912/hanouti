import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";
import type { User } from "../drizzle/schema";

vi.mock("../server/db", () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  listProviderCategories: vi.fn(),
  getProviderCategory: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getCategory: vi.fn(),
  getAllProducts: vi.fn(),
  getProviderProducts: vi.fn(),
  getProduct: vi.fn(),
  getProductsByIds: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  listProviders: vi.fn(),
  getProviderById: vi.fn(),
  getProviderOrders: vi.fn(),
  getBuyerOrders: vi.fn(),
  getOrder: vi.fn(),
  checkoutProvider: vi.fn(),
  reorderToCart: vi.fn(),
  updateOrderStatus: vi.fn(),
  getBuyerCart: vi.fn(),
  getBuyerCartDetailed: vi.fn(),
  addToCart: vi.fn(),
  getCartItemOwner: vi.fn(),
  updateCartItem: vi.fn(),
  removeFromCart: vi.fn(),
  clearCart: vi.fn(),
  upsertPushToken: vi.fn(),
  getPushTokensForUser: vi.fn(),
  removePushToken: vi.fn(),
  listBuyerAddresses: vi.fn(),
  createBuyerAddress: vi.fn(),
  setDefaultBuyerAddress: vi.fn(),
  deleteBuyerAddress: vi.fn(),
}));

vi.mock("../server/push", () => ({
  notifyProviderNewOrder: vi.fn().mockResolvedValue(undefined),
  notifyBuyerStatusChange: vi.fn().mockResolvedValue(undefined),
  notifyProviderOrderCancelled: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "../server/db";
import * as push from "../server/push";
import { appRouter } from "../server/routers";

const dbMock = db as unknown as Record<keyof typeof db, ReturnType<typeof vi.fn>>;
const pushMock = push as unknown as Record<keyof typeof push, ReturnType<typeof vi.fn>>;

function makeCtx(userId = 42): TrpcContext {
  const user = {
    id: userId,
    phone: "5550001234",
    passwordHash: "argon2-placeholder",
    name: "Test User",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as unknown as User;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("orders.checkoutProvider", () => {
  it("notifies the provider once the order is placed", async () => {
    dbMock.checkoutProvider.mockResolvedValue(101);
    dbMock.getOrder.mockResolvedValue({
      id: 101,
      buyerId: 42,
      providerId: 7,
      totalPrice: "29.50",
      status: "pending",
      items: [],
      deliveryAddress: "123 Main",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx(42));
    const orderId = await caller.orders.checkoutProvider({
      providerId: 7,
      deliveryAddress: "123 Main",
    });

    expect(orderId).toBe(101);
    expect(dbMock.checkoutProvider).toHaveBeenCalledWith(42, 7, "123 Main", null);
    // wait a microtask so the fire-and-forget notify resolves
    await new Promise((r) => setImmediate(r));
    expect(pushMock.notifyProviderNewOrder).toHaveBeenCalledWith(7, 101, "29.50");
  });
});

describe("orders.updateStatus", () => {
  it("notifies the buyer when the provider transitions status", async () => {
    dbMock.getOrder.mockResolvedValue({
      id: 7,
      buyerId: 100,
      providerId: 42,
      status: "pending",
      totalPrice: "5.00",
      items: [],
      deliveryAddress: "",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    dbMock.updateOrderStatus.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx(42));
    await caller.orders.updateStatus({ id: 7, status: "confirmed" });

    await new Promise((r) => setImmediate(r));
    expect(dbMock.updateOrderStatus).toHaveBeenCalledWith(7, "confirmed");
    expect(pushMock.notifyBuyerStatusChange).toHaveBeenCalledWith(100, 7, "confirmed");
  });

  it("rejects when the caller does not own the order as a provider", async () => {
    dbMock.getOrder.mockResolvedValue({
      id: 7,
      buyerId: 100,
      providerId: 999,
      status: "pending",
      totalPrice: "5.00",
      items: [],
      deliveryAddress: "",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx(42));
    await expect(
      caller.orders.updateStatus({ id: 7, status: "confirmed" }),
    ).rejects.toThrow(/Order not found/);
    expect(dbMock.updateOrderStatus).not.toHaveBeenCalled();
  });
});

describe("orders.reorder", () => {
  it("delegates to reorderToCart with caller id", async () => {
    dbMock.reorderToCart.mockResolvedValue({ added: 2, skipped: 1 });

    const caller = appRouter.createCaller(makeCtx(42));
    const result = await caller.orders.reorder({ id: 17 });

    expect(result).toEqual({ added: 2, skipped: 1 });
    expect(dbMock.reorderToCart).toHaveBeenCalledWith(42, 17);
  });
});

describe("addresses", () => {
  it("creates an address using the caller's id", async () => {
    dbMock.createBuyerAddress.mockResolvedValue(11);

    const caller = appRouter.createCaller(makeCtx(42));
    const id = await caller.addresses.create({
      label: "Shop",
      address: "1 Market St",
      isDefault: true,
    });

    expect(id).toBe(11);
    expect(dbMock.createBuyerAddress).toHaveBeenCalledWith({
      buyerId: 42,
      label: "Shop",
      address: "1 Market St",
      isDefault: true,
    });
  });

  it("defaults isDefault to false when not provided", async () => {
    dbMock.createBuyerAddress.mockResolvedValue(12);
    const caller = appRouter.createCaller(makeCtx(42));
    await caller.addresses.create({ label: "Home", address: "X" });
    expect(dbMock.createBuyerAddress).toHaveBeenCalledWith({
      buyerId: 42,
      label: "Home",
      address: "X",
      isDefault: false,
    });
  });
});

describe("pushTokens.register", () => {
  it("upserts the token under the caller's id", async () => {
    dbMock.upsertPushToken.mockResolvedValue(3);
    const caller = appRouter.createCaller(makeCtx(42));
    const id = await caller.pushTokens.register({
      token: "ExponentPushToken[abc]",
      platform: "ios",
    });
    expect(id).toBe(3);
    expect(dbMock.upsertPushToken).toHaveBeenCalledWith(42, "ExponentPushToken[abc]", "ios");
  });
});

describe("pushTokens.unregister", () => {
  it("scopes the delete to the caller's id", async () => {
    dbMock.removePushToken.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(42));
    await caller.pushTokens.unregister({ token: "ExponentPushToken[abc]" });
    expect(dbMock.removePushToken).toHaveBeenCalledWith(42, "ExponentPushToken[abc]");
  });
});

describe("cart.add", () => {
  it("refuses to add an out-of-stock product", async () => {
    dbMock.getProduct.mockResolvedValue({
      id: 5,
      providerId: 7,
      categoryId: 1,
      name: "Mystery",
      description: null,
      price: "1.00",
      imageUrl: null,
      inStock: false,
      quantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeCtx(42));
    await expect(caller.cart.add({ productId: 5, quantity: 1 })).rejects.toThrow(
      /out of stock/i,
    );
    expect(dbMock.addToCart).not.toHaveBeenCalled();
  });

  it("refuses to add a product that does not exist", async () => {
    dbMock.getProduct.mockResolvedValue(null);
    const caller = appRouter.createCaller(makeCtx(42));
    await expect(caller.cart.add({ productId: 999, quantity: 1 })).rejects.toThrow(
      /not found/i,
    );
  });
});

describe("categories.delete", () => {
  it("delegates to deleteCategory with caller's id as providerId", async () => {
    dbMock.deleteCategory.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(42));
    await caller.categories.delete({ id: 10 });
    expect(dbMock.deleteCategory).toHaveBeenCalledWith(10, 42);
  });
});

describe("orders.cancelByBuyer", () => {
  it("cancels a pending order owned by the caller and notifies the provider", async () => {
    dbMock.getOrder.mockResolvedValue({
      id: 31,
      buyerId: 42,
      providerId: 9,
      status: "pending",
      totalPrice: "10.00",
      items: [],
      deliveryAddress: "",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    dbMock.updateOrderStatus.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeCtx(42));
    await caller.orders.cancelByBuyer({ id: 31 });

    await new Promise((r) => setImmediate(r));
    expect(dbMock.updateOrderStatus).toHaveBeenCalledWith(31, "cancelled");
    expect(pushMock.notifyProviderOrderCancelled).toHaveBeenCalledWith(9, 31);
  });

  it("refuses to cancel an order owned by someone else", async () => {
    dbMock.getOrder.mockResolvedValue({
      id: 31,
      buyerId: 99,
      providerId: 9,
      status: "pending",
      totalPrice: "10.00",
      items: [],
      deliveryAddress: "",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx(42));
    await expect(caller.orders.cancelByBuyer({ id: 31 })).rejects.toThrow(/not found/i);
    expect(dbMock.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("refuses to cancel an order that's no longer pending", async () => {
    dbMock.getOrder.mockResolvedValue({
      id: 31,
      buyerId: 42,
      providerId: 9,
      status: "confirmed",
      totalPrice: "10.00",
      items: [],
      deliveryAddress: "",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeCtx(42));
    await expect(caller.orders.cancelByBuyer({ id: 31 })).rejects.toThrow(/pending/i);
    expect(dbMock.updateOrderStatus).not.toHaveBeenCalled();
  });
});
