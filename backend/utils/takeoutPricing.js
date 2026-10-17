const calculateTakeoutValue = (items) => {
  const cents = (items || []).reduce((sum, item) => {
    const price = Math.max(0, Number(item.unit_price ?? item.price) || 0);
    const quantity = Math.max(0, Number(item.quantity) || 0);
    return sum + Math.round(price * 100) * quantity;
  }, 0);

  return cents / 100;
};

module.exports = { calculateTakeoutValue };