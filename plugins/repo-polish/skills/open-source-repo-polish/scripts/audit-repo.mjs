#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VERSION = "0.1.2";

class UsageError extends Error {}

function regularFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function safeRead(filePath, maxBytes = 1_000_000) {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new UsageError(`Refusing non-regular file: ${filePath}`);
  if (stat.size > maxBytes) throw new UsageError(`File exceeds ${maxBytes} byte limit: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

function firstExisting(root, names) {
  for (const name of names) {
    const candidate = path.join(root, name);
    if (regularFile(candidate)) return candidate;
  }
  return null;
}

function directoryHasFiles(directory, pattern = () => true) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true }).some((entry) => entry.isFile() && pattern(entry.name));
  } catch {
    return false;
  }
}

const rendererPathEntities = new Map([
  ["bsol", "\\"],
  ["colon", ":"],
  ["num", "#"],
  ["percnt", "%"],
  ["period", "."],
  ["quest", "?"],
  ["sol", "/"],
]);

function decodeRendererPathEntities(value) {
  return value.replace(/&#(?:[xX]([0-9a-fA-F]{1,6})|([0-9]{1,7}));|&([A-Za-z][A-Za-z0-9]+);/g, (entity, hex, decimal, name) => {
    if (name) return rendererPathEntities.get(name) ?? entity;
    const codePoint = Number.parseInt(hex || decimal, hex ? 16 : 10);
    if (codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return "\uFFFD";
    return String.fromCodePoint(codePoint);
  });
}

function normalizeTarget(raw) {
  const withoutTitle = raw.trim().replace(/^<|>$/g, "").split(/\s+["']/)[0];
  const renderedTarget = decodeRendererPathEntities(withoutTitle);
  const withoutFragment = renderedTarget.split("#")[0].split("?")[0];
  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

function insideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function windowsAbsolute(target) {
  return /^(?:[A-Za-z]:|\\\\)/.test(target);
}

function safeUnsafeTarget(target) {
  if (path.isAbsolute(target) || windowsAbsolute(target)) return "<absolute-path>";
  if (/^file:/i.test(target)) return "<file-url>";
  return target;
}

function localLinkFacts(root, readmePath, content) {
  const links = [];
  const images = [];
  for (const match of content.matchAll(/(!?)\[([^\]]*)\]\(([^)]+)\)/g)) {
    const record = { alt: match[2], target: match[3] };
    links.push(record);
    if (match[1] === "!") images.push(record);
  }
  for (const match of content.matchAll(/<(img|source|a)\b[^>]*(?:src|srcset|href)="([^"]+)"[^>]*>/gi)) {
    const tag = match[0];
    const record = { alt: tag.match(/\balt="([^"]*)"/i)?.[1] || "", target: match[2] };
    links.push(record);
    if (/^<img\b/i.test(tag)) images.push(record);
  }
  const brokenLocalLinks = [];
  const unsafeLocalLinks = [];
  const realRoot = fs.realpathSync(root);
  for (const link of links) {
    const target = normalizeTarget(link.target);
    if (!target || target.startsWith("#")) continue;
    if (path.isAbsolute(target) || windowsAbsolute(target) || /^file:/i.test(target)) {
      unsafeLocalLinks.push(safeUnsafeTarget(target));
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const portableTarget = target.replace(/\\/g, "/");
    const resolved = path.resolve(path.dirname(readmePath), portableTarget);
    if (!insideRoot(root, resolved)) {
      unsafeLocalLinks.push(target);
      continue;
    }
    if (!fs.existsSync(resolved)) {
      brokenLocalLinks.push(target);
      continue;
    }
    try {
      if (!insideRoot(realRoot, fs.realpathSync(resolved))) unsafeLocalLinks.push(target);
    } catch {
      brokenLocalLinks.push(target);
    }
  }
  return {
    linkCount: links.length,
    imageCount: images.length,
    imagesMissingAlt: images.filter((image) => !image.alt.trim()).length,
    brokenLocalLinks: [...new Set(brokenLocalLinks)].sort(),
    unsafeLocalLinks: [...new Set(unsafeLocalLinks)].sort(),
  };
}

function hasHeading(content, terms) {
  const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1].toLowerCase());
  return headings.some((heading) => terms.some((term) => heading.includes(term)));
}

function gitFacts(root) {
  try {
    const inside = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "true";
    if (!inside) return { repository: false, branch: null, dirty: null, remoteConfigured: false };
    const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim() || null;
    const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim().length > 0;
    let remoteConfigured = false;
    try {
      remoteConfigured = execFileSync("git", ["remote"], { cwd: root, encoding: "utf8" }).trim().length > 0;
    } catch {}
    return { repository: true, branch, dirty, remoteConfigured };
  } catch {
    return { repository: false, branch: null, dirty: null, remoteConfigured: false };
  }
}

function finding(id, severity, evidence, proposal) {
  return { id, severity, evidence, proposal };
}

export function auditRepository(rootInput = process.cwd()) {
  const root = path.resolve(rootInput);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new UsageError(`Root is not a directory: ${root}`);

  const readmePath = firstExisting(root, ["README.md", "README.MD", "README"]);
  const readme = readmePath ? safeRead(readmePath) : "";
  const localLinks = readmePath ? localLinkFacts(root, readmePath, readme) : { linkCount: 0, imageCount: 0, imagesMissingAlt: 0, brokenLocalLinks: [], unsafeLocalLinks: [] };
  const files = {
    readme: Boolean(readmePath),
    license: Boolean(firstExisting(root, ["LICENSE", "LICENSE.md", "LICENSE.txt"])),
    security: Boolean(firstExisting(root, ["SECURITY.md", ".github/SECURITY.md"])),
    contributing: Boolean(firstExisting(root, ["CONTRIBUTING.md", ".github/CONTRIBUTING.md"])),
    codeOfConduct: Boolean(firstExisting(root, ["CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md"])),
    support: Boolean(firstExisting(root, ["SUPPORT.md", ".github/SUPPORT.md"])),
    changelog: Boolean(firstExisting(root, ["CHANGELOG.md", "CHANGES.md", "HISTORY.md"])),
    pullRequestTemplate: Boolean(firstExisting(root, [".github/PULL_REQUEST_TEMPLATE.md", "PULL_REQUEST_TEMPLATE.md"])),
    issueTemplate: directoryHasFiles(path.join(root, ".github", "ISSUE_TEMPLATE"), (name) => /\.(?:md|ya?ml)$/i.test(name)),
  };
  const readmeSignals = {
    alternateLanguage: /README\.(?:zh|cn|ja|ko|es|fr|de|pt|ru)[^"')\s]*/i.test(readme),
    quickStart: hasHeading(readme, ["quick start", "getting started", "快速", "开始使用"]),
    installation: hasHeading(readme, ["install", "安装"]),
    safety: hasHeading(readme, ["security", "safety", "privacy", "安全", "隐私"]),
    evidenceOrDemo: hasHeading(readme, ["evidence", "demo", "example", "benchmark", "实证", "演示", "示例", "基准"]),
    contributing: hasHeading(readme, ["contribut", "贡献"]),
    topLevelHeading: /^#\s+\S/m.test(readme) || /<h1\b/i.test(readme) || /<img\b[^>]+alt="[^"]+"/i.test(readme.slice(0, 2000)),
    badgeCount: (readme.match(/shields\.io|actions\/workflows\/.+?badge\.svg/g) || []).length,
    mediaCount: localLinks.imageCount,
  };
  const git = gitFacts(root);
  const findings = [];

  if (!files.readme) findings.push(finding("missing-readme", "high", "No root README was found.", "Add a concise README with purpose, boundary, and a verified quick start."));
  if (!files.license) findings.push(finding("missing-license", "high", "No recognized license file was found.", "Choose an appropriate open-source license before describing the repository as open source."));
  if (!files.security) findings.push(finding("missing-security", "medium", "No security policy was found.", "Document the private vulnerability path and data that must not be posted publicly."));
  if (!files.contributing) findings.push(finding("missing-contributing", "medium", "No contribution guide was found.", "Add only the setup, validation, scope, and submission rules contributors need."));
  if (!files.issueTemplate) findings.push(finding("missing-issue-template", "low", "No issue template or issue form was found.", "Add a maintained template when structured reports would improve reproduction or privacy."));
  if (!files.pullRequestTemplate) findings.push(finding("missing-pr-template", "low", "No pull-request template was found.", "Add a short outcome, evidence, validation, and risk checklist."));
  if (files.readme && !readmeSignals.quickStart) findings.push(finding("missing-quick-start", "medium", "The README has no recognized quick-start heading.", "Put one verified first-result path near the top."));
  if (files.readme && !readmeSignals.installation) findings.push(finding("missing-installation", "medium", "The README has no recognized installation heading.", "Document the primary installation path before alternatives."));
  if (files.readme && !readmeSignals.safety) findings.push(finding("missing-safety-signal", "low", "The README has no recognized safety, security, or privacy heading.", "Surface material safety or privacy boundaries when they affect adoption."));
  if (files.readme && !readmeSignals.alternateLanguage) findings.push(finding("single-language-readme", "low", "No alternate-language README link was detected.", "Add a maintained translation only when the intended audience benefits."));
  if (localLinks.brokenLocalLinks.length) findings.push(finding("broken-local-links", "high", `${localLinks.brokenLocalLinks.length} local README targets do not exist.`, "Repair or remove every broken local target before publishing."));
  if (localLinks.unsafeLocalLinks.length) findings.push(finding("unsafe-local-links", "high", `${localLinks.unsafeLocalLinks.length} local README targets escape the repository root.`, "Use repository-relative targets whose lexical and resolved paths remain inside the repository."));
  if (localLinks.imagesMissingAlt) findings.push(finding("missing-image-alt", "medium", `${localLinks.imagesMissingAlt} README media elements have empty or missing alt text.`, "Add concise functional alternative text."));
  if (git.dirty) findings.push(finding("dirty-worktree", "medium", "The Git worktree contains uncommitted changes.", "Separate intended changes from unrelated user work before staging or publishing."));

  const points = {
    foundation: (files.readme ? 10 : 0) + (files.license ? 8 : 0) + (files.security ? 6 : 0) + (files.contributing ? 5 : 0) + (files.codeOfConduct ? 4 : 0) + (files.issueTemplate ? 4 : 0) + (files.pullRequestTemplate ? 3 : 0),
    onboarding: (readmeSignals.quickStart ? 8 : 0) + (readmeSignals.installation ? 7 : 0) + (readmeSignals.evidenceOrDemo ? 5 : 0) + (files.support ? 4 : 0) + (files.changelog ? 3 : 0) + (readmeSignals.alternateLanguage ? 3 : 0),
    presentation: (readmeSignals.topLevelHeading ? 4 : 0) + (readmeSignals.mediaCount ? 6 : 0) + (readmeSignals.badgeCount ? 4 : 0) + (localLinks.imagesMissingAlt === 0 ? 3 : 0) + (localLinks.brokenLocalLinks.length === 0 && localLinks.unsafeLocalLinks.length === 0 ? 3 : 0),
    trust: (readmeSignals.safety ? 4 : 0) + (readmeSignals.contributing ? 2 : 0) + (git.repository ? 2 : 0) + (git.dirty === false ? 2 : 0),
  };
  const score = Object.values(points).reduce((sum, value) => sum + value, 0);

  return {
    schemaVersion: 1,
    tool: `open-source-repo-polish/${VERSION}`,
    root,
    privacy: { sourceCodeRead: false, authFilesRead: false, envFilesRead: false, networkAccessed: false, filesChanged: false },
    score: { value: score, maximum: 100, kind: "local-readiness-heuristic", categories: points },
    files,
    readme: { ...readmeSignals, ...localLinks },
    git,
    findings,
  };
}

function parseArgs(argv) {
  const options = { root: process.cwd(), json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--root") {
      if (!argv[index + 1]) throw new UsageError("Missing value for --root");
      options.root = argv[++index];
    } else throw new UsageError(`Unknown argument: ${arg}`);
  }
  return options;
}

function textReport(report) {
  const lines = [
    `LaunchSieve ${VERSION}`,
    `Root: ${report.root}`,
    `Local readiness: ${report.score.value}/${report.score.maximum}`,
    `Findings: ${report.findings.length}`,
  ];
  for (const item of report.findings) lines.push(`- [${item.severity}] ${item.id}: ${item.evidence}`);
  return lines.join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write("Usage: audit-repo.mjs [--root PATH] [--json]\n");
    return;
  }
  const report = auditRepository(options.root);
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : `${textReport(report)}\n`);
}

const isDirect = process.argv[1]
  && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isDirect) {
  main().catch((error) => {
    process.stderr.write(`Repo Polish error: ${error.message}\n`);
    process.exitCode = 1;
  });
}
