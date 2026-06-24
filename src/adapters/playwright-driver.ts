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

    // Root cause of N-of-M line items being silently dropped: entering a long 품명 (>35 bytes)
    // fires a *blocking* alert("…한 줄에는 최대 35 Byte…"). A native alert freezes the page's JS
    // thread and races with the following fills, intermittently leaving 단가 empty so "add" is
    // rejected ("금액을 입력해주세요") and the row vanishes. Replace alert with a non-blocking
    // recorder so the fill sequence is deterministic; the messages are still readable for diag.
    await popup.evaluate(() => {
      const recorded: string[] = [];
      (window as unknown as { __alerts: string[] }).__alerts = recorded;
      window.alert = (message?: string): void => {
        recorded.push(String(message));
      };
    });
    // confirm()/non-alert dialogs still surface through Playwright; log and dismiss them.
    popup.on("dialog", (d: Dialog) => {
      this.log(`[${label}] item dialog: "${d.message().replace(/\s+/g, " ").trim()}"`);
      void d.dismiss();
    });

    let i = 0;
    for (const item of plan.lineItems) {
      i += 1;
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
      // Backstop: confirm the validated field still holds its value before committing the row.
      const price = this.role(popup, siteContract.items.unitPriceInput);
      if ((await price.inputValue()).trim() === "") await price.fill(item.unitPrice);

      await popup.locator(siteContract.items.addButton).click();
      // Let the AJAX add commit before the next entry (and before the final 닫기) to avoid a
      // separate add-not-committed race, especially on the last row.
      await popup.waitForTimeout(400);

      if (process.env.UTH_DIAG === "1") {
        const alerts = await popup.evaluate(
          () => (window as unknown as { __alerts?: string[] }).__alerts ?? [],
        );
        this.log(`[${label}] after add ${i}: alerts so far = ${JSON.stringify(alerts)}`);
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
