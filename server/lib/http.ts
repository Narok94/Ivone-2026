// Structural request/response types shared by Vercel functions and Express.
export type VercelRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: any; query: Record<string, string | string[] | undefined>; params?: Record<string, string> };
export type VercelResponse = { setHeader(name: string, value: string): unknown; status(code: number): VercelResponse; json(body: unknown): unknown };
