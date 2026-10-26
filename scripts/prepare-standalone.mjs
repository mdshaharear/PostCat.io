import { cp, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function prepareStandalone(projectRoot = process.cwd()) {
  const root = resolve(projectRoot);
  const standalone = resolve(root, ".next", "standalone");
  const staticSource = resolve(root, ".next", "static");
  const publicSource = resolve(root, "public");

  await Promise.all([stat(standalone), stat(staticSource), stat(publicSource)]);
  await Promise.all([
    cp(staticSource, resolve(standalone, ".next", "static"), {
      force: true,
      recursive: true,
    }),
    cp(publicSource, resolve(standalone, "public"), {
      force: true,
      recursive: true,
    }),
  ]);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await prepareStandalone(process.argv[2]);
}
