export interface RoleSelector {
  role: string;
  name: string;
}

/** Basic-info defaults that do not depend on the supplier or line items. */
export const SITE_DEFAULTS = {
  receiver: "EKTNET@",
  materialType: "2AJ",
  currency: "KRW",
} as const;

/**
 * The single declarative source of uTradeHub's DOM contract.
 * All selectors/roles/labels live here; flow code references keys, never raw selectors.
 * Values come from manual inspection of the uTradeHub web form.
 */
export const siteContract = {
  login: {
    idPlaceholder: "아이디",
    passwordPlaceholder: "비밀번호",
    submit: { role: "button", name: "로그인" } satisfies RoleSelector,
  },
  form: {
    mainFrame: 'iframe[name^="mainFrame"]',
    menuLink: { role: "link", name: "구매확인서 통합서비스" } satisfies RoleSelector,
    applyButton: { role: "button", name: "구매확인서 신청 바로가기" } satisfies RoleSelector,
    applicationFrame: "EGUME_MAIN_FR",
    applicationLink: "#prchAppl",
    write: { role: "button", name: "작성" } satisfies RoleSelector,
  },
  basicInfo: {
    receiverButton: 'button[name="rcvCd_b"]',
    materialSelect: "#splyMtrlTypCd",
    findButton: { role: "button", name: "찾기" } satisfies RoleSelector,
    currencyCodeInput: { role: "textbox", name: "코드 입력" } satisfies RoleSelector,
    searchButton: { role: "button", name: "조회" } satisfies RoleSelector,
  },
  supplier: {
    button: "#splybutton",
    searchInput: "#searchOptionText1",
    searchButton: { role: "button", name: "조회" } satisfies RoleSelector,
  },
  items: {
    openButton: { role: "button", name: "구매물품 목록 등록/수정" } satisfies RoleSelector,
    hsInput: 'input[name="hsCd"]',
    nameInput: { role: "textbox", name: "품명 입력" } satisfies RoleSelector,
    unitPriceInput: { role: "textbox", name: "단가 입력" } satisfies RoleSelector,
    unitQuantitySelect: 'select[name="basPrcBasQtyCdBas"]',
    quantityUnitSelect: "#qtyUntBas",
    quantityInput: { role: "textbox", name: "수량 입력" } satisfies RoleSelector,
    purchaseDateInput: { role: "textbox", name: "구매일자 입력" } satisfies RoleSelector,
    addButton: "#btn_add_save2",
    closeButton: { role: "button", name: "닫기" } satisfies RoleSelector,
  },
  save: {
    tempSave: { role: "button", name: "임시저장" } satisfies RoleSelector,
  },
  /**
   * Main-form (viewForm) total fields the line-item popup populates ASYNCHRONOUSLY via its parent
   * callback `fnc_linepop`. Confirmed from the popup DOM, which reads them as
   * `opener.document.viewForm.totQty.value` etc. (ETSCnfrmPrchLItemCP). The driver must wait for
   * totQty/totAmt to land before 임시저장, or blank totals are saved. Field names — not CSS IDs —
   * because the popup addresses them by the named form control on `document.viewForm`.
   */
  totals: {
    callback: "fnc_linepop",
    qtyField: "totQty",
    amtField: "totAmt",
    frgnAmtField: "totFrgnAmt",
    wchrgAmtField: "totalWchrgAmt",
    wchrgFrgnAmtField: "totalWchrgFrgnAmt",
  },
} as const;
