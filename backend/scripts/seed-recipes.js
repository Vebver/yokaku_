/**
 * Recipe seeding tool
 * ---------------------------------------------------------------------------
 * Bulk-links your existing raw materials to your existing menu items so you
 * never have to author every recipe by hand.
 *
 * SAFE BY DEFAULT: it only PRINTS what it would do. Nothing is written to the
 * database unless you pass --apply.
 *
 *   node scripts/seed-recipes.js            # dry run (shows the plan)
 *   node scripts/seed-recipes.js --apply    # writes to the database
 *
 * How it works:
 *   1. Loads every menu item and every inventory item.
 *   2. For each dish, looks up a starter recipe from the table below, matching
 *      on the dish name.
 *   3. For every ingredient, resolves the raw material by name (fuzzy, so
 *      "Chicken Wings" matches "Chicken Wings (Frozen)").
 *   4. Skips dishes that ALREADY have a recipe, so re-running is safe.
 *   5. Prints a report. With --apply, inserts only the links it resolved.
 *
 * Anything it cannot confidently match is listed under "NEEDS REVIEW" and is
 * left alone. Those are the ones to fix in the admin UI afterwards.
 */

require("dotenv").config();
const db = require("../config/db");

const APPLY = process.argv.includes("--apply");

// ---------------------------------------------------------------------------
// STARTER RECIPES — quantities are PER SERVING, in the raw material's unit.
// These are sensible starting points to review, not gospel. Adjust in the
// admin UI (Inventory -> Receive Stock -> link dishes, or Recipe Manager).
// ---------------------------------------------------------------------------
const RECIPES = {
  // ---- Burgers -------------------------------------------------------------
  "Regular Burger": {
    "Burger Buns": 1,
    "Burger Patty": 1,
    "Burger Cheese Slice": 1,
    Lettuce: 0.03,
    Tomato: 0.03,
    "Cooking Oil": 0.01,
  },
  "Cheese Burger": {
    "Burger Buns": 1,
    "Burger Patty": 1,
    "Burger Cheese Slice": 1,
    Lettuce: 0.03,
    Tomato: 0.03,
    "Cooking Oil": 0.01,
  },
  "Bacon Cheese Burger": {
    "Burger Buns": 1,
    "Burger Patty": 1,
    "Burger Cheese Slice": 2,
    "Bacon Bits": 0.05,
    Lettuce: 0.03,
    Tomato: 0.03,
  },
  "Double Cheese Burger": {
    "Burger Buns": 1,
    "Burger Patty": 2,
    "Burger Cheese Slice": 2,
    "Cooking Oil": 0.01,
  },
  "Special Burger": {
    "Burger Buns": 1,
    "Burger Patty": 1,
    "Burger Cheese Slice": 1,
    "Bacon Bits": 0.05,
    Egg: 1,
    Mayo: 0.02,
  },
  "Monster Burger": {
    "Burger Buns": 1,
    "Burger Patty": 2,
    "Burger Cheese Slice": 2,
    "Bacon Bits": 0.05,
    "Cooking Oil": 0.01,
  },
  Avocado: {
    "Burger Buns": 1,
    "Burger Patty": 1,
    Avocado: 0.15,
    Lettuce: 0.03,
  },

  // ---- Chicken wings -------------------------------------------------------
  "Classic Wings": {
    "Chicken Wings": 0.25,
    Wings: 0.1,
    "Cooking Oil": 0.02,
    Salt: 0.005,
  },
  "Barbeque Wings": {
    "Chicken Wings": 0.25,
    Wings: 0.1,
    "BBQ Sauce": 0.05,
    "Cooking Oil": 0.02,
  },
  "Garlic Mayo Wings": {
    "Chicken Wings": 0.25,
    Wings: 0.1,
    Mayo: 0.04,
    "Garlic Powder": 0.003,
    "Cooking Oil": 0.02,
  },
  "Hot & Spicy Wings": {
    "Chicken Wings": 0.25,
    Wings: 0.1,
    "Hot Sauce": 0.03,
    "Cooking Oil": 0.02,
  },
  "Honey Mustard Wings": {
    "Chicken Wings": 0.25,
    Wings: 0.1,
    "Honey Mustard Sauce": 0.05,
    "Cooking Oil": 0.02,
  },
  "Sweet Chili Wings": {
    "Chicken Wings": 0.25,
    Wings: 0.1,
    "Sweet Chili Sauce": 0.05,
    "Cooking Oil": 0.02,
  },
  "Teriyaki Wings": {
    "Chicken Wings": 0.25,
    Wings: 0.1,
    "Teriyaki Sauce": 0.05,
    "Cooking Oil": 0.02,
  },
  "Sisig Wings": {
    "Chicken Wings": 0.25,
    Wings: 0.1,
    "Sisig Seasoning": 0.01,
    "Cooking Oil": 0.02,
  },
  Unlimited: {
    "Chicken Wings": 0.3,
    Wings: 0.15,
    "Cooking Oil": 0.02,
    "French Fries": 0.1,
  },
  "Unlimited B": {
    "Chicken Wings": 0.3,
    Wings: 0.15,
    "Cooking Oil": 0.02,
    "French Fries": 0.1,
  },

  // ---- Sisig / rice bowls --------------------------------------------------
  "Pork Sisig": {
    "Ground Pork": 0.15,
    "Sisig Seasoning": 0.01,
    Onion: 0.03,
    "Cooking Oil": 0.01,
  },
  "Chicken Sisig": {
    "Chicken Thigh Fillet": 0.15,
    "Sisig Seasoning": 0.01,
    Onion: 0.03,
    "Cooking Oil": 0.01,
  },
  "Tapa Rice Bowl": {
    "Beef Tapa": 0.15,
    Rice: 0.15,
    Egg: 1,
    "Cooking Oil": 0.01,
  },
  "Tocino Rice Bowl": { Tocino: 0.15, Rice: 0.15, Egg: 1, "Cooking Oil": 0.01 },
  "Hotdog Rice Bowl": { Spam: 0.1, Rice: 0.15, Egg: 1, "Cooking Oil": 0.01 },
  "Ham Rice Bowl": { "Ham Slices": 0.08, Rice: 0.15, "Cooking Oil": 0.01 },
  "Spam Rice Bowl": { Spam: 0.1, Rice: 0.15, Egg: 1, "Cooking Oil": 0.01 },

  // ---- Pasta ---------------------------------------------------------------
  Spaghetti: {
    "Spaghetti Pasta": 0.12,
    "Tomato Sauce": 0.1,
    "Parmesan Cheese": 0.01,
    "Italian Seasoning": 0.003,
  },
  Carbonara: {
    "Spaghetti Pasta": 0.12,
    "All-Purpose Cream": 0.08,
    "Bacon Bits": 0.04,
    "Parmesan Cheese": 0.01,
  },
  Bolognese: {
    "Spaghetti Pasta": 0.12,
    "Ground Beef": 0.12,
    "Tomato Sauce": 0.1,
    "Parmesan Cheese": 0.01,
  },
  Pesto: {
    "Spaghetti Pasta": 0.12,
    "Pesto Sauce": 0.05,
    "Parmesan Cheese": 0.01,
  },
  "Lasagna roll": {
    "Lasagna Sheets": 0.15,
    "Tomato Sauce": 0.08,
    "All-Purpose Cream": 0.05,
    "Parmesan Cheese": 0.01,
  },
  Alfonso: {
    "Fettucine Pasta": 0.12,
    "All-Purpose Cream": 0.1,
    "Parmesan Cheese": 0.01,
  },

  // ---- Ramen ---------------------------------------------------------------
  "Miso Ramen": {
    "Ramen Noodles": 0.12,
    "Miso Paste": 0.03,
    "Chashu Pork": 0.06,
    Egg: 1,
    "Nori Sheets": 0.5,
    "Spring Onion": 0.01,
  },
  "Tantan Ramen": {
    "Ramen Noodles": 0.12,
    "Tantan Sauce": 0.04,
    "Pork Maskara": 0.05,
    Egg: 1,
    "Nori Sheets": 0.5,
    Peanut: 0.02,
  },
  "Ramen Set": {
    "Ramen Noodles": 0.12,
    "Tonkotsu Broth": 0.15,
    "Chashu Pork": 0.06,
    Egg: 1,
    "Nori Sheets": 0.5,
    "Fish Cake": 0.02,
  },

  // ---- Pizza ---------------------------------------------------------------
  "Ham Cheese Pizza": {
    "Pizza Dough": 0.2,
    "Pizza Sauce": 0.05,
    "Burger Cheese Slice": 2,
    "Ham Slices": 0.05,
    "Pizza Oregano": 0.002,
  },
  "Pepporoni Pizza": {
    "Pizza Dough": 0.2,
    "Pizza Sauce": 0.05,
    "Pepperoni Slices": 0.05,
    "Burger Cheese Slice": 2,
    "Pizza Oregano": 0.002,
  },
  "Hawaiian Pizza": {
    "Pizza Dough": 0.2,
    "Pizza Sauce": 0.05,
    "Ham Slices": 0.05,
    "Pineapple Chunks": 0.04,
    "Burger Cheese Slice": 2,
  },
  "Vegetarian Pizza": {
    "Pizza Dough": 0.2,
    "Pizza Sauce": 0.05,
    "Bell Pepper": 0.04,
    Mushroom: 0.04,
    "Black Olives": 0.02,
    "Burger Cheese Slice": 2,
  },
  "Sweet Ham Cheese": {
    "Pizza Dough": 0.2,
    "Pizza Sauce": 0.05,
    "Ham Slices": 0.05,
    "Burger Cheese Slice": 2,
    Honey: 0.01,
  },

  // ---- Sides ---------------------------------------------------------------
  Fries: { "French Fries": 0.15, Salt: 0.003, "Cooking Oil": 0.02 },
  "Buttered Corn": { "Corn Kernels": 0.1, Butter: 0.01 },
  Plain: { "French Fries": 0.15, Salt: 0.003 },
  "Fish and Fries": {
    "Fish Fillet": 0.15,
    "French Fries": 0.15,
    "Cooking Oil": 0.02,
  },

  // ---- Salads --------------------------------------------------------------
  "Caesar Salad": {
    "Salad Mix Greens": 0.1,
    Croutons: 0.03,
    "Caesar Dressing": 0.03,
    "Parmesan Cheese": 0.01,
  },
  "Green Salad": {
    "Salad Mix Greens": 0.1,
    Cucumber: 0.03,
    "Caesar Dressing": 0.03,
  },

  // ---- Nachos --------------------------------------------------------------
  "Nachos Solo": { "Nachos Chips": 0.1, "Cheese Sauce": 0.04 },
  "Nachos Overload": {
    "Nachos Chips": 0.15,
    "Cheese Sauce": 0.06,
    "Ground Beef": 0.05,
    "Sour Cream Powder": 0.01,
  },
  "Gin Nachos": {
    "Nachos Chips": 0.1,
    "Cheese Sauce": 0.04,
    "Jalapeno": 0.02,
  },

  // ---- Shrimp / seafood ----------------------------------------------------
  "Shrimp Gambas": {
    Shrimp: 0.15,
    "Gambas Sauce": 0.04,
    "Cooking Oil": 0.01,
    "Bell Pepper": 0.02,
  },

  // ---- Rice / teriyaki -----------------------------------------------------
  "Teriyaki Chicken": {
    "Chicken Thigh Fillet": 0.15,
    "Teriyaki Sauce": 0.04,
    "Jasmine Rice": 0.15,
  },
  Classic: {
    "Jasmine Rice": 0.15,
    "Chicken Thigh Fillet": 0.1,
    "Cooking Oil": 0.01,
  },

  // ---- Coffee / drinks -----------------------------------------------------
  Espresso: { "Espresso Roast": 0.018 },
  Americano: { "Espresso Roast": 0.018 },
  "Brewed Coffee": { "Coffee Beans": 0.018 },
  "Spanish Latte": { "Espresso Roast": 0.018, "Fresh Milk": 0.15 },
  Cappucino: { "Espresso Roast": 0.018, "All-Purpose Cream": 0.08 },
  "Cafe Mocha": {
    "Espresso Roast": 0.018,
    "Chocolate Syrup": 0.02,
    "All-Purpose Cream": 0.08,
  },
  "Coffee Mocha": {
    "Espresso Roast": 0.018,
    "Chocolate Syrup": 0.02,
    "All-Purpose Cream": 0.08,
  },
  Incan: {
    "Powder-Based Milktea": 0.03,
    "Condense Milk": 0.02,
    "Jasmine Rice": 0.0,
  },
  "Javachip Oreo": {
    "Espresso Roast": 0.018,
    "Java Chip Powder": 0.02,
    "All-Purpose Cream": 0.08,
    "Oreo Crumbs": 0.01,
  },
  "Hot Choco": { "Chocolate Syrup": 0.03, "Fresh Milk": 0.2 },
  "Hot Tea": { "Tea Bags": 1 },
  Hataka: { "Tea Bags": 1 },
  Matcha: { "Matcha Powder": 0.02, "Fresh Milk": 0.2, "Condense Milk": 0.01 },
  Mango: { "Mango Puree": 0.04, "Fresh Milk": 0.2, Ice: 0.1 },
  "Matcha Oreo": {
    "Matcha Powder": 0.02,
    "Fresh Milk": 0.2,
    "Oreo Crumbs": 0.01,
  },
  Wintermelon: { "Wintermelon Syrup": 0.04, "Fresh Milk": 0.2 },
  Lemonade: { "Powdered Lemonade": 0.03, "Fresh Milk": 0.2 },
  Orange: { "Powdered Orange": 0.03, "Fresh Milk": 0.2 },
  Strawberry: { "Strawberry Syrup": 0.04, "Fresh Milk": 0.2 },
  Taro: { "Taro Powder": 0.03, "Fresh Milk": 0.2 },
  "Avocado Kiwi Graham": {
    Avocado: 0.15,
    Kiwi: 0.1,
    "Graham Cracker Crumbs": 0.02,
    "Fresh Milk": 0.2,
  },
  "Caramel Oreo": {
    "Maple Syrup": 0.03,
    "Oreo Crumbs": 0.01,
    "All-Purpose Cream": 0.08,
  },
  "Chocolate Oreo": {
    "Dark Chocolate Syrup": 0.03,
    "Oreo Crumbs": 0.01,
    "All-Purpose Cream": 0.08,
  },
  "Cookies and Cream": { "Cookies and Cream Powder": 0.03, "Fresh Milk": 0.2 },
  "Cookies and Cream Oreo": {
    "Cookies and Cream Powder": 0.03,
    "Oreo Crumbs": 0.01,
    "Fresh Milk": 0.2,
  },
  "Dark Choco": { "Dark Chocolate Syrup": 0.03, "Fresh Milk": 0.2 },
  "Dark Choco Oreo": {
    "Dark Chocolate Syrup": 0.03,
    "Oreo Crumbs": 0.01,
    "Fresh Milk": 0.2,
  },
  "Okinawa": { "Okinawa Syrup": 0.04, "Fresh Milk": 0.2 },
  "Okinawa Oreo": {
    "Okinawa Syrup": 0.04,
    "Oreo Crumbs": 0.01,
    "Fresh Milk": 0.2,
  },
  "Ube Pearl Shake": {
    "Ube Flavoring": 0.03,
    "Tapioca Pearls": 0.05,
    "Fresh Milk": 0.2,
  },

  // ---- Beers ---------------------------------------------------------------
  "San Mig Apple": { "Bottled Water": 0.0 },
  "San Mig Light": { "Bottled Water": 0.0 },
  "San Mig Pilsen": { "Bottled Water": 0.0 },
  Redhorse: { "Bottled Water": 0.0 },
  "Coke 1.5ml": { "Bottled Water": 0.0 },
  "Coke sakto": { "Bottled Water": 0.0 },
  Water: { "Bottled Water": 0.5 },
  "Gin Tower": { "Bottled Water": 0.3, "Lemon Juice": 0.02 },
  Tofu: { "Tofu Blocks": 0.15 },
};

