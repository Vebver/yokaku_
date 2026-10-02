import React from "react";

// Package prices are fixed by the restaurant and shared between the booking
// form (Walk-ins) and the reservation drawers, so the amount shown in the
// drawer always matches what the customer was quoted.
export const PACKAGE_PRICES = {
  "Standard Package": 10000,
  "Premium Package": 12500,
  "Regular Table": 0,
};

const pesos = (v) =>
  Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// The reservation record stores the package under different keys depending on
// which flow created it, so check the known ones before giving up.
const readPackageName = (reservation) => {
  const raw =
    reservation?.package_name ||
    reservation?.packageName ||
    reservation?.selected_package ||
    "";
  const name = String(raw).trim();
  if (!name) return "";

  const lower = name.toLowerCase();
  if (lower.includes("premium")) return "Premium Package";
  if (lower.includes("standard")) return "Standard Package";
  return name;
};

function PackageMeta({ reservation, showPrice = true }) {
  const name = readPackageName(reservation);
  const price = PACKAGE_PRICES[name];

  if (!name) {
    return <span className="small fw-bold text-muted">No package</span>;
  }

  return (
    <span className="d-inline-flex align-items-center gap-2 flex-wrap justify-content-end">
      <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold">
        {name}
      </span>
      {showPrice && price !== undefined && price > 0 && (
        <span className="small text-muted">₱{pesos(price)}</span>
      )}
    </span>
  );
}

export default PackageMeta;
