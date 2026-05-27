export type ApprovalDecision = 'approve' | 'reject';

export type ApprovalReason = {
  id: string;
  label: string;
  category: 'brand' | 'tone' | 'audience' | 'cta' | 'length' | 'offer' | 'platform' | 'hook' | 'safety' | 'media' | 'preference';
  decision: ApprovalDecision;
  brandLearningHint: string;
};

export const APPROVAL_REASONS: ApprovalReason[] = [
  {
    id: 'strong_brand_fit',
    label: 'On brand',
    category: 'brand',
    decision: 'approve',
    brandLearningHint: 'Preserve the brand voice and positioning pattern reviewers approved.',
  },
  {
    id: 'strong_hook',
    label: 'Strong hook',
    category: 'hook',
    decision: 'approve',
    brandLearningHint: 'Reuse hook styles that reviewers consider strong.',
  },
  {
    id: 'clear_cta',
    label: 'Clear CTA',
    category: 'cta',
    decision: 'approve',
    brandLearningHint: 'Keep calls to action concrete and easy to act on.',
  },
  {
    id: 'right_audience',
    label: 'Right audience',
    category: 'audience',
    decision: 'approve',
    brandLearningHint: 'Preserve audience language and pain points that reviewers approved.',
  },
  {
    id: 'good_length',
    label: 'Good length',
    category: 'length',
    decision: 'approve',
    brandLearningHint: 'Use similar caption length and structure for this platform.',
  },
  {
    id: 'strong_product_focus',
    label: 'Good product focus',
    category: 'offer',
    decision: 'approve',
    brandLearningHint: 'Keep the approved level of product or offer emphasis.',
  },
  {
    id: 'platform_ready',
    label: 'Platform-ready',
    category: 'platform',
    decision: 'approve',
    brandLearningHint: 'Reuse platform adaptation choices that reviewers approved.',
  },
  {
    id: 'client_preference',
    label: 'Client preference',
    category: 'preference',
    decision: 'approve',
    brandLearningHint: 'Treat this as a client preference signal for future drafts.',
  },
  {
    id: 'too_formal',
    label: 'Too formal',
    category: 'tone',
    decision: 'reject',
    brandLearningHint: 'Avoid overly formal wording unless the Brand Brain asks for it.',
  },
  {
    id: 'off_brand',
    label: 'Off-brand',
    category: 'brand',
    decision: 'reject',
    brandLearningHint: 'Avoid language, claims, or positioning that reviewers marked off-brand.',
  },
  {
    id: 'weak_cta',
    label: 'Weak CTA',
    category: 'cta',
    decision: 'reject',
    brandLearningHint: 'Use a clearer and more specific call to action.',
  },
  {
    id: 'wrong_audience',
    label: 'Wrong audience',
    category: 'audience',
    decision: 'reject',
    brandLearningHint: 'Re-align drafts with the intended audience before approval.',
  },
  {
    id: 'too_long',
    label: 'Too long',
    category: 'length',
    decision: 'reject',
    brandLearningHint: 'Keep captions tighter when reviewers flag length.',
  },
  {
    id: 'needs_more_product_focus',
    label: 'Needs product focus',
    category: 'offer',
    decision: 'reject',
    brandLearningHint: 'Connect the content more clearly to the product, service, or offer.',
  },
  {
    id: 'platform_mismatch',
    label: 'Platform mismatch',
    category: 'platform',
    decision: 'reject',
    brandLearningHint: 'Adapt format and language more specifically for the selected platform.',
  },
  {
    id: 'risky_claim',
    label: 'Risky claim',
    category: 'safety',
    decision: 'reject',
    brandLearningHint: 'Avoid absolute, unsupported, or compliance-sensitive claims.',
  },
  {
    id: 'media_issue',
    label: 'Media issue',
    category: 'media',
    decision: 'reject',
    brandLearningHint: 'Review media fit, format, and creative before sending for approval.',
  },
];

export function getApprovalReasons(decision: ApprovalDecision) {
  return APPROVAL_REASONS.filter((reason) => reason.decision === decision);
}

export function normalizeApprovalReasons(
  reasonIds: unknown,
  decision: ApprovalDecision
): ApprovalReason[] {
  const ids = Array.isArray(reasonIds) ? reasonIds.map((item) => String(item)) : [];
  const allowed = new Map(getApprovalReasons(decision).map((reason) => [reason.id, reason]));
  const uniqueIds = Array.from(new Set(ids));
  return uniqueIds
    .map((id) => allowed.get(id))
    .filter((reason): reason is ApprovalReason => Boolean(reason));
}

export function summarizeApprovalReasons(reasons: ApprovalReason[]) {
  return reasons.map((reason) => reason.label).join(', ');
}
