const asQuantity = (value) => Math.max(0, Number(value) || 0);

const calculateRemainingPackageQuantity = ({
  packageLimit,
  servedQuantity = 0,
  pendingDineInQuantity = 0,
  takeoutReservedQuantity = 0,
}) =>
  Math.max(
    0,
    asQuantity(packageLimit) -
      asQuantity(servedQuantity) -
      asQuantity(pendingDineInQuantity) -
      asQuantity(takeoutReservedQuantity),
  );

module.exports = { calculateRemainingPackageQuantity };