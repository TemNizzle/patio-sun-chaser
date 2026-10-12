// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function req(headers: Record<string, string> = {}, cookie?: string) {
  return new NextRequest("https://psc.example/", {
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
  });
}

const barbadosIp = { "x-vercel-ip-latitude": "13.1", "x-vercel-ip-longitude": "-59.6" };
const torontoIp = { "x-vercel-ip-latitude": "43.7", "x-vercel-ip-longitude": "-79.4" };

describe("proxy", () => {
  it("sends a visitor in Barbados to /barbados", () => {
    const res = proxy(req(barbadosIp));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/barbados");
  });

  it("leaves a Toronto visitor on /", () => {
    const res = proxy(req(torontoIp));
    expect(res.headers.get("location")).toBeNull();
  });

  it("falls back to Toronto with no location headers", () => {
    expect(proxy(req()).headers.get("location")).toBeNull();
  });

  it("lets an explicit choice beat the IP guess", () => {
    // Barbados IP but they chose Toronto: stay.
    expect(proxy(req(barbadosIp, "psc-city=toronto")).headers.get("location")).toBeNull();
    // Toronto IP but they chose Barbados: go.
    const res = proxy(req(torontoIp, "psc-city=barbados"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/barbados");
  });

  it("ignores a garbage cookie", () => {
    const res = proxy(req(barbadosIp, "psc-city=nowhere"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/barbados");
  });
});
