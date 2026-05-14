/**
 * Seed sample data for local testing — Tunisian B2B grocery marketplace.
 *
 * Usage (inside the dev container):
 *   pnpm seed
 *
 * Idempotent: existing phones are reused; existing categories/products by the
 * same provider+name are skipped. Safe to re-run.
 *
 * All phone numbers are 8-digit Tunisian mobile/landline format.
 * All prices are in Tunisian Dinar (TND), decimal(10,2) → 2 fraction digits.
 */

import "dotenv/config";

import { hashPassword } from "../server/_core/auth";
import * as db from "../server/db";

type Role = "buyer" | "provider";

type SeedAccount = {
  phone: string; // 8-digit Tunisian
  password: string;
  name: string;
  userType: Role;
  businessName: string;
  location: string;
  contactPhone: string;
};

type SeedProduct = {
  name: string;
  price: string; // TND
  qty: number;
  desc?: string;
};

type SeedCategory = {
  name: string;
  products: SeedProduct[];
};

type SeedCatalog = {
  providerPhone: string;
  categories: SeedCategory[];
};

const ACCOUNTS: SeedAccount[] = [
  // PROVIDERS — 5 suppliers across Tunisia
  {
    phone: "22100001",
    password: "pass1234",
    name: "Amine Ben Salah",
    userType: "provider",
    businessName: "Sahara Fresh Légumes",
    location: "Tunis – La Marsa",
    contactPhone: "22100001",
  },
  {
    phone: "50200002",
    password: "pass1234",
    name: "Leïla Trabelsi",
    userType: "provider",
    businessName: "Délice Distribution",
    location: "Sousse – Khezama",
    contactPhone: "50200002",
  },
  {
    phone: "98300003",
    password: "pass1234",
    name: "Karim Haddad",
    userType: "provider",
    businessName: "Boulangerie Haddad",
    location: "Sfax – Route Tunis km 4",
    contactPhone: "98300003",
  },
  {
    phone: "23400004",
    password: "pass1234",
    name: "Fatma Jendoubi",
    userType: "provider",
    businessName: "Oléa Méditerranée",
    location: "Nabeul – Béni Khalled",
    contactPhone: "23400004",
  },
  {
    phone: "55500005",
    password: "pass1234",
    name: "Sami Gharbi",
    userType: "provider",
    businessName: "Épicerie Centrale du Sud",
    location: "Gabès – Centre-ville",
    contactPhone: "55500005",
  },

  // BUYERS — 4 grocery shops
  {
    phone: "26600101",
    password: "pass1234",
    name: "Mehdi Cherif",
    userType: "buyer",
    businessName: "Hanout El Manar",
    location: "Tunis – El Menzah 6",
    contactPhone: "26600101",
  },
  {
    phone: "29700102",
    password: "pass1234",
    name: "Sonia Mansour",
    userType: "buyer",
    businessName: "Mini Market Mansour",
    location: "Tunis – Les Berges du Lac 2",
    contactPhone: "29700102",
  },
  {
    phone: "53800103",
    password: "pass1234",
    name: "Wassim Khelifi",
    userType: "buyer",
    businessName: "Carrefour de Quartier Mahdia",
    location: "Mahdia – Avenue Bourguiba",
    contactPhone: "53800103",
  },
  {
    phone: "94900104",
    password: "pass1234",
    name: "Nadia Bouhlel",
    userType: "buyer",
    businessName: "Souk Bouhlel",
    location: "Bizerte – Zarzouna",
    contactPhone: "94900104",
  },
];

