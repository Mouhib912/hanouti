import { eq, and, inArray, isNull, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userProfiles,
  categories,
  products,
  orders,
  cartItems,
  buyerAddresses,
  pushTokens,
  InsertUserProfile,
  InsertCategory,
  InsertProduct,
  InsertOrder,
  InsertCartItem,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

function lastInsertId(result: unknown): number {
  // Drizzle MySQL2 returns [ResultSetHeader, FieldPacket[]]
  const header = Array.isArray(result) ? result[0] : result;
  const id = (header as { insertId?: number })?.insertId;
  if (typeof id !== "number" || id <= 0) {
    throw new Error("Insert succeeded but no insertId returned");
  }
  return id;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function createUser(user: InsertUser): Promise<number> {
  if (!user.phone || !user.passwordHash) {
    throw new Error("phone and passwordHash are required");
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(users).values({
    ...user,
    lastSignedIn: user.lastSignedIn ?? new Date(),
  });
  const created = await getUserByPhone(user.phone);
  if (!created) throw new Error("User insert succeeded but lookup failed");
  return created.id;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listProviders() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(eq(userProfiles.userType, "provider"), isNull(users.deletedAt)));
  return rows.map(({ users: u, userProfiles: p }) => ({
    id: u.id,
    name: u.name,
    businessName: p.businessName,
    location: p.location,
    rating: p.rating,
  }));
}

export async function getProviderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(
      and(
        eq(users.id, id),
        eq(userProfiles.userType, "provider"),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  if (rows.length === 0) return undefined;
  const { users: u, userProfiles: p } = rows[0];
  return {
    id: u.id,
    name: u.name,
    businessName: p.businessName,
    location: p.location,
    rating: p.rating,
  };
}

export async function getUserWithProfile(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, id))
    .limit(1);
  if (rows.length === 0) return undefined;
  const { users: user, userProfiles: profile } = rows[0];
  return { ...user, profile: profile ?? null };
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result[0];
}

export async function softDeleteUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ deletedAt: new Date(), phone: `deleted_${userId}_${Date.now()}` })
    .where(eq(users.id, userId));

  await db.delete(cartItems).where(eq(cartItems.buyerId, userId));
  await db.delete(buyerAddresses).where(eq(buyerAddresses.buyerId, userId));
  await db.delete(pushTokens).where(eq(pushTokens.userId, userId));
}

export async function setUserPassword(id: number, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

export async function touchLastSignedIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

/**
 * USER PROFILE FUNCTIONS
 */

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createUserProfile(data: InsertUserProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const _result = await db.insert(userProfiles).values(data);
  return lastInsertId(_result);
}

export async function updateUserProfile(userId: number, data: Partial<InsertUserProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
}

/**
 * CATEGORY FUNCTIONS (per-provider)
 */

export async function listProviderCategories(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.providerId, providerId));
}

export async function getCategory(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0];
}

export async function createCategory(data: InsertCategory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const _result = await db.insert(categories).values(data);
  return lastInsertId(_result);
}

export async function updateCategory(id: number, providerId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(categories)
    .set({ name })
    .where(and(eq(categories.id, id), eq(categories.providerId, providerId)));
}

export async function deleteCategory(id: number, providerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const inUse = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.categoryId, id))
    .limit(1);
  if (inUse.length > 0) {
    throw new Error("Category is in use by one or more products");
  }
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.providerId, providerId)));
}

/**
 * PRODUCT FUNCTIONS
 */

export async function getProviderProducts(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(products).where(eq(products.providerId, providerId));
}

export async function getProduct(productId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getProductsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(inArray(products.id, ids));
}

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(products);
}

export async function searchProducts(query: string, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const trimmed = query.trim();
  if (!trimmed) return [];
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      imageUrl: products.imageUrl,
      inStock: products.inStock,
      providerId: products.providerId,
      providerBusinessName: userProfiles.businessName,
    })
    .from(products)
    .innerJoin(userProfiles, eq(userProfiles.userId, products.providerId))
    .where(and(like(products.name, `%${trimmed}%`), eq(products.inStock, true)))
    .limit(limit);
  return rows;
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const _result = await db.insert(products).values(data);
  return lastInsertId(_result);
}

export async function updateProduct(productId: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(products).set(data).where(eq(products.id, productId));
}

export async function deleteProduct(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(products).where(eq(products.id, productId));
}

/**
 * ORDER FUNCTIONS
 */

export async function getProviderOrders(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(orders).where(eq(orders.providerId, providerId));
}

export async function getBuyerOrders(buyerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(orders).where(eq(orders.buyerId, buyerId));
}

export async function getOrder(orderId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getOrderWithParties(orderId: number) {
  const db = await getDb();
  if (!db) return null;

  const order = await getOrder(orderId);
  if (!order) return null;

  const [buyer, provider] = await Promise.all([
    db
      .select({
        businessName: userProfiles.businessName,
        contactPhone: userProfiles.contactPhone,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, order.buyerId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        businessName: userProfiles.businessName,
        contactPhone: userProfiles.contactPhone,
        location: userProfiles.location,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, order.providerId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  return { ...order, buyer, provider };
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const _result = await db.insert(orders).values(data);
  return lastInsertId(_result);
}

export async function updateOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(orders).set({ status: status as any }).where(eq(orders.id, orderId));
}

/**
 * CART FUNCTIONS
 */

export async function getBuyerCart(buyerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(cartItems).where(eq(cartItems.buyerId, buyerId));
}

export async function getBuyerCartDetailed(buyerId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .innerJoin(userProfiles, eq(userProfiles.userId, products.providerId))
    .where(eq(cartItems.buyerId, buyerId));
  return rows.map(({ cartItems: c, products: p, userProfiles: prof }) => ({
    cartItemId: c.id,
    quantity: c.quantity,
    productId: p.id,
    productName: p.name,
    price: p.price,
    inStock: p.inStock,
    imageUrl: p.imageUrl,
    providerId: p.providerId,
    providerBusinessName: prof.businessName,
  }));
}

export async function checkoutProvider(
  buyerId: number,
  providerId: number,
  deliveryAddress: string,
  notes: string | null,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const lines = await db
    .select({
      cartItemId: cartItems.id,
      productId: products.id,
      productName: products.name,
      quantity: cartItems.quantity,
      price: products.price,
      providerId: products.providerId,
      inStock: products.inStock,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(and(eq(cartItems.buyerId, buyerId), eq(products.providerId, providerId)));

  if (lines.length === 0) {
    throw new Error("No cart items for this provider");
  }

  const outOfStock = lines.filter((l) => !l.inStock).map((l) => l.productName);
  if (outOfStock.length > 0) {
    const list = outOfStock.slice(0, 3).join(", ");
    const more = outOfStock.length > 3 ? ` and ${outOfStock.length - 3} more` : "";
    throw new Error(`Out of stock: ${list}${more}. Remove from cart to continue.`);
  }

  const items = lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
    price: Number(l.price),
  }));
  const totalPrice = items
    .reduce((sum, i) => sum + i.price * i.quantity, 0)
    .toFixed(2);

  const _orderResult = await db.insert(orders).values({
    buyerId,
    providerId,
    deliveryAddress,
    notes,
    items,
    totalPrice,
  });
  const orderId = lastInsertId(_orderResult);

  await db.delete(cartItems).where(inArray(cartItems.id, lines.map((l) => l.cartItemId)));

  return orderId;
}

export async function reorderToCart(
  buyerId: number,
  orderId: number,
): Promise<{ added: number; skipped: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const order = await getOrder(orderId);
  if (!order || order.buyerId !== buyerId) {
    throw new Error("Order not found");
  }

  let added = 0;
  let skipped = 0;
  for (const line of order.items) {
    const product = await getProduct(line.productId);
    if (!product || !product.inStock) {
      skipped++;
      continue;
    }
    await addToCart({ buyerId, productId: line.productId, quantity: line.quantity });
    added++;
  }
  return { added, skipped };
}

export async function addToCart(data: InsertCartItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if item already in cart
  const existing = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.buyerId, data.buyerId), eq(cartItems.productId, data.productId)))
    .limit(1);

  if (existing.length > 0) {
    // Update quantity
    await db
      .update(cartItems)
      .set({ quantity: existing[0].quantity + data.quantity })
      .where(eq(cartItems.id, existing[0].id));
    return existing[0].id;
  }

  // Add new item
  const _result = await db.insert(cartItems).values(data);
  return lastInsertId(_result);
}

export async function getCartItemOwner(cartItemId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ buyerId: cartItems.buyerId })
    .from(cartItems)
    .where(eq(cartItems.id, cartItemId))
    .limit(1);
  return result[0]?.buyerId ?? null;
}

export async function updateCartItem(cartItemId: number, quantity: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  } else {
    await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, cartItemId));
  }
}

export async function removeFromCart(cartItemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
}

export async function clearCart(buyerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(cartItems).where(eq(cartItems.buyerId, buyerId));
}

/**
 * BUYER ADDRESS FUNCTIONS
 */

export async function listBuyerAddresses(buyerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(buyerAddresses).where(eq(buyerAddresses.buyerId, buyerId));
}

export async function createBuyerAddress(data: {
  buyerId: number;
  label: string;
  address: string;
  isDefault: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.isDefault) {
    await db
      .update(buyerAddresses)
      .set({ isDefault: false })
      .where(eq(buyerAddresses.buyerId, data.buyerId));
  } else {
    const existing = await listBuyerAddresses(data.buyerId);
    if (existing.length === 0) {
      data = { ...data, isDefault: true };
    }
  }

  const _result = await db.insert(buyerAddresses).values(data);
  return lastInsertId(_result);
}

export async function setDefaultBuyerAddress(buyerId: number, addressId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const owned = await db
    .select()
    .from(buyerAddresses)
    .where(and(eq(buyerAddresses.id, addressId), eq(buyerAddresses.buyerId, buyerId)))
    .limit(1);
  if (owned.length === 0) throw new Error("Address not found");

  await db
    .update(buyerAddresses)
    .set({ isDefault: false })
    .where(eq(buyerAddresses.buyerId, buyerId));
  await db
    .update(buyerAddresses)
    .set({ isDefault: true })
    .where(eq(buyerAddresses.id, addressId));
}

export async function deleteBuyerAddress(buyerId: number, addressId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const owned = await db
    .select()
    .from(buyerAddresses)
    .where(and(eq(buyerAddresses.id, addressId), eq(buyerAddresses.buyerId, buyerId)))
    .limit(1);
  if (owned.length === 0) throw new Error("Address not found");

  await db.delete(buyerAddresses).where(eq(buyerAddresses.id, addressId));

  if (owned[0].isDefault) {
    const remaining = await listBuyerAddresses(buyerId);
    if (remaining.length > 0) {
      await db
        .update(buyerAddresses)
        .set({ isDefault: true })
        .where(eq(buyerAddresses.id, remaining[0].id));
    }
  }
}

/**
 * PUSH TOKEN FUNCTIONS
 */

export async function upsertPushToken(
  userId: number,
  token: string,
  platform: "ios" | "android" | "web",
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.token, token))
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].userId !== userId) {
      await db
        .update(pushTokens)
        .set({ userId, platform })
        .where(eq(pushTokens.id, existing[0].id));
    }
    return existing[0].id;
  }

  const _result = await db.insert(pushTokens).values({ userId, token, platform });
  return lastInsertId(_result);
}

export async function getPushTokensForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
}

export async function removePushToken(userId: number, token: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.token, token), eq(pushTokens.userId, userId)));
}
