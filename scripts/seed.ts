/**
 * Seed sample data for local testing.
 *
 * Usage (inside the dev container):
 *   pnpm seed
 *
 * Idempotent: existing phones are reused; existing categories/products by the
 * same provider+name are skipped. Safe to re-run.
 */

import "dotenv/config";

import { hashPassword } from "../server/_core/auth";
import * as db from "../server/db";

type Role = "buyer" | "provider";

type SeedAccount = {
  phone: string;
  password: string;
  name: string;
  userType: Role;
  businessName: string;
  location: string;
  contactPhone: string;
};

type SeedCatalog = {
  providerPhone: string;
  categories: { name: string; products: { name: string; price: string; qty: number; desc?: string }[] }[];
};

const ACCOUNTS: SeedAccount[] = [
  {
    phone: "1000000001",
    password: "pass1234",
    name: "Amine Ben Salah",
    userType: "provider",
    businessName: "Fresh Farms Co.",
    location: "Tunis – La Marsa",
    contactPhone: "1000000001",
  },
  {
    phone: "1000000002",
    password: "pass1234",
    name: "Leila Trabelsi",
    userType: "provider",
    businessName: "Daily Dairy",
    location: "Sousse – Centre",
    contactPhone: "1000000002",
  },
  {
    phone: "1000000003",
    password: "pass1234",
    name: "Karim Haddad",
    userType: "provider",
    businessName: "Haddad Bakery",
    location: "Sfax – Route Tunis",
    contactPhone: "1000000003",
  },
  {
    phone: "2000000001",
    password: "pass1234",
    name: "Mehdi Cherif",
    userType: "buyer",
    businessName: "Corner Grocer",
    location: "Tunis – El Menzah",
    contactPhone: "2000000001",
  },
  {
    phone: "2000000002",
    password: "pass1234",
    name: "Sonia Mansour",
    userType: "buyer",
    businessName: "Mini Market Mansour",
    location: "Tunis – Lac 2",
    contactPhone: "2000000002",
  },
];

const CATALOG: SeedCatalog[] = [
  {
    providerPhone: "1000000001",
    categories: [
      {
        name: "Vegetables",
        products: [
          { name: "Tomatoes (1 kg)", price: "2.50", qty: 80, desc: "Field-ripened, picked daily." },
          { name: "Onions (5 kg sack)", price: "9.00", qty: 30 },
          { name: "Bell peppers (1 kg)", price: "3.20", qty: 45 },
          { name: "Carrots (1 kg)", price: "1.80", qty: 60 },
        ],
      },
      {
        name: "Fruits",
        products: [
          { name: "Oranges (3 kg)", price: "6.50", qty: 25 },
          { name: "Bananas (1 kg)", price: "3.00", qty: 50 },
          { name: "Apples (2 kg)", price: "7.50", qty: 35 },
        ],
      },
    ],
  },
  {
    providerPhone: "1000000002",
    categories: [
      {
        name: "Milk & cream",
        products: [
          { name: "Fresh milk 1L", price: "1.40", qty: 120 },
          { name: "Heavy cream 250ml", price: "2.80", qty: 50 },
          { name: "Plain yogurt 6-pack", price: "4.50", qty: 40 },
        ],
      },
      {
        name: "Cheese",
        products: [
          { name: "Local feta 250g", price: "5.50", qty: 30 },
          { name: "Mozzarella 200g", price: "4.20", qty: 35 },
          { name: "Aged cheddar 200g", price: "6.90", qty: 20 },
        ],
      },
    ],
  },
  {
    providerPhone: "1000000003",
    categories: [
      {
        name: "Bread",
        products: [
          { name: "Baguette (10 pcs)", price: "3.00", qty: 80, desc: "Baked twice daily." },
          { name: "Whole wheat loaf", price: "2.20", qty: 40 },
          { name: "Pita (10 pcs)", price: "2.80", qty: 60 },
        ],
      },
      {
        name: "Pastries",
        products: [
          { name: "Croissant (12 pcs)", price: "9.50", qty: 25 },
          { name: "Mille-feuille (6 pcs)", price: "12.00", qty: 15 },
        ],
      },
    ],
  },
];

async function ensureAccount(account: SeedAccount): Promise<number> {
  const existing = await db.getUserByPhone(account.phone);
  let userId: number;

  if (existing) {
    userId = existing.id;
    console.log(`  · user ${account.phone} (${account.businessName}) — exists, id=${userId}`);
  } else {
    const passwordHash = await hashPassword(account.password);
    userId = await db.createUser({
      phone: account.phone,
      passwordHash,
      name: account.name,
    });
    console.log(`  + user ${account.phone} (${account.businessName}) — created, id=${userId}`);
  }

  const profile = await db.getUserProfile(userId);
  if (!profile) {
    await db.createUserProfile({
      userId,
      userType: account.userType,
      businessName: account.businessName,
      location: account.location,
      contactPhone: account.contactPhone,
    });
    console.log(`    + profile (${account.userType}) created`);
  }

  return userId;
}

async function ensureCategory(providerId: number, name: string): Promise<number> {
  const existing = await db.listProviderCategories(providerId);
  const found = existing.find((c) => c.name === name);
  if (found) return found.id;

  const id = await db.createCategory({ providerId, name });
  console.log(`    + category "${name}"`);
  return id;
}

async function ensureProduct(
  providerId: number,
  categoryId: number,
  product: { name: string; price: string; qty: number; desc?: string },
) {
  const all = await db.getProviderProducts(providerId);
  const found = all.find((p) => p.name === product.name);
  if (found) return found.id;

  await db.createProduct({
    providerId,
    categoryId,
    name: product.name,
    description: product.desc ?? null,
    price: product.price,
    quantity: product.qty,
    inStock: true,
  });
  console.log(`      + product "${product.name}"`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — aborting seed.");
    process.exit(1);
  }

  const phoneToId = new Map<string, number>();

  console.log("\n== seeding accounts ==");
  for (const account of ACCOUNTS) {
    const id = await ensureAccount(account);
    phoneToId.set(account.phone, id);
  }

  console.log("\n== seeding catalogs ==");
  for (const cat of CATALOG) {
    const providerId = phoneToId.get(cat.providerPhone);
    if (!providerId) continue;
    console.log(`  provider ${cat.providerPhone} (id=${providerId})`);
    for (const category of cat.categories) {
      const categoryId = await ensureCategory(providerId, category.name);
      for (const product of category.products) {
        await ensureProduct(providerId, categoryId, product);
      }
    }
  }

  console.log("\n== seeding sample address for buyer #1 ==");
  const buyer1 = phoneToId.get("2000000001");
  if (buyer1) {
    const addresses = await db.listBuyerAddresses(buyer1);
    if (addresses.length === 0) {
      await db.createBuyerAddress({
        buyerId: buyer1,
        label: "Shop",
        address: "Corner Grocer, 12 Rue de Marseille, Tunis",
        isDefault: true,
      });
      console.log("  + default address added");
    } else {
      console.log("  · addresses already present, skipping");
    }
  }

  console.log("\n✅ seed complete\n");
  console.log("Test accounts (all share password: pass1234):");
  for (const a of ACCOUNTS) {
    console.log(`  ${a.userType.padEnd(8)} ${a.phone}  →  ${a.businessName}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
