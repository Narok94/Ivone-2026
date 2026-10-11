// Test-only database substitute. No PostgreSQL/Neon client is imported.
export const pool = {
  calls: [],
  rows: [],
  fail: false,
  async query(...args) {
    this.calls.push(args);
    if (this.fail) throw new Error('simulated private database error');
    return { rows: this.rows };
  },
  async connect() { throw new Error('Database writes/restores are prohibited in these tests'); },
};
