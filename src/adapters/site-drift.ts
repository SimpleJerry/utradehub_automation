export interface DriftError {
  step: string;
  anchor: string;
  message: string;
}

export interface Anchor {
  step: string;
  anchor: string;
}

/** Critical anchors that must exist for the flow to proceed (drawn from the site contract). */
export const CRITICAL_ANCHORS: Anchor[] = [
  { step: "open_form", anchor: 'iframe[name^="mainFrame"]' },
  { step: "open_form", anchor: "작성" },
  { step: "select_supplier", anchor: "#splybutton" },
  { step: "fill_line_items", anchor: "구매물품 목록 등록/수정" },
  { step: "save", anchor: "임시저장" },
];

/**
 * Pure drift check: given a presence predicate, return the first missing anchor as a
 * DriftError pointing at the step + anchor to fix in site-contract, or null if all present.
 */
export function detectDrift(
  anchors: Anchor[],
  isPresent: (anchor: string) => boolean,
): DriftError | null {
  for (const a of anchors) {
    if (!isPresent(a.anchor)) {
      return {
        step: a.step,
        anchor: a.anchor,
        message: `页面结构漂移：步骤「${a.step}」缺少锚点「${a.anchor}」，请更新 site-contract。`,
      };
    }
  }
  return null;
}
