import { z } from "zod";
import {
  COOKIE_NAME,
  canTransitionOrderStatus,
  type OrderStatusValue,
} from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import {
  notifyBuyerStatusChange,
  notifyProviderNewOrder,
  notifyProviderOrderCancelled,
} from "./push";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // User Profile Routes
  profile: router({
    get: protectedProcedure.query(({ ctx }) => db.getUserProfile(ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          userType: z.enum(["provider", "buyer"]),
          businessName: z.string().min(1),
          location: z.string().optional(),
          contactPhone: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        db.createUserProfile({
          userId: ctx.user.id,
          ...input,
        })
      ),
    update: protectedProcedure
      .input(
        z.object({
          businessName: z.string().optional(),
          location: z.string().optional(),
          contactPhone: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => db.updateUserProfile(ctx.user.id, input)),
  }),

  // Category Routes (per-provider)
  categories: router({
    listMine: protectedProcedure.query(({ ctx }) => db.listProviderCategories(ctx.user.id)),
    listByProvider: publicProcedure
      .input(z.object({ providerId: z.number() }))
      .query(({ input }) => db.listProviderCategories(input.providerId)),
    create: protectedProcedure
      .input(z.object({ name: z.string().trim().min(1).max(100) }))
      .mutation(({ ctx, input }) =>
        db.createCategory({ providerId: ctx.user.id, name: input.name }),
      ),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().trim().min(1).max(100) }))
      .mutation(({ ctx, input }) => db.updateCategory(input.id, ctx.user.id, input.name)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteCategory(input.id, ctx.user.id)),
  }),

  // Product Routes
  products: router({
    list: publicProcedure.query(() => db.getAllProducts()),
    byProvider: publicProcedure
      .input(z.object({ providerId: z.number() }))
      .query(({ input }) => db.getProviderProducts(input.providerId)),
    listMine: protectedProcedure.query(({ ctx }) => db.getProviderProducts(ctx.user.id)),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getProduct(input.id)),
    byIds: publicProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).max(200) }))
      .query(({ input }) => db.getProductsByIds(input.ids)),
    search: publicProcedure
      .input(z.object({ q: z.string().trim().min(2).max(80) }))
      .query(({ input }) => db.searchProducts(input.q, 30)),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          categoryId: z.number().int().positive(),
          price: z.string().min(1),
          imageUrl: z.string().nullable().optional(),
          inStock: z.boolean().default(true),
          quantity: z.number().int().min(0).default(0),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const cat = await db.getCategory(input.categoryId);
        if (!cat || cat.providerId !== ctx.user.id) {
          throw new Error("Invalid category");
        }
        return db.createProduct({ providerId: ctx.user.id, ...input });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          categoryId: z.number().int().positive().optional(),
          price: z.string().optional(),
          imageUrl: z.string().nullable().optional(),
          inStock: z.boolean().optional(),
          quantity: z.number().int().min(0).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getProduct(input.id);
        if (!existing || existing.providerId !== ctx.user.id) {
          throw new Error("Product not found");
        }
        if (input.categoryId !== undefined) {
          const cat = await db.getCategory(input.categoryId);
          if (!cat || cat.providerId !== ctx.user.id) {
            throw new Error("Invalid category");
          }
        }
        const { id, ...rest } = input;
        return db.updateProduct(id, rest);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getProduct(input.id);
        if (!existing || existing.providerId !== ctx.user.id) {
          throw new Error("Product not found");
        }
        return db.deleteProduct(input.id);
      }),
  }),

  // Provider directory (public)
  providers: router({
    list: publicProcedure.query(() => db.listProviders()),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getProviderById(input.id)),
  }),

  // Order Routes
  orders: router({
    listProvider: protectedProcedure.query(({ ctx }) => db.getProviderOrders(ctx.user.id)),
    listBuyer: protectedProcedure.query(({ ctx }) => db.getBuyerOrders(ctx.user.id)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const order = await db.getOrderWithParties(input.id);
        if (!order || (order.buyerId !== ctx.user.id && order.providerId !== ctx.user.id)) {
          throw new Error("Order not found");
        }
        return order;
      }),
    checkoutProvider: protectedProcedure
      .input(
        z.object({
          providerId: z.number().int().positive(),
          deliveryAddress: z.string().trim().min(1).max(2000),
          notes: z.string().trim().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orderId = await db.checkoutProvider(
          ctx.user.id,
          input.providerId,
          input.deliveryAddress,
          input.notes ?? null,
        );
        const order = await db.getOrder(orderId);
        if (order) {
          notifyProviderNewOrder(input.providerId, orderId, String(order.totalPrice)).catch(
            (err) => console.warn("[push] notifyProviderNewOrder", err),
          );
        }
        return orderId;
      }),
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "confirmed", "ready", "delivered", "cancelled"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const order = await db.getOrder(input.id);
        if (!order || order.providerId !== ctx.user.id) {
          throw new Error("Order not found");
        }
        const current = order.status as OrderStatusValue;
        if (current === input.status) return;
        if (!canTransitionOrderStatus(current, input.status)) {
          throw new Error(`Cannot move order from ${current} to ${input.status}`);
        }
        await db.updateOrderStatus(input.id, input.status);
        notifyBuyerStatusChange(order.buyerId, input.id, input.status).catch((err) =>
          console.warn("[push] notifyBuyerStatusChange", err),
        );
      }),
    reorder: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.reorderToCart(ctx.user.id, input.id)),
    cancelByBuyer: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const order = await db.getOrder(input.id);
        if (!order || order.buyerId !== ctx.user.id) {
          throw new Error("Order not found");
        }
        if (order.status !== "pending") {
          throw new Error("Order can only be cancelled while still pending");
        }
        await db.updateOrderStatus(input.id, "cancelled");
        notifyProviderOrderCancelled(order.providerId, input.id).catch((err) =>
          console.warn("[push] notifyProviderOrderCancelled", err),
        );
      }),
  }),

  // Cart Routes
  cart: router({
    list: protectedProcedure.query(({ ctx }) => db.getBuyerCart(ctx.user.id)),
    detailed: protectedProcedure.query(({ ctx }) => db.getBuyerCartDetailed(ctx.user.id)),
    add: protectedProcedure
      .input(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.number().int().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const product = await db.getProduct(input.productId);
        if (!product) throw new Error("Product not found");
        if (!product.inStock) throw new Error("Product is out of stock");
        return db.addToCart({ buyerId: ctx.user.id, ...input });
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          quantity: z.number().int().min(0),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const owned = await db.getCartItemOwner(input.id);
        if (owned !== ctx.user.id) throw new Error("Cart item not found");
        return db.updateCartItem(input.id, input.quantity);
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const owned = await db.getCartItemOwner(input.id);
        if (owned !== ctx.user.id) throw new Error("Cart item not found");
        return db.removeFromCart(input.id);
      }),
    clear: protectedProcedure.mutation(({ ctx }) => db.clearCart(ctx.user.id)),
  }),

  // Push token registration (one row per device per user)
  pushTokens: router({
    register: protectedProcedure
      .input(
        z.object({
          token: z.string().min(1).max(255),
          platform: z.enum(["ios", "android", "web"]),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.upsertPushToken(ctx.user.id, input.token, input.platform),
      ),
    unregister: protectedProcedure
      .input(z.object({ token: z.string().min(1).max(255) }))
      .mutation(({ ctx, input }) => db.removePushToken(ctx.user.id, input.token)),
  }),

  // Buyer saved addresses
  addresses: router({
    list: protectedProcedure.query(({ ctx }) => db.listBuyerAddresses(ctx.user.id)),
    create: protectedProcedure
      .input(
        z.object({
          label: z.string().trim().min(1).max(80),
          address: z.string().trim().min(1).max(2000),
          isDefault: z.boolean().optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        db.createBuyerAddress({
          buyerId: ctx.user.id,
          label: input.label,
          address: input.address,
          isDefault: input.isDefault ?? false,
        }),
      ),
    setDefault: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.setDefaultBuyerAddress(ctx.user.id, input.id)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.deleteBuyerAddress(ctx.user.id, input.id)),
  }),
});

export type AppRouter = typeof appRouter;
