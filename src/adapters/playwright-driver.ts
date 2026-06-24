import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  chromium,
  type Browser,
  type Dialog,
  type Frame,
  type Locator,
  type Page,
} from "playwright-core";
import type { SubmissionRecord } from "../core/model.js";
import { err, ok, type Result } from "../core/result.js";
import { buildSubmissionPlan, type SubmissionPlan } from "../core/submission-plan.js";
import type { BrowserDriver, SaveResult, SiteCredentials } from "../ports/browser-driver.js";
import { numericValueDiffers } from "./field-value.js";
import { SITE_DEFAULTS, siteContract, type RoleSelector } from "./site-contract.js";

type AriaRole = Parameters<Page["getByRole"]>[0];

/**
 * Imperative shell: drive uTradeHub through to 임시저장 using the site contract and a pure plan.
 * Strictly stops at the draft (never triggers final 발급/제출). Not covered by default unit
 * tests; exercised by the gated integration test (SITE_E2E=1) against the live site.
 */
export class PlaywrightDriver implements BrowserDriver {
  async createDraft(
    record: SubmissionRecord,
    credentials: SiteCredentials,
  ): Promise<Result<SaveResult>> {
    const plan = buildSubmissionPlan(record, SITE_DEFAULTS);
    const label = record.supplierNameKo ?? record.payToVendorNameEn ?? record.groupKey;
    let browser: Browser | undefined;
    let page: Page | undefined;
    let step = "launch";
    const at = (s: string): void => {
      step = s;
      this.log(`[${label}] → ${s}`);
    };
    try {
      at("launch");
      browser = await chromium.launch({ channel: "chrome", headless: false });
      page = await (await browser.newContext()).newPage();
      // Diagnostics: surface every popup the site throws (notices, session conflicts, pickers).
      page.on("popup", (p) => this.log(`[${label}] popup opened: ${p.url()}`));

      at("login");
      await this.login(page, credentials);
      at("open_form");
      await this.openForm(page);
      at("fill_basic_info");
      await this.fillBasicInfo(page, plan);
      at("select_supplier");
      await this.selectSupplier(page, plan);
      at("fill_line_items");
      await this.fillLineItems(page, plan, label);
      at("save");
      const result = await this.saveDraft(page);
      this.log(`[${label}] ✓ saved: ${JSON.stringify(result)}`);
      return ok(result);
    } catch (error) {
      await this.captureFailure(page, label, step).catch(() => undefined);
      this.log(`[${label}] ✗ failed at ${step}: ${String(error)}`);
      return err(`site_flow_error[${step}]: ${String(error)}`);
    } finally {
      await browser?.close();
    }
  }

  private log(message: string): void {
    // stderr so it interleaves into the server console without being mistaken for app output.
    console.error(`[playwright ${new Date().toISOString()}] ${message}`);
  }

  /**
   * On a flow failure, snapshot every open page (main form + any lingering popup) plus the main
   * page's HTML into a local, git-ignored diagnostics folder. This is the only window into what
   * the live site actually did — which popup appeared, where a click misfired — without a human
   * watching the browser. May contain on-screen account/supplier data, so it never leaves disk.
   */
  private async captureFailure(page: Page | undefined, label: string, step: string): Promise<void> {
    if (!page) return;
    const dir = process.env.UTH_DIAG_DIR ?? join(process.cwd(), ".diagnostics");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = `${stamp}_${label.replace(/[^\w.-]+/g, "_")}_${step}`;
    const pages = page.context().pages();
    for (const [i, p] of pages.entries()) {
      const name = i === 0 ? "main" : `popup${i}`;
      await p
        .screenshot({ path: join(dir, `${safe}_${name}.png`), fullPage: true })
        .catch(() => undefined);
    }
    await writeFile(join(dir, `${safe}_main.html`), await page.content()).catch(() => undefined);
    this.log(`[${label}] artifacts → ${dir}  (prefix ${safe})`);
  }

  /** Opt-in (UTH_DIAG=1) screenshot + HTML of one page, for reverse-engineering site behaviour. */
  private async snapshot(page: Page, tag: string): Promise<void> {
    const dir = process.env.UTH_DIAG_DIR ?? join(process.cwd(), ".diagnostics");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = `${stamp}_${tag.replace(/[^\w.-]+/g, "_")}`;
    await page
      .screenshot({ path: join(dir, `${safe}.png`), fullPage: true })
      .catch(() => undefined);
    await writeFile(join(dir, `${safe}.html`), await page.content()).catch(() => undefined);
    this.log(`snapshot → ${safe}.{png,html}`);
  }

