# Changelog / 变更日志

## [0.1.2] - Unreleased

- Reject README links that are absolute, escape the repository root, or resolve outside it through a symlink; redact absolute targets in audit output.
- 拒绝绝对路径、越过仓库根目录或经符号链接解析到仓库外的 README 链接，并在审计输出中隐藏绝对目标。

## [0.1.1] - 2026-07-26

- Fixed direct CLI execution when the installed Skill path contains filesystem aliases or symlinks, such as macOS `/tmp` → `/private/tmp`.
- 修复安装路径包含文件系统别名或符号链接时 CLI 静默不执行的问题，例如 macOS `/tmp` → `/private/tmp`。

## [0.1.0] - 2026-07-26

- Added the `open-source-repo-polish` cross-agent Skill.
- Added a local, read-only, zero-dependency repository audit with tests.
- Added Codex and Claude plugin marketplaces and bilingual documentation.
- 新增跨 Agent 仓库优化 Skill、只读零依赖审计、测试、Codex/Claude 插件市场与双语文档。

[0.1.1]: https://github.com/Offwhite-Del/launch-sieve/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Offwhite-Del/launch-sieve/releases/tag/v0.1.0
[0.1.2]: https://github.com/Offwhite-Del/launch-sieve/compare/v0.1.1...HEAD
