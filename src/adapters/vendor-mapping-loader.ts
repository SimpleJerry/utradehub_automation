import { readFile } from "node:fs/promises";
import { parseCsv } from "../core/csv.js";
import { err, ok, type Result } from "../core/result.js";
import { normalizeVendorName, type VendorMapping } from "../core/vendor-mapping.js";

const REQUIRED_COLUMNS = ["vendor_name_en", "supplier_name_ko", "hs_code"] as const;

export function parseVendorMapping(content: string): Result<VendorMapping> {
  const rows = parseCsv(content);
  const header = rows[0];
  if (!header) return err("vendor_mapping_empty");

  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) return err(`vendor_mapping_missing_columns: ${missing.join(",")}`);

  const enIdx = header.indexOf("vendor_name_en");
  const koIdx = header.indexOf("supplier_name_ko");
  const hsIdx = header.indexOf("hs_code");

  const mapping: VendorMapping = new Map();
  for (const row of rows.slice(1)) {
    const en = (row[enIdx] ?? "").trim();
    const ko = (row[koIdx] ?? "").trim();
    const hs = (row[hsIdx] ?? "").trim();
    if (!en || !ko || !hs) continue;
    mapping.set(normalizeVendorName(en), { supplierNameKo: ko, hsCode: hs });
  }
  return ok(mapping);
}

export async function loadVendorMapping(path: string): Promise<Result<VendorMapping>> {
  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    return err(`vendor_mapping_file_error: ${String(error)}`);
  }
  return parseVendorMapping(content);
}