const CATALOG: SeedCatalog[] = [
  // ───────────────────────────────────────────────
  // Sahara Fresh Légumes — produce & farm goods
  // ───────────────────────────────────────────────
  {
    providerPhone: "22100001",
    categories: [
      {
        name: "Légumes frais",
        products: [
          { name: "Tomates Cap Bon (1 kg)", price: "2.20", qty: 120, desc: "Mûries au champ, cueillies du jour." },
          { name: "Oignons rouges (sac 5 kg)", price: "8.50", qty: 40 },
          { name: "Piments verts doux (1 kg)", price: "3.40", qty: 60 },
          { name: "Carottes (1 kg)", price: "1.60", qty: 80 },
          { name: "Pommes de terre Spunta (10 kg)", price: "14.00", qty: 30 },
          { name: "Courgettes (1 kg)", price: "2.80", qty: 70 },
          { name: "Aubergines (1 kg)", price: "2.50", qty: 65 },
        ],
      },
      {
        name: "Fruits de saison",
        products: [
          { name: "Oranges Maltaise (3 kg)", price: "7.50", qty: 50, desc: "Spécialité de Nabeul, sucrées et juteuses." },
          { name: "Bananes (1 kg)", price: "3.20", qty: 80 },
          { name: "Pommes Golden (2 kg)", price: "8.40", qty: 40 },
          { name: "Dattes Deglet Nour (500 g)", price: "9.50", qty: 60, desc: "Récolte du Sud tunisien." },
          { name: "Grenades de Gabès (1 kg)", price: "5.50", qty: 35 },
        ],
      },
      {
        name: "Herbes & aromates",
        products: [
          { name: "Persil frais (botte)", price: "0.80", qty: 100 },
          { name: "Menthe fraîche (botte)", price: "0.80", qty: 100 },
          { name: "Coriandre fraîche (botte)", price: "0.80", qty: 90 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────
  // Délice Distribution — dairy
  // ───────────────────────────────────────────────
  {
    providerPhone: "50200002",
    categories: [
      {
        name: "Lait & crème",
        products: [
          { name: "Lait Délice UHT 1 L", price: "1.45", qty: 200 },
          { name: "Lait Vitalait demi-écrémé 1 L", price: "1.40", qty: 180 },
          { name: "Crème fraîche Délice 200 ml", price: "2.30", qty: 80 },
          { name: "Lait concentré sucré Carnation 397 g", price: "4.20", qty: 60 },
        ],
      },
      {
        name: "Yaourts & desserts",
        products: [
          { name: "Yaourt nature Délice (pack 8)", price: "5.20", qty: 100 },
          { name: "Yaourt aromatisé fraise (pack 4)", price: "3.10", qty: 80 },
          { name: "Lben (lait fermenté) 1 L", price: "1.80", qty: 70, desc: "Traditionnel, à boire frais." },
          { name: "Raïb dessert 125 g (pack 4)", price: "2.90", qty: 60 },
        ],
      },
      {
        name: "Fromages",
        products: [
          { name: "Feta locale 250 g", price: "5.50", qty: 50 },
          { name: "Mozzarella Délice 200 g", price: "4.40", qty: 55 },
          { name: "Vache qui rit (16 portions)", price: "3.80", qty: 90 },
          { name: "Fromage râpé emmental 200 g", price: "6.20", qty: 40 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────
  // Boulangerie Haddad — bakery & pastries
  // ───────────────────────────────────────────────
  {
    providerPhone: "98300003",
    categories: [
      {
        name: "Pain & galettes",
        products: [
          { name: "Baguette française (pack 10)", price: "2.50", qty: 120, desc: "Cuite deux fois par jour." },
          { name: "Pain complet (1 kg)", price: "2.30", qty: 60 },
          { name: "Tabouna traditionnelle (pack 5)", price: "4.50", qty: 80, desc: "Pain cuit au four en argile." },
          { name: "Khobz tounsi (pack 8)", price: "3.20", qty: 90 },
          { name: "Pain pita (pack 10)", price: "2.80", qty: 70 },
        ],
      },
      {
        name: "Viennoiseries",
        products: [
          { name: "Croissants au beurre (pack 12)", price: "10.50", qty: 35 },
          { name: "Pains au chocolat (pack 12)", price: "11.20", qty: 30 },
          { name: "Mille-feuille (pack 6)", price: "12.00", qty: 20 },
          { name: "Makroud aux dattes (500 g)", price: "8.50", qty: 40, desc: "Spécialité du Sud." },
          { name: "Samsa aux amandes (500 g)", price: "9.20", qty: 25 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────
  // Oléa Méditerranée — oils, condiments, preserves
  // ───────────────────────────────────────────────
  {
    providerPhone: "23400004",
    categories: [
      {
        name: "Huiles & vinaigres",
        products: [
          { name: "Huile d'olive vierge extra 1 L", price: "18.50", qty: 80, desc: "Pression à froid, récolte 2025." },
          { name: "Huile d'olive vierge extra 5 L", price: "85.00", qty: 30 },
          { name: "Huile de tournesol 1 L", price: "4.20", qty: 120 },
          { name: "Vinaigre de cidre 500 ml", price: "3.80", qty: 50 },
          { name: "Vinaigre balsamique 250 ml", price: "6.50", qty: 35 },
        ],
      },
      {
        name: "Conserves & condiments",
        products: [
          { name: "Harissa Le Phare du Cap Bon 380 g", price: "3.20", qty: 150, desc: "La référence depuis 1950." },
          { name: "Harissa douce Sicam 400 g", price: "2.80", qty: 130 },
          { name: "Double concentré de tomate Sicam 400 g", price: "2.50", qty: 180 },
          { name: "Olives vertes Cap Bon 350 g", price: "3.90", qty: 90 },
          { name: "Olives noires Kalamata 250 g", price: "4.80", qty: 60 },
          { name: "Câpres au vinaigre 200 g", price: "5.20", qty: 40 },
        ],
      },
      {
        name: "Épices & herbes séchées",
        products: [
          { name: "Tabel tunisien (mélange) 100 g", price: "3.50", qty: 70, desc: "Mélange traditionnel pour couscous." },
          { name: "Cumin moulu 80 g", price: "2.20", qty: 80 },
          { name: "Coriandre moulue 80 g", price: "2.10", qty: 75 },
          { name: "Curcuma moulu 80 g", price: "2.40", qty: 70 },
          { name: "Cannelle bâton (50 g)", price: "3.80", qty: 50 },
          { name: "Safran filaments (1 g)", price: "12.50", qty: 25, desc: "Pur, importé." },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────
  // Épicerie Centrale du Sud — pantry staples
  // ───────────────────────────────────────────────
  {
    providerPhone: "55500005",
    categories: [
      {
        name: "Pâtes & couscous",
        products: [
          { name: "Couscous fin Warda 1 kg", price: "2.80", qty: 200, desc: "Semoule moyenne, cuisson rapide." },
          { name: "Couscous moyen Warda 1 kg", price: "2.80", qty: 180 },
          { name: "Couscous gros Warda 1 kg", price: "2.90", qty: 150 },
          { name: "Spaghetti Warda 500 g", price: "1.65", qty: 220 },
          { name: "Pâtes coquillettes Warda 500 g", price: "1.65", qty: 180 },
          { name: "Macaroni Warda 500 g", price: "1.65", qty: 160 },
        ],
      },
      {
        name: "Riz & légumes secs",
        products: [
          { name: "Riz Basmati Mahmoud 1 kg", price: "5.50", qty: 100 },
          { name: "Riz long grain ordinaire 1 kg", price: "3.20", qty: 140 },
          { name: "Pois chiches secs 1 kg", price: "5.80", qty: 90 },
          { name: "Lentilles vertes 1 kg", price: "5.50", qty: 95 },
          { name: "Haricots blancs secs 1 kg", price: "6.20", qty: 70 },
          { name: "Fèves sèches 1 kg", price: "4.80", qty: 65 },
        ],
      },
      {
        name: "Boissons",
        products: [
          { name: "Eau minérale Aïn Garci 1.5 L (pack 6)", price: "4.50", qty: 100 },
          { name: "Eau minérale Cristal 1.5 L (pack 6)", price: "4.20", qty: 110 },
          { name: "Boga Cidre 1 L", price: "1.90", qty: 80, desc: "Soda local, recette historique." },
          { name: "Boga Citron 1 L", price: "1.90", qty: 80 },
          { name: "Jus d'orange Vitalait 1 L", price: "3.50", qty: 90 },
          { name: "Thé vert Cosmos 100 g", price: "4.20", qty: 70 },
          { name: "Café Bondin moulu 250 g", price: "9.80", qty: 60, desc: "Torréfaction tunisienne." },
        ],
      },
      {
        name: "Sucres & confiseries",
        products: [
          { name: "Sucre cristal 1 kg", price: "2.40", qty: 200 },
          { name: "Sucre en poudre 1 kg", price: "2.60", qty: 150 },
          { name: "Miel de thym (500 g)", price: "28.00", qty: 30, desc: "Récolte montagne." },
          { name: "Chocolat Saïda noir 100 g", price: "3.50", qty: 110 },
          { name: "Chamia Mahdia 400 g", price: "8.50", qty: 50, desc: "Halva traditionnelle au sésame." },
        ],
      },
      {
        name: "Hygiène & ménage",
        products: [
          { name: "Savon de Marseille Sevena 200 g", price: "2.20", qty: 150 },
          { name: "Lessive Sapeco 3 kg", price: "16.50", qty: 60 },
          { name: "Eau de Javel Sapeco 1 L", price: "1.80", qty: 120 },
          { name: "Liquide vaisselle Wax 1 L", price: "3.40", qty: 90 },
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
  product: SeedProduct,
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
  console.log(`      + product "${product.name}" — ${product.price} DT`);
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

  console.log("\n== seeding sample addresses for buyers ==");
  const buyerAddresses: { phone: string; label: string; address: string }[] = [
    { phone: "26600101", label: "Boutique", address: "Hanout El Manar, 12 Rue Khartoum, El Menzah 6, Tunis" },
    { phone: "29700102", label: "Magasin", address: "Mini Market Mansour, Av. de la Bourse, Les Berges du Lac 2, Tunis" },
    { phone: "53800103", label: "Carrefour", address: "Avenue Habib Bourguiba, Mahdia 5100" },
    { phone: "94900104", label: "Souk", address: "Rue de l'Indépendance, Zarzouna, Bizerte 7021" },
  ];
  for (const addr of buyerAddresses) {
    const buyerId = phoneToId.get(addr.phone);
    if (!buyerId) continue;
    const existing = await db.listBuyerAddresses(buyerId);
    if (existing.length === 0) {
      await db.createBuyerAddress({
        buyerId,
        label: addr.label,
        address: addr.address,
        isDefault: true,
      });
      console.log(`  + address for ${addr.phone}: ${addr.label}`);
    } else {
      console.log(`  · ${addr.phone} already has addresses, skipping`);
    }
  }

  console.log("\n✅ seed complete\n");
  console.log("Test accounts (all share password: pass1234):");
  for (const a of ACCOUNTS) {
    console.log(`  ${a.userType.padEnd(8)} ${a.phone}  →  ${a.businessName} — ${a.location}`);
  }
  console.log("");

  process.exit(0);
}

main().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
