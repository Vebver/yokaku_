const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateRemainingPackageQuantity } = require("../utils/packageBalance");

test("remaining package quantity subtracts consumed meals", () => {
  assert.equal(
    calculateRemainingPackageQuantity({ packageLimit: 10, servedQuantity: 6 }),
    4,
  );
});

test("completed takeout uses the remaining package quantity", () => {
  assert.equal(
    calculateRemainingPackageQuantity({
      packageLimit: 10,
      servedQuantity: 6,
      takeoutReservedQuantity: 4,
    }),
    0,
  );
});

test("pending dine-in and takeout requests reserve capacity", () => {
  assert.equal(
    calculateRemainingPackageQuantity({
      packageLimit: 10,
      servedQuantity: 4,
      pendingDineInQuantity: 3,
      takeoutReservedQuantity: 2,
    }),
    1,
  );
});

test("remaining quantity never becomes negative", () => {
  assert.equal(
    calculateRemainingPackageQuantity({
      packageLimit: 10,
      servedQuantity: 11,
    }),
    0,
  );
});