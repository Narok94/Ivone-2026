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
  async connect() {
    let readOnly = false;
    return { query: async (sql, args) => {
      if (sql.startsWith('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')) readOnly = true;
      if (!readOnly || !/^(BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY|SELECT|COMMIT|ROLLBACK)/.test(sql)) throw new Error('Database writes/restores are prohibited in these tests');
      return this.query(sql, args);
    }, release() {} };
  },
};
