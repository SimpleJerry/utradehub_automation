import type { PurchaseOrder } from "./model.js";

export interface VendorMappingEntry {
  supplierNameKo: string;
  hsCode: string;
}

export type VendorMapping = Map<string, VendorMappingEntry>;

export function normalizeVendorName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function applyVendorMapping(order: PurchaseOrder, mapping: VendorMapping): PurchaseOrder {
  const key = order.payToVendorNameEn ? normalizeVendorName(order.payToVendorNameEn) : "";
  const entry = key ? mapping.get(key) : undefined;
  return {
    ...order,
    supplierNameKo: entry?.supplierNameKo ?? null,
    hsCode: entry?.hsCode ?? null,
  };
}
