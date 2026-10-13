export const DEBTOR_PAGE_SIZE = 20;
export type FinancialOverview = { month: string; salesCents: number; receivedCents: number; pendingCents: number };
export type DebtorPage = { clients: { id: string; fullName: string; balanceCents: number }[]; pendingCents: number; offset: number; hasMore: boolean };
