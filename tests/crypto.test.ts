import { describe, expect, it } from "vitest";
import { createMemberQrToken, hashPassword, verifyPassword } from "../src/server/lib/crypto";

describe("security primitives", () => {
  it("creates opaque member QR tokens and stores a distinct hash", async () => {
    const token = await createMemberQrToken();
    expect(token.raw).toMatch(/^coll\.member\.[A-Za-z0-9_-]+$/);
    expect(token.raw).not.toBe(token.hash);
    expect(token.hash.length).toBeGreaterThan(20);
  });

  it("hashes and verifies passwords", async () => {
    const password = await hashPassword("a-secure-test-password");
    expect(await verifyPassword("a-secure-test-password", password.salt, password.hash)).toBe(true);
    expect(await verifyPassword("wrong-password", password.salt, password.hash)).toBe(false);
  });
});
