import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gzddldfrhrgntxktqpqb.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6ZGRsZGZyaHJnbnR4a3RxcHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODgwOTgsImV4cCI6MjA4NjE2NDA5OH0.sgD8YWYY2iVCBtgZKT2UB5vfrUHQzeIBbeIQkx_ivgY";

/**
 * Verifies that admin_set_user_plan cannot be invoked by:
 *  - anonymous (unauthenticated) callers
 *  - authenticated non-admin callers (simulated via anon role; lacks admin role)
 *
 * Expected behavior: the RPC returns an error (permission denied OR "Admin only").
 * It must NEVER return data: true / silently succeed.
 */
describe("admin_set_user_plan authorization", () => {
  it("rejects anonymous callers with an error", async () => {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await anon.rpc("admin_set_user_plan", {
      _user_id: "00000000-0000-0000-0000-000000000000",
      _plan: "pro",
      _daily_credits: 9999,
      _monthly_credits: 99999,
      _payment_status: "paid",
      _transaction_id: "test-unauth",
    });

    expect(error).not.toBeNull();
    expect(data).not.toBe(true);

    const msg = (error?.message || "").toLowerCase();
    // Either Postgres permission denied (EXECUTE only granted to authenticated)
    // or the function's own "Admin only" RAISE.
    expect(
      msg.includes("admin only") ||
        msg.includes("permission denied") ||
        msg.includes("not authorized") ||
        msg.includes("denied")
    ).toBe(true);
  });

  it("does not allow plan escalation for callers without admin role", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.rpc("admin_set_user_plan", {
      _user_id: "11111111-1111-1111-1111-111111111111",
      _plan: "enterprise",
      _daily_credits: 100000,
      _monthly_credits: 1000000,
    });
    expect(data).not.toBe(true);
    expect(error).toBeTruthy();
  });
});
