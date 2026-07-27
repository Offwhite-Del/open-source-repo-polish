import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import { auditRepository } from "../plugins/repo-polish/skills/open-source-repo-polish/scripts/audit-repo.mjs";

function tempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "repo-polish-test-"));
}

function write(root, relative, content = "x\n") {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

test("a complete public surface scores highly without reading secrets", () => {
  const root = tempRepo();
  write(root, "README.md", `# Example\n\n[简体中文](README.zh-CN.md)\n\n![Hero](assets/hero.svg)\n\n## Quick start\n\n## Install\n\n## Demo\n\n## Safety\n\n## Contributing\n`);
  write(root, "README.zh-CN.md", "# 示例\n");
  write(root, "assets/hero.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"/>\n");
  for (const file of ["LICENSE", "SECURITY.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SUPPORT.md", "CHANGELOG.md", ".github/PULL_REQUEST_TEMPLATE.md", ".github/ISSUE_TEMPLATE/bug.yml"]) write(root, file);
  write(root, ".env", "SECRET_DO_NOT_REPORT=hidden\n");

  const report = auditRepository(root);
  assert.ok(report.score.value >= 90);
  assert.equal(report.privacy.envFilesRead, false);
  assert.doesNotMatch(JSON.stringify(report), /SECRET_DO_NOT_REPORT|hidden/);
  assert.equal(report.readme.brokenLocalLinks.length, 0);
});

test("a sparse repository receives actionable findings", () => {
  const root = tempRepo();
  const report = auditRepository(root);
  const ids = report.findings.map((item) => item.id);
  assert.ok(ids.includes("missing-readme"));
  assert.ok(ids.includes("missing-license"));
  assert.ok(report.score.value < 30);
});

test("broken local links and missing alt text are detected", () => {
  const root = tempRepo();
  write(root, "README.md", "# Example\n\n![](assets/missing.svg)\n\n[Guide](docs/missing.md)\n");
  const report = auditRepository(root);
  assert.deepEqual(report.readme.brokenLocalLinks, ["assets/missing.svg", "docs/missing.md"]);
  assert.equal(report.readme.imagesMissingAlt, 1);
  assert.ok(report.findings.some((item) => item.id === "broken-local-links"));
});

test("repository-relative links remain valid inside the audit root", () => {
  const root = tempRepo();
  write(root, "README.md", "# Example\n\n[Guide](docs/guide.md)\n\n[Portable guide](docs\\guide.md)\n");
  write(root, "docs/guide.md", "# Guide\n");
  const report = auditRepository(root);
  assert.deepEqual(report.readme.brokenLocalLinks, []);
  assert.deepEqual(report.readme.unsafeLocalLinks, []);
});

test("parent traversal is unsafe even when the outside target exists", () => {
  const parent = tempRepo();
  const root = path.join(parent, "repository");
  fs.mkdirSync(root);
  write(parent, "outside.md", "private context\n");
  write(root, "README.md", "# Example\n\n[Outside](../outside.md)\n\n[Portable outside](..\\outside.md)\n");
  const report = auditRepository(root);
  assert.deepEqual(report.readme.brokenLocalLinks, []);
  assert.deepEqual(report.readme.unsafeLocalLinks, ["../outside.md", "..\\outside.md"]);
  assert.ok(report.findings.some((item) => item.id === "unsafe-local-links"));
});

test("encoded traversal and absolute filesystem links are unsafe without exposing the absolute path", () => {
  const parent = tempRepo();
  const root = path.join(parent, "repository");
  fs.mkdirSync(root);
  write(parent, "outside.md", "private context\n");
  const outside = path.join(parent, "outside.md");
  write(root, "README.md", `# Example\n\n[Encoded](..%2Foutside.md)\n\n[Double encoded](..%252Foutside.md)\n\n[Absolute](${outside})\n\n[Windows](C:\\Users\\Example\\secret.md)\n\n[Drive relative](C:secret.md)\n\n[UNC](\\\\server\\share\\secret.md)\n\n[File URL](file:///private/example.md)\n`);
  const report = auditRepository(root);
  assert.deepEqual(report.readme.unsafeLocalLinks, ["../outside.md", "<absolute-path>", "<file-url>"]);
  assert.deepEqual(report.readme.brokenLocalLinks, ["..%2Foutside.md"]);
  const escapedParent = parent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.doesNotMatch(JSON.stringify(report.readme.unsafeLocalLinks), new RegExp(escapedParent));
});

test("a repository link cannot escape through a symlink", () => {
  const parent = tempRepo();
  const root = path.join(parent, "repository");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  write(parent, "outside.md", "private context\n");
  fs.symlinkSync(path.join(parent, "outside.md"), path.join(root, "docs", "outside.md"));
  write(root, "README.md", "# Example\n\n[Outside](docs/outside.md)\n");
  const report = auditRepository(root);
  assert.deepEqual(report.readme.unsafeLocalLinks, ["docs/outside.md"]);
});

test("web, mail, fragment, and data links are outside local containment", () => {
  const root = tempRepo();
  write(root, "README.md", "# Example\n\n[Web](https://example.com)\n\n[Mail](mailto:maintainer@example.com)\n\n[Section](#example)\n\n![Inline](data:image/svg+xml;base64,PHN2Zy8+)\n");
  const report = auditRepository(root);
  assert.deepEqual(report.readme.brokenLocalLinks, []);
  assert.deepEqual(report.readme.unsafeLocalLinks, []);
});

test("picture sources do not require alt text when the fallback image has it", () => {
  const root = tempRepo();
  write(root, "README.md", `<picture>\n<source media="(prefers-color-scheme: dark)" srcset="dark.svg">\n<img alt="Project hero" src="light.svg">\n</picture>\n`);
  write(root, "dark.svg");
  write(root, "light.svg");
  const report = auditRepository(root);
  assert.equal(report.readme.imagesMissingAlt, 0);
  assert.equal(report.readme.brokenLocalLinks.length, 0);
});

test("CLI runs when invoked through a symlinked path", () => {
  const root = tempRepo();
  write(root, "README.md", "# Example\n");
  const linkedScript = path.join(root, "audit-repo.mjs");
  fs.symlinkSync(new URL("../plugins/repo-polish/skills/open-source-repo-polish/scripts/audit-repo.mjs", import.meta.url), linkedScript);
  const result = spawnSync(process.execPath, [linkedScript, "--root", root, "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).tool, "open-source-repo-polish/0.1.2");
});

test("symlinked README is refused", () => {
  const root = tempRepo();
  write(root, "real.md", "# Example\n");
  fs.symlinkSync(path.join(root, "real.md"), path.join(root, "README.md"));
  const report = auditRepository(root);
  assert.equal(report.files.readme, false);
});
