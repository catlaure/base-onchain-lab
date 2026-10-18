import { describe, expect, it } from "vitest";
import { getChain, isNetworkName } from "../src/chains.js";

describe("chains", () => {
  it("maps network names to the right chain ids", () => {
    expect(getChain("base").id).toBe(8453);
    expect(getChain("base-sepolia").id).toBe(84532);
  });

  it("recognises valid network names only", () => {
    expect(isNetworkName("base")).toBe(true);
    expect(isNetworkName("base-sepolia")).toBe(true);
    expect(isNetworkName("ethereum")).toBe(false);
    expect(isNetworkName("toString")).toBe(false);
  });
});