  /**
   * Keep the site's blocking native alert non-blocking. A long 품명 (>35 bytes) fires
   * alert("…한 줄에는 최대 35 Byte…"), which freezes the page's JS thread and races with the
   * remaining fills. Replacing window.alert with a recorder makes the fill sequence deterministic
   * and still captures the messages for diagnostics. The popup reloads the entry row on every add
   * (reverting alert to native), so this must be re-applied before each row.
   */
  private async installAlertRecorder(popup: Page): Promise<void> {
    await popup
      .evaluate(() => {
        const w = window as unknown as { __alerts?: string[] };
        const recorded = Array.isArray(w.__alerts) ? w.__alerts : (w.__alerts = []);
        window.alert = (message?: string): void => {
          recorded.push(String(message));
        };
      })
      .catch(() => undefined);
  }

  /**
   * 저장/추가 commits a row via a jQuery blockUI ("Loading…") postback that reloads the entry
   * fields. Filling the next row while that reload is in flight lands on a doomed DOM and is
   * silently wiped (HS/단가 end up empty → "…를 입력해주세요" → the row is dropped). Wait for the
   * overlay to clear and the HS field to be editable again before touching the next row. A flat
   * delay was too short — the reload routinely outlasts it — which was dropping items.
   */
  private async waitForItemFormReady(popup: Page): Promise<void> {
    const overlay = popup.locator(".blockUI.blockOverlay").first();
    await overlay.waitFor({ state: "visible", timeout: 2000 }).catch(() => undefined);
    await overlay.waitFor({ state: "hidden", timeout: 20000 }).catch(() => undefined);
    await popup
      .locator(siteContract.items.hsInput)
      .waitFor({ state: "visible", timeout: 20000 })
      .catch(() => undefined);
  }

  /** Re-fill a required field a late reset may have wiped, so a row is never rejected blank. */
  private async refillIfEmpty(field: Locator, value: string): Promise<void> {
    if ((await field.inputValue().catch(() => "")).trim() === "") {
      await field.fill(value).catch(() => undefined);
    }
  }

  /**
   * Re-assert a numeric field to `value` when a late recalc echo changed it. The 단가/수량 fields
   * are overwritten by setSumAmt's async callback with a server echo; a recalc fired while 수량 was
   * still empty echoes qty=1 and, landing late, collapses a typed 100 → 1. Comparison ignores the
   * site's own thousands separators so its formatting never triggers a needless refill.
   */
  private async ensureNumericValue(field: Locator, value: string): Promise<void> {
    if (numericValueDiffers(await field.inputValue().catch(() => ""), value)) {
      await field.fill(value).catch(() => undefined);
    }
  }

