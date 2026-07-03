import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  chromium,
  type Browser,
  type Dialog,
  type Frame,
  type Locator,
  type Page,
  type Request,
} from "playwright-core";
import type { SubmissionRecord } from "../core/model.js";
import { err, ok, type Result } from "../core/result.js";
import {
  summarizeSubmissionPlan,
  summarizeSupplierGroup,
  writeDiagnosticFile,
} from "../app/diagnostics.js";
import { buildSubmissionPlan, type SubmissionPlan } from "../core/submission-plan.js";
import type { BrowserDriver, SaveResult, SiteCredentials } from "../ports/browser-driver.js";
import {
  describeTotalsGateFailure,
  isIssuanceConfirmation,
  numericValueDiffers,
  totalsArePopulated,
} from "./field-value.js";
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
    await writeDiagnosticFile("driver_submission_plan", {
      group: summarizeSupplierGroup(record),
      plan: summarizeSubmissionPlan(plan),
    }).catch(() => undefined);
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
      const context = await browser.newContext();
      // tsx/esbuild runs with keepNames, which wraps named inner functions inside our
      // frame.evaluate/page.evaluate callbacks (e.g. readTotals' `const get = …`) with a `__name(…)`
      // helper whose definition lives at the module top level. Playwright serializes only the
      // callback BODY into the page, not that top-level helper, so `__name` is undefined there →
      // "ReferenceError: __name is not defined". Each affected evaluate then throws and is swallowed
      // by its own try/catch — silently breaking every read: readTotals always returned empty, so the
      // totals wait timed out for 15s and blank 총수량/총금액 were saved. A context-level init script
      // defines a harmless identity __name shim in every page/frame/popup before any of our scripts
      // run, so the wrapped callbacks execute correctly. It MUST be a string literal — esbuild never
      // rewrites string contents, so the shim itself can't be __name-wrapped and crash recursively —
      // and it MUST be injected before login/openForm navigate.
      await context.addInitScript(
        "globalThis.__name = globalThis.__name || function (fn) { return fn; };",
      );
      page = await context.newPage();
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
      at("settle_totals");
      await this.waitForFormTotals(page, label, plan.lineItems.length);
      at("save");
      const result = await this.saveDraft(page, label);
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
    for (const [i, frame] of page.frames().entries()) {
      await writeFile(join(dir, `${safe}_frame${i}.html`), await frame.content()).catch(
        () => undefined,
      );
    }
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
    for (const [i, frame] of page.frames().entries()) {
      await writeFile(join(dir, `${safe}_frame${i}.html`), await frame.content()).catch(
        () => undefined,
      );
    }
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

  /**
   * After the line-item popup closes, the main form's 총수량/총금액 are NOT written by the popup
   * directly. The popup calls `opener.window["fnc_linepop"]()` on each add and on 닫기 — a callback
   * that runs in the parent (the mainFrame hosting viewForm) and ASYNCHRONOUSLY fetches+recomputes
   * the totals from the server, then populates viewForm.totQty / viewForm.totAmt (and the FrgnAmt /
   * Wchrg fields). 임시저장 must not post until that callback has landed, or blank totals are saved —
   * the live-reproduced bug. This is the same "automation outruns the site's async callback" race as
   * settleRecalc / waitForItemFormReady, so it is fixed the same way: a condition-based poll, never a
   * flat sleep.
   *
   * Invariant enforced here: once the popup has added N rows, viewForm.totQty AND viewForm.totAmt
   * must both be present and non-zero before we proceed. (We can't assert an exact total — the server
   * computes it — but a blank/zero total after adding rows is the failure we are guarding against, so
   * `totalsArePopulated` makes the dropped-totals bug surface as a timeout here rather than silently
   * at save.)
   *
   * Hard gate: a populated value is the only success condition. On timeout, the flow fails before
   * saveDraft after logging decisive evidence. If the first poll finds the totals still blank, we
   * re-fire the read-only `fnc_linepop` refresh once and keep polling — covering the
   * "the 닫기-triggered call was lost" sub-hypothesis. This touches no submit path: fnc_linepop only
   * refreshes totals.
   */
  private async waitForFormTotals(page: Page, label: string, rowCount: number): Promise<void> {
    if (rowCount === 0) return;
    const { qtyField, amtField, frgnAmtField, callback } = siteContract.totals;

    // Read the two gating totals off the parent form. Mirrors the popup's
    // `opener.document.viewForm.totQty.value`. Wrapped so a transient frame detach never throws.
    const readTotals = async (): Promise<{ totQty: string; totAmt: string }> => {
      try {
        const frame = await this.mainFrame(page);
        return await frame.evaluate(
          ([qty, amt]) => {
            const form = (document as unknown as { viewForm?: Record<string, { value?: string }> })
              .viewForm;
            const get = (name: string): string => form?.[name]?.value ?? "";
            return { totQty: get(qty), totAmt: get(amt) };
          },
          [qtyField, amtField] as const,
        );
      } catch {
        return { totQty: "", totAmt: "" };
      }
    };

    const retrigger = async (): Promise<void> => {
      try {
        const frame = await this.mainFrame(page);
        await frame.evaluate((name) => {
          try {
            const fn = (window as unknown as Record<string, unknown>)[name];
            if (typeof fn === "function") (fn as () => void)();
          } catch {
            /* read-only total refresh; ignore */
          }
        }, callback);
      } catch {
        /* never throw out of the wait */
      }
    };

    const start = Date.now();
    const deadline = start + 15000;
    let retriggered = false;
    let last = { totQty: "", totAmt: "" };
    while (Date.now() < deadline) {
      last = await readTotals();
      if (totalsArePopulated(last.totQty, last.totAmt)) {
        this.log(`[${label}] totals: totQty="${last.totQty}" totAmt="${last.totAmt}"`);
        await this.dumpTotalsDiag(page, label);
        return;
      }
      // Defensive: if the close-triggered callback was lost, re-fire it once (after a short grace so
      // a callback already in flight gets a chance to land first), then keep polling.
      if (!retriggered && Date.now() - start > 2000) {
        retriggered = true;
        await retrigger();
      }
      // Condition-based wait: re-read on the site's own readiness, not a fixed end-of-step sleep.
      await page.waitForLoadState("networkidle", { timeout: 1500 }).catch(() => undefined);
    }

    // Failure path only: capture decisive evidence to disambiguate "race" vs "callback name changed".
    this.log(
      `[${label}] totals NOT populated after wait: totQty="${last.totQty}" totAmt="${last.totAmt}"`,
    );
    try {
      const frame = await this.mainFrame(page);
      const evidence = await frame.evaluate(
        ([qty, amt, frgn, cb]) => {
          const form = (document as unknown as { viewForm?: Record<string, { value?: string }> })
            .viewForm;
          const get = (name: string): string => form?.[name]?.value ?? "<no-field>";
          return {
            callbackType: typeof (window as unknown as Record<string, unknown>)[cb],
            totQty: get(qty),
            totAmt: get(amt),
            totFrgnAmt: get(frgn),
          };
        },
        [qtyField, amtField, frgnAmtField, callback] as const,
      );
      this.log(
        `[${label}] totals diag: typeof ${callback}=${evidence.callbackType} ` +
          `totQty="${evidence.totQty}" totAmt="${evidence.totAmt}" totFrgnAmt="${evidence.totFrgnAmt}"`,
      );
    } catch (error) {
      this.log(`[${label}] totals diag read failed: ${String(error)}`);
    }
    await this.dumpTotalsDiag(page, label);
    throw new Error(describeTotalsGateFailure(last.totQty, last.totAmt));
  }

  /**
   * UTH_DIAG-only, strictly read-only deep dump to pin down WHERE the saved totals actually live.
   * Live evidence: the saved draft has blank 총수량/총금액 even though the user SEES totals on the
   * form — so the visible number is likely a DISPLAY element while the field 임시저장 posts
   * (document.viewForm.totQty/totAmt) stays empty, OR the real total field has a different name. This
   * gathers the decisive evidence (the callback's own source + every tot/sum/qty/amt control + the
   * display-span vs field split) without changing anything. Runs on BOTH the success and timeout
   * paths so we get the form's real total DOM either way. Never throws; touches no submit/발급/제출.
   */
  private async dumpTotalsDiag(page: Page, label: string): Promise<void> {
    if (process.env.UTH_DIAG !== "1") return;
    const { callback } = siteContract.totals;
    try {
      const frame = await this.mainFrame(page);
      const dump = await frame.evaluate((cb) => {
        const out: {
          callbackSrc: string;
          controls: string[];
          displayVsField: string[];
        } = { callbackSrc: "<not a function>", controls: [], displayVsField: [] };

        // 1. The callback's own source reveals exactly which element/field it writes.
        const fn = (window as unknown as Record<string, unknown>)[cb];
        if (typeof fn === "function") {
          out.callbackSrc = (fn as () => void).toString().slice(0, 3000);
        }

        // 2. Sweep every control (incl. hidden) inside document.viewForm whose name or id looks
        //    total-ish, to surface the REAL field if it isn't named totQty/totAmt.
        const form = (document as unknown as { viewForm?: HTMLFormElement }).viewForm;
        if (form) {
          const re = /tot|sum|qty|amt/i;
          for (const el of Array.from(form.elements)) {
            const c = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            const name = c.name ?? "";
            const id = c.id ?? "";
            if (re.test(name) || re.test(id)) {
              out.controls.push(`${name}|${id}=${String(c.value)}`);
            }
          }
        }

        // 3. Display spans (id=totQty / id=totAmt) textContent vs the form field .value — confirms
        //    the suspected display-vs-field split.
        for (const elId of ["totQty", "totAmt"]) {
          const node = document.getElementById(elId);
          const display = node ? (node.textContent ?? "").replace(/\s+/g, " ").trim() : "<no-el>";
          const fieldVal =
            form && (form as unknown as Record<string, { value?: string }>)[elId]
              ? ((form as unknown as Record<string, { value?: string }>)[elId]?.value ?? "")
              : "<no-field>";
          out.displayVsField.push(`#${elId}: display="${display}" field.value="${fieldVal}"`);
        }
        return out;
      }, callback);

      this.log(
        `[${label}] totals diag deep: ${callback}.toString()=${JSON.stringify(dump.callbackSrc)}`,
      );
      this.log(`[${label}] totals diag controls: ${JSON.stringify(dump.controls)}`);
      this.log(`[${label}] totals diag display-vs-field: ${JSON.stringify(dump.displayVsField)}`);
      const dir = process.env.UTH_DIAG_DIR ?? join(process.cwd(), ".diagnostics");
      await mkdir(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const safe = `${stamp}_${label.replace(/[^\w.-]+/g, "_")}_totals_live.json`;
      await writeFile(join(dir, safe), JSON.stringify(dump, null, 2)).catch(() => undefined);
    } catch (error) {
      this.log(`[${label}] totals diag deep read failed: ${String(error)}`);
    }
    // 4. Main-page HTML/PNG snapshot so the totals DOM region can be inspected directly.
    await this.snapshot(page, `${label}_mainform_totals`).catch(() => undefined);
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

  /**
   * Close any popups the site throws (terms agreement, notices, session-conflict warnings) within a
   * bounded idle window. A popup left open overlays the form, so subsequent clicks/fills land on the
   * wrong target — the most likely cause of the post-login "everything is offset" symptom. The old
   * code closed exactly one popup; this drains however many appear, then stops once none arrive
   * within `idleMs`.
   */
  private async drainPopups(page: Page, idleMs = 2500, max = 6): Promise<void> {
    for (let n = 0; n < max; n += 1) {
      let popup: Page;
      try {
        popup = await page.context().waitForEvent("page", { timeout: idleMs });
      } catch {
        return; // no further popup within the idle window
      }
      await popup.close().catch(() => undefined);
    }
  }

  private async login(page: Page, credentials: SiteCredentials): Promise<void> {
    await page.goto(credentials.baseUrl);

    if (credentials.loginMode === "manual") {
      const waitMs = Number(process.env.SITE_MANUAL_LOGIN_WAIT_MS ?? "60000");
      this.log(`[manual-login] waiting ${waitMs}ms for operator login to complete`);
      await page.waitForTimeout(waitMs);
      await this.role(page, siteContract.form.menuLink).first().waitFor({
        state: "visible",
        timeout: 180000,
      });
      await this.drainPopups(page);
      await page.waitForLoadState("domcontentloaded");
      return;
    }

    await page.getByPlaceholder(siteContract.login.idPlaceholder).fill(credentials.username);
    await page.getByPlaceholder(siteContract.login.passwordPlaceholder).fill(credentials.password);
    await this.role(page, siteContract.login.submit, true).click();
    await this.drainPopups(page);
    await page.waitForLoadState("domcontentloaded");
  }

  private async openForm(page: Page): Promise<void> {
    await this.role(page, siteContract.form.menuLink).first().click();
    const legacyApply = this.role(page, siteContract.form.applyButton);
    try {
      await legacyApply.click({ timeout: 10000 });
    } catch {
      const introFrame = page.frame({ name: siteContract.form.applicationFrame });
      if (!introFrame) throw new Error("application frame not found");
      await introFrame.locator(siteContract.form.applicationLink).click({ timeout: 10000 });
    }
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

  private async readDraftTotals(frame: Frame): Promise<Record<string, string>> {
    return await frame.evaluate(() => {
      const form = (document as unknown as { viewForm?: HTMLFormElement }).viewForm;
      const get = (name: string): string => {
        const control = form?.elements.namedItem(name) as
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement
          | null;
        return control?.value ?? "";
      };
      return {
        refNum: get("refNum"),
        docId: get("docId"),
        sts: get("sts"),
        pageGubun: get("pageGubun"),
        litemCnt: get("litemCnt"),
        totQty: get("totQty"),
        totQtyCd: get("totQtyCd"),
        totAmt: get("totAmt"),
        totAmtAcntCrny: get("totAmtAcntCrny"),
        totAmtAcntCrnyView: get("totAmtAcntCrnyView"),
        totQtyLitem: get("totQtyLitem"),
        totAmtLitem: get("totAmtLitem"),
        totFrgnAmt: get("totFrgnAmt"),
        totalWchrgAmt: get("totalWchrgAmt"),
        totalWchrgFrgnAmt: get("totalWchrgFrgnAmt"),
      };
    });
  }

  private async captureSavedDraftReadbackDiag(page: Page, label: string): Promise<void> {
    if (process.env.UTH_DIAG !== "1") return;
    const dir = process.env.UTH_DIAG_DIR ?? join(process.cwd(), ".diagnostics");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeLabel = label.replace(/[^\w.-]+/g, "_");
    let readbackUrl: string | null = null;
    let before: Record<string, string> | null = null;
    let responseBody: unknown = null;
    let after: Record<string, string> | null = null;
    let error: string | null = null;

    try {
      const frame = await this.mainFrame(page);
      before = await this.readDraftTotals(frame);
      const responsePromise = page
        .waitForResponse(
          (response) =>
            response.url().includes("/li/cnfrmprch/retrieveETSCnfrmPrchApplL.do") &&
            response.request().method() === "POST",
          { timeout: 15000 },
        )
        .catch(() => undefined);

      await frame.evaluate(() => {
        const fn = (window as unknown as { doAction?: (key: string) => void }).doAction;
        if (typeof fn !== "function") throw new Error("doAction not found");
        fn("modifyForm");
      });

      const response = await responsePromise;
      readbackUrl = response?.url() ?? null;
      if (response) {
        responseBody = await response.json().catch(async () => ({
          text: await response.text().catch(() => "<unreadable>"),
        }));
      }
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
      after = await this.readDraftTotals(await this.mainFrame(page)).catch(() => null);
    } catch (cause) {
      error = String(cause);
    }

    await writeFile(
      join(dir, `${stamp}_${safeLabel}_saved_readback.json`),
      JSON.stringify(
        {
          readbackUrl,
          before,
          responseBody,
          after,
          error,
        },
        null,
        2,
      ),
    ).catch(() => undefined);
  }
  private async saveDraft(page: Page, label: string): Promise<SaveResult> {
    const frame = await this.mainFrame(page);

    // 임시저장 fires a SEQUENCE of native dialogs, not just one: typically a confirm/notice that gates
    // the main-form POST (총수량/총금액 included), then trailing completion alert(s). The previous
    // one-shot `waitForEvent(...).dismiss()` saw only the first dialog and DISMISSED it — i.e. clicked
    // 취소 on that gating confirm — so the main-form POST was cancelled and the header totals were never
    // saved, even though the draft + line-item rows (built by the popup's own server calls) already
    // existed → the live "rows present, totals blank" bug. Fix: a PERSISTENT page.on("dialog") that
    // drains the WHOLE sequence and ACCEPTS (확인) each save-flow dialog so the POST actually commits.
    // Armed BEFORE the click (a click that triggers a blocking confirm() does not resolve until the
    // dialog is handled) and removed in `finally`.
    const messages: string[] = [];
    let blockedIssuance = false;
    let firstSeen: () => void = () => undefined;
    const firstDialog = new Promise<void>((resolve) => {
      firstSeen = resolve;
    });

    const onDialog = (d: Dialog): void => {
      const type = d.type();
      // Collapse all whitespace (incl. the multi-line bullet notices) to single spaces for a 1-line log.
      const message = d.message().replace(/\s+/g, " ").trim();
      messages.push(message);
      firstSeen();

      // HUMAN-GATE RED LINE: never confirm a dialog that ASKS to actually issue/submit/transmit. Only an
      // INTERROGATIVE issuance prompt is dangerous — accepting it would FILE the application. A
      // DECLARATIVE notice that merely MENTIONS those terms (e.g. the "must press the [send] button to
      // complete the application" do-this-later instruction shown DURING the save flow) is closed so the
      // save proceeds. The discrimination lives in `isIssuanceConfirmation` (field-value.ts), unit-tested.
      if (isIssuanceConfirmation(message)) {
        blockedIssuance = true;
        this.log(
          `[save] ⚠ WARNING: dialog(${type}) is an issuance-style question — ` +
            `dismissed per human gate, never accepted: "${message}"`,
        );
        void d.dismiss().catch(() => undefined);
        return;
      }
      this.log(`[save] dialog(${type}) → accept(확인): "${message}"`);
      void d.accept().catch(() => undefined);
    };
    const savePosts: Array<{
      method: string;
      resourceType: string;
      url: string;
      fields: Record<string, string>;
    }> = [];
    const onRequest = (request: Request): void => {
      if (process.env.UTH_DIAG !== "1") return;
      const url = request.url();
      if (!/cnfrmprch|ETSC/i.test(url)) return;
      const postData = request.method() === "POST" ? (request.postData() ?? "") : "";
      const fields: Record<string, string> = {};
      const collect = (key: string, value: unknown): void => {
        if (/tot|qty|amt|frgn|wchrg|litem/i.test(key)) fields[key] = String(value ?? "");
      };

      try {
        const parsed = JSON.parse(postData) as Record<string, unknown>;
        for (const [key, value] of Object.entries(parsed)) collect(key, value);
      } catch {
        const params = new URLSearchParams(postData);
        for (const [key, value] of params.entries()) collect(key, value);
      }

      savePosts.push({
        method: request.method(),
        resourceType: request.resourceType(),
        url,
        fields,
      });
    };
    const context = page.context();
    context.on("request", onRequest);
    page.on("dialog", onDialog);

    try {
      await this.role(frame, siteContract.save.tempSave, true).click();

      // Required semantic: at least one dialog must arrive within 15s. None ⇒ the save is UNVERIFIED
      // (success:false), never reported optimistically just because the timer expired. `firstDialog`
      // (set by the handler above, armed before the click) also catches a confirm fired synchronously
      // DURING the click. The deadline is a plain timer — NOT page.waitForTimeout (a race-masking sleep)
      // and NOT a second waitForEvent dialog listener (which, left dangling, could observe a late dialog
      // without accepting it and freeze the page). It is only the explicit save-verification deadline.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), 15000);
      });
      const sawDialog = await Promise.race([firstDialog.then(() => true), deadline]);
      if (timer) clearTimeout(timer);
      if (!sawDialog) {
        return {
          success: false,
          referenceNo: null,
          message: "임시저장: 저장 확인 대화상자가 15초 내에 나타나지 않음 (저장 미확인)",
        };
      }

      // The accepted confirm fires the main-form POST. Wait for that round-trip to COMMIT on the server
      // — and any trailing completion alert to fire (drained by the persistent handler) — on the site's
      // own network-idle signal, never a fixed sleep. This also guarantees we do not close the browser
      // while the save POST is still in flight. Best-effort/bounded: a quiet page resolves at once.
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
      await this.dumpTotalsDiag(page, `${label}_after_save`).catch(() => undefined);
    } finally {
      page.off("dialog", onDialog);
      context.off("request", onRequest);
    }

    if (process.env.UTH_DIAG === "1" && savePosts.length > 0) {
      const dir = process.env.UTH_DIAG_DIR ?? join(process.cwd(), ".diagnostics");
      await mkdir(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      await writeFile(
        join(dir, `${stamp}_save_posts_totals.json`),
        JSON.stringify(savePosts, null, 2),
      ).catch(() => undefined);
    }

    await this.captureSavedDraftReadbackDiag(page, label).catch((error) => {
      this.log(`[diag] saved draft readback capture failed: ${String(error)}`);
    });

    const combined = messages.join(" | ");
    // Success heuristic unchanged: after a real accept the completion notice ("…저장되었습니다", etc.)
    // joins `messages`, so the 저장/완료/성공 check lands on a genuine commit confirmation.
    const success = ["저장", "완료", "성공"].some((token) => combined.includes(token));
    const refMatch = /\d{6,}/.exec(combined);
    const message = blockedIssuance
      ? `${combined}  [HUMAN-GATE: issuance-style confirm dismissed / 인적 게이트 유지]`
      : combined;
    return { success, referenceNo: refMatch ? (refMatch[0] ?? null) : null, message };
  }
}