// Dishes that legitimately have no raw-material recipe. Bottled/canned drinks
// are not made from your inventory, so linking them is meaningless.
const NO_RECIPE_NEEDED = new Set([
  "San Mig Apple",
  "San Mig Light",
  "San Mig Pilsen",
  "Redhorse",
  "Coke 1.5ml",
  "Coke sakto",
  "Water",
  "Bottled Water",
  "Unlimited",
  "Unlimited B",
]);

// ---------------------------------------------------------------------------

const normalise = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Exact match, then starts-with, then contains. */
function resolveMaterial(materialName, inventory) {
  const target = normalise(materialName);
  if (!target) return null;

  const pool = inventory.map((inv) => ({
    inv,
    key: normalise(inv.item_name),
  }));

  const exact = pool.find((p) => p.key === target);
  if (exact) return exact.inv;

  const startsWith = pool.find((p) => p.key.startsWith(target));
  if (startsWith) return startsWith.inv;

  const contains = pool.find(
    (p) => p.key.includes(target) || target.includes(p.key),
  );
  if (contains) return contains.inv;

  return null;
}

async function main() {
  const conn = await db.getConnection();
  const report = {
    willLink: [],
    skippedExisting: [],
    needsReview: [],
    noRecipeNeeded: [],
    unresolvedMaterials: new Set(),
  };

  try {
    const [menuItems] = await conn.execute(
      "SELECT item_id, menu_name FROM menu_items ORDER BY item_id",
    );
    const [inventory] = await conn.execute(
      "SELECT inventory_id, item_name, unit FROM inventory",
    );
    const [existing] = await conn.execute(
      "SELECT DISTINCT item_id FROM menu_item_ingredients",
    );
    const alreadyLinked = new Set(existing.map((r) => Number(r.item_id)));

    console.log(
      `\nFound ${menuItems.length} dishes and ${inventory.length} raw materials.`,
    );
    console.log(
      `${alreadyLinked.size} dish(es) already have a recipe and will be skipped.\n`,
    );

    const inserts = [];

    for (const item of menuItems) {
      const name = item.menu_name;

      if (alreadyLinked.has(Number(item.item_id))) {
        report.skippedExisting.push(name);
        continue;
      }

      if (NO_RECIPE_NEEDED.has(name)) {
        report.noRecipeNeeded.push(name);
        continue;
      }

      const recipe = RECIPES[name];
      if (!recipe) {
        report.needsReview.push({
          dish: name,
          reason: "No starter recipe defined",
        });
        continue;
      }

      const rows = [];
      let unresolved = 0;

      for (const [material, qty] of Object.entries(recipe)) {
        const inv = resolveMaterial(material, inventory);
        if (!inv) {
          unresolved++;
          report.unresolvedMaterials.add(material);
          continue;
        }
        if (!(qty > 0)) continue; // skip filler/zero entries
        rows.push({
          item_id: item.item_id,
          inventory_id: inv.inventory_id,
          quantity_required: qty,
          material: inv.item_name,
        });
      }

      if (rows.length === 0) {
        report.needsReview.push({
          dish: name,
          reason: "No ingredients could be resolved",
        });
        continue;
      }

      if (unresolved > 0) {
        report.willLink.push({ dish: name, rows, partial: unresolved });
      } else {
        report.willLink.push({ dish: name, rows, partial: 0 });
      }
      inserts.push(...rows);
    }

    // ---- REPORT ----
    const line = "-".repeat(64);
    console.log(`\n${line}\nSUMMARY\n${line}\n`);
    console.log(
      `  Ready to link      : ${report.willLink.length} dishes (${inserts.length} links)`,
    );
    console.log(`  Skipped (has recipe): ${report.skippedExisting.length}`);
    console.log(`  Needs review        : ${report.needsReview.length}`);
    console.log(`  No recipe needed    : ${report.noRecipeNeeded.length}\n`);

    if (report.willLink.length > 0) {
      console.log(`\n${line}\nWILL BE LINKED\n${line}\n`);
      for (const entry of report.willLink) {
        const warn =
          entry.partial > 0 ? `  [PARTIAL - ${entry.partial} unresolved]` : "";
        console.log(`\n  ${entry.dish}${warn}`);
        for (const r of entry.rows) {
          console.log(`     + ${r.material.padEnd(28)} ${r.quantity_required}`);
        }
      }
    }

    if (report.needsReview.length > 0) {
      console.log(`\n${line}\nNEEDS REVIEW (nothing written)\n${line}\n`);
      for (const n of report.needsReview)
        console.log(`  ! ${n.dish} - ${n.reason}`);
    }

    if (report.unresolvedMaterials.size > 0) {
      console.log(`\n${line}\nMATERIALS NOT FOUND IN INVENTORY\n${line}\n`);
      for (const m of report.unresolvedMaterials) console.log(`  ? ${m}`);
      console.log(`\n  Add these to inventory, then re-run the script.`);
    }

    if (report.noRecipeNeeded.length > 0) {
      console.log(
        `\n${line}\nSKIPPED - NO RECIPE NEEDED (bottled drinks etc.)\n${line}\n`,
      );
      console.log(`  ${report.noRecipeNeeded.join(", ")}`);
    }

    // ---- WRITE ----
    if (!APPLY) {
      console.log(`\n${line}\nDRY RUN - NOTHING WAS WRITTEN\n${line}\n`);
      console.log(
        "  Re-run with --apply to write these links to the database:\n",
      );
      console.log("      node scripts/seed-recipes.js --apply\n");
      return;
    }

    if (inserts.length === 0) {
      console.log("\n  Nothing to insert.\n");
      return;
    }

    await conn.beginTransaction();
    try {
      for (const row of inserts) {
        await conn.execute(
          `INSERT INTO menu_item_ingredients (item_id, inventory_id, quantity_required)
           VALUES (?, ?, ?)`,
          [row.item_id, row.inventory_id, row.quantity_required],
        );
      }
      await conn.commit();
      console.log(`\n  SUCCESS - ${inserts.length} recipe links inserted.\n`);
    } catch (err) {
      await conn.rollback();
      console.error(
        "\n  FAILED - transaction rolled back, nothing was written.",
      );
      console.error(`  ${err.message}\n`);
    }
  } finally {
    conn.release();
    if (db.pool) db.pool.end();
  }
}

main().catch((err) => {
  console.error("Seed script error:", err);
  process.exit(1);
});
