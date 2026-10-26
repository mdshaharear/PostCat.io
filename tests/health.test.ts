import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../src/app/api/health/route.ts";

test("health endpoint reports a cache-free healthy service", async () => {
  const response = await GET();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    service: "postcat",
    status: "ok",
  });
});
