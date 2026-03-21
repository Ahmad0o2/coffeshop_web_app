import { describe, expect, it } from "vitest";
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  storeAuthSession,
} from "./authStorage";

describe("authStorage", () => {
  it("stores and reads the full auth session", () => {
    const user = { id: "user-1", role: "Customer", fullName: "Ahmad" };

    storeAuthSession({
      user,
      token: "access-token",
    });

    expect(getStoredUser()).toEqual(user);
    expect(getAccessToken()).toBe("access-token");
  });

  it("clears the full auth session", () => {
    storeAuthSession({
      user: { id: "user-2" },
      token: "access-token",
    });

    clearAuthSession();

    expect(getStoredUser()).toBeNull();
    expect(getAccessToken()).toBe("");
  });
});
