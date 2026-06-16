export const REVIEWERS = ["HW", "SW", "MEC", "SYS", "TEST"] as const;
export type Reviewer = (typeof REVIEWERS)[number];

export const REVIEW_CATEGORIES = ["HW", "SW", "MEC", "SYS", "TEST"] as const;
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

export const REVIEW_DECISIONS = ["relevant", "maybe", "irrelevant"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const DECISION_LABEL: Record<ReviewDecision, string> = {
  relevant: "S등급",
  maybe: "A등급",
  irrelevant: "B등급",
};

export const DECISION_DESCRIPTION: Record<ReviewDecision, string> = {
  relevant: "등록된 특허로서 청구항과 우리 개발안을 비교했을 때 침해 가능성이 있음",
  maybe: "미등록(심사중, 출원 etc) 중 특허로 청구항과 우리 개발안을 비교했을 때 침해 가능성이 있거나 우리 개발안이 채택할 가능성이 있음",
  irrelevant: "명확한 비침해 포인트 특정가능하거나 우리 개발안과 관련성이 낮음",
};

export function isReviewer(value: unknown): value is Reviewer {
  return typeof value === "string" && (REVIEWERS as readonly string[]).includes(value);
}

export function isReviewCategory(value: unknown): value is ReviewCategory {
  return typeof value === "string" && (REVIEW_CATEGORIES as readonly string[]).includes(value);
}

export function isReviewDecision(value: unknown): value is ReviewDecision {
  return typeof value === "string" && (REVIEW_DECISIONS as readonly string[]).includes(value);
}
