import type { LineItem, PurchaseOrder, SupplierGroup } from "./model.js";
import { normalizeVendorName } from "./vendor-mapping.js";

export const UNKNOWN_VENDOR = "UNKNOWN_VENDOR";

/** Group validated orders by supplier into submission units (m PDFs -> n groups). */
export function groupBySupplier(orders: PurchaseOrder[]): SupplierGroup[] {
  const groups = new Map<string, SupplierGroup>();

  for (const order of orders) {
    const key = order.payToVendorNameEn
      ? normalizeVendorName(order.payToVendorNameEn)
      : UNKNOWN_VENDOR;

    let group = groups.get(key);
    if (!group) {
      group = {
        groupKey: key,
        payToVendorNameEn: order.payToVendorNameEn,
        supplierNameKo: order.supplierNameKo,
        hsCode: order.hsCode,
        lineItems: [],
        sourceFiles: [],
      };
      groups.set(key, group);
    }

    group.sourceFiles.push(order.sourceFile);
    for (const item of order.lineItems) {
      const stamped: LineItem = {
        ...item,
        docNumber: item.docNumber ?? order.bpoNo ?? undefined,
        documentDate: item.documentDate ?? order.documentDate ?? undefined,
        sourceFile: order.sourceFile,
      };
      group.lineItems.push(stamped);
    }
  }

  return [...groups.values()];
}
