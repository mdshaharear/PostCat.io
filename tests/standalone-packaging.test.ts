import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("standalone packaging includes public and static assets", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "postcat-standalone-"));

  try {
    mkdirSync(join(fixtureRoot, ".next", "standalone"), { recursive: true });
    mkdirSync(join(fixtureRoot, ".next", "static"), { recursive: true });
    mkdirSync(join(fixtureRoot, "public", "products"), { recursive: true });
    writeFileSync(join(fixtureRoot, ".next", "static", "app.css"), "css");
    writeFileSync(join(fixtureRoot, "public", "products", "demo.svg"), "svg");

    execFileSync(
      process.execPath,
      [join(process.cwd(), "scripts", "prepare-standalone.mjs"), fixtureRoot],
      { stdio: "pipe" },
    );

    assert.equal(
      readFileSync(
        join(fixtureRoot, ".next", "standalone", ".next", "static", "app.css"),
        "utf8",
      ),
      "css",
    );
    assert.equal(
      readFileSync(
        join(fixtureRoot, ".next", "standalone", "public", "products", "demo.svg"),
        "utf8",
      ),
      "svg",
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});