  /**
   * Wait for the line-item amount recalc (setSumAmt → retrieveETSCnfrmPrchLItemAmt.do) and any
   * blockUI postback to settle, so a late server echo can no longer overwrite a field after we set
   * it. Both waits are best-effort: an already-idle popup resolves immediately.
   */
  private async settleRecalc(popup: Page): Promise<void> {
    await popup
      .locator(".blockUI.blockOverlay")
      .first()
      .waitFor({ state: "hidden", timeout: 8000 })
      .catch(() => undefined);
    await popup.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => undefined);
  }

  private role(scope: Page | Frame, selector: RoleSelector, exact = false): Locator {
    return scope.getByRole(selector.role as AriaRole, { name: selector.name, exact });
  }

  private async mainFrame(page: Page): Promise<Frame> {
    await page.waitForSelector(siteContract.form.mainFrame, { timeout: 15000 });
    const frames = page.frames().filter((f) => f.name().startsWith("mainFrame"));
    const frame = frames.at(-1);
    if (!frame) throw new Error("mainFrame not found");
    return frame;
  }

  /**
   * Trigger a control that opens a popup window and return the popup.
   * Dispatches the click event directly (`dispatchEvent("click")`) instead of `Locator.click()`:
   * the supplier 찾기 button renders outside the form frame's (non-scrollable) viewport, so a
   * normal click can never reach it (actionability/viewport timeout). Dispatching the event fires
   * the element's own onclick regardless of position. The popup is captured with a passive
   * `page.once("popup")` listener armed before the dispatch (a pending `page.waitForEvent` would
   * interfere with dispatch on this page); we then await the popup, which opens asynchronously.
   */
  private dispatchAndAwaitPopup(page: Page, target: Locator, timeoutMs = 30000): Promise<Page> {
    const popupPromise = new Promise<Page>((resolve, reject) => {
      const onPopup = (popup: Page): void => {
        clearTimeout(timer);
        resolve(popup);
      };
      const timer = setTimeout(() => {
        page.off("popup", onPopup);
        reject(new Error(`popup did not open within ${timeoutMs}ms`));
      }, timeoutMs);
      page.once("popup", onPopup);
    });
    return target.dispatchEvent("click").then(() => popupPromise);
  }

  private async login(page: Page, credentials: SiteCredentials): Promise<void> {
    await page.goto(credentials.baseUrl);
    await page.getByPlaceholder(siteContract.login.idPlaceholder).fill(credentials.username);
    await page.getByPlaceholder(siteContract.login.passwordPlaceholder).fill(credentials.password);
    await this.role(page, siteContract.login.submit, true).click();
    try {
      const popup = await page.context().waitForEvent("page", { timeout: 3000 });
      await popup.close();
    } catch {
      // No login popup appeared.
    }
    await page.waitForLoadState("domcontentloaded");
  }

  private async openForm(page: Page): Promise<void> {
    await this.role(page, siteContract.form.menuLink).click();
    await this.role(page, siteContract.form.applyButton).click();
    await page.waitForLoadState("domcontentloaded");
    const frame = await this.mainFrame(page);
    await this.role(frame, siteContract.form.write).click();
  }

  private async fillBasicInfo(page: Page, plan: SubmissionPlan): Promise<void> {
    const frame = await this.mainFrame(page);

    const [receiverPopup] = await Promise.all([
      page.waitForEvent("popup"),
      frame.locator(siteContract.basicInfo.receiverButton).click(),
    ]);
    await receiverPopup.getByText(plan.basicInfo.receiver).first().click();
    await receiverPopup.close();

    await frame
      .locator(siteContract.basicInfo.materialSelect)
      .selectOption(plan.basicInfo.materialType);

    const [currencyPopup] = await Promise.all([
      page.waitForEvent("popup"),
      this.role(frame, siteContract.basicInfo.findButton).nth(3).click(),
    ]);
    await this.role(currencyPopup, siteContract.basicInfo.currencyCodeInput).fill(
      plan.basicInfo.currency,
    );
    await this.role(currencyPopup, siteContract.basicInfo.searchButton).click();
    await currencyPopup.getByText(plan.basicInfo.currency).first().click();
    await currencyPopup.close();
  }

  private async selectSupplier(page: Page, plan: SubmissionPlan): Promise<void> {
    if (!plan.supplierKeyword) return;
    const frame = await this.mainFrame(page);
    const popup = await this.dispatchAndAwaitPopup(
      page,
      frame.locator(siteContract.supplier.button).first(),
    );
    await popup.locator(siteContract.supplier.searchInput).fill(plan.supplierKeyword);
    await this.role(popup, siteContract.supplier.searchButton).click();
    await popup.getByText(plan.supplierKeyword).first().click();
    await popup.close();
  }

  private async fillLineItems(page: Page, plan: SubmissionPlan, label: string): Promise<void> {
    if (plan.lineItems.length === 0) return;
    const frame = await this.mainFrame(page);
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      this.role(frame, siteContract.items.openButton).click(),
    ]);
    await popup.waitForLoadState("domcontentloaded");

    // Native dialogs that slip past the in-page recorder (a server-side rejection like
    // "HS부호를 입력해주세요", or an alert fired before the recorder is installed) still surface
    // through Playwright; log and dismiss them so they can never block the flow.
    popup.on("dialog", (d: Dialog) => {
      this.log(`[${label}] item dialog: "${d.message().replace(/\s+/g, " ").trim()}"`);
      void d.dismiss();
    });

    // The popup can show the blockUI overlay on first load too; wait before the first fill.
    await this.waitForItemFormReady(popup);

    let i = 0;
    for (const item of plan.lineItems) {
      i += 1;
      // Each add reloads the entry row, reverting window.alert to native — reinstall the
      // recorder on the freshly-loaded document before typing the long 품명.
      await this.installAlertRecorder(popup);
      this.log(
        `[${label}] add item ${i}/${plan.lineItems.length}: ` +
          `hs=${item.hsCode} name="${item.productName}" qty=${item.quantity} price=${item.unitPrice}`,
      );
      await popup.locator(siteContract.items.hsInput).fill(item.hsCode);
      await this.role(popup, siteContract.items.nameInput).fill(item.productName);
      await this.role(popup, siteContract.items.unitPriceInput).fill(item.unitPrice);
      await popup.locator(siteContract.items.unitQuantitySelect).selectOption("EA");
      await popup.locator(siteContract.items.quantityUnitSelect).selectOption("EA");
      await this.role(popup, siteContract.items.quantityInput, true).fill(item.quantity);
      if (item.purchaseDate) {
        await this.role(popup, siteContract.items.purchaseDateInput).fill(item.purchaseDate);
      }
      // The 단가/수량 onblur each fire setSumAmt → an async amount recalc whose callback echoes the
      // server-normalised value back into the field. A recalc fired while 수량 was still empty (the
      // 단가 onblur fires one before we type quantity) echoes qty=1 and, landing late, overwrites
      // the quantity we just typed (100 → 1). Let every pending recalc settle first, so that stale
      // echo lands now…
      await this.settleRecalc(popup);

      // …then re-assert the row. HS/품명 are only restored when blanked (the site reformats 품명, so
      // never fight its value); 단가/수량 are corrected whenever they differ from the intended number,
      // which catches the echo-clobber that leaves a non-empty but wrong value.
      await this.refillIfEmpty(popup.locator(siteContract.items.hsInput), item.hsCode);
      await this.refillIfEmpty(this.role(popup, siteContract.items.nameInput), item.productName);
      await this.ensureNumericValue(
        this.role(popup, siteContract.items.unitPriceInput),
        item.unitPrice,
      );
      const qtyField = this.role(popup, siteContract.items.quantityInput, true);
      await this.ensureNumericValue(qtyField, item.quantity);

      // Re-fire the recalc with the corrected quantity (also recomputing 금액) and let its now-correct
      // echo land, so no stale setSumAmt response is left in flight to clobber 수량 before we commit.
      await qtyField.focus().catch(() => undefined);
      await qtyField.blur().catch(() => undefined);
      await this.settleRecalc(popup);

      if (process.env.UTH_DIAG === "1") {
        const alerts = await popup.evaluate(
          () => (window as unknown as { __alerts?: string[] }).__alerts ?? [],
        );
        this.log(`[${label}] item ${i} pre-add alerts = ${JSON.stringify(alerts)}`);
        this.log(
          `[${label}] item ${i} pre-add qty="${await qtyField.inputValue().catch(() => "")}"`,
        );
      }

      await popup.locator(siteContract.items.addButton).click();
      // Wait for the blockUI postback/reload to fully settle before the next row (or 닫기),
      // instead of a flat delay the reload can outlast — the core fix for dropped rows.
      await this.waitForItemFormReady(popup);

      if (process.env.UTH_DIAG === "1") {
        await this.snapshot(popup, `${label}_items_after_${i}`);
      }
    }

    await this.role(popup, siteContract.items.closeButton).click();
    if (!popup.isClosed()) await popup.close();
  }

  private async saveDraft(page: Page): Promise<SaveResult> {
    const dialog: { message: string | null } = { message: null };
    page.once("dialog", (d: Dialog) => {
      dialog.message = d.message().trim();
      void d.dismiss();
    });

    const frame = await this.mainFrame(page);
    await this.role(frame, siteContract.save.tempSave, true).click();
    await page.waitForTimeout(1000);

    const captured = dialog.message;
    if (captured !== null) {
      const success = ["저장", "완료", "성공"].some((token) => captured.includes(token));
      const refMatch = /\d{6,}/.exec(captured);
      return { success, referenceNo: refMatch ? (refMatch[0] ?? null) : null, message: captured };
    }
    return { success: true, referenceNo: null, message: "임시저장 clicked (no dialog captured)" };
  }
}
