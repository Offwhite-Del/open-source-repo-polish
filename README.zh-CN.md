<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/repo-polish-hero-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/repo-polish-hero-light.svg">
  <img alt="Open Source Repo Polish — 先证据，后装饰" src="assets/repo-polish-hero-light.svg" width="100%">
</picture>

<div align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</div>

<div align="center">
  <a href="https://github.com/Offwhite-Del/open-source-repo-polish/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Offwhite-Del/open-source-repo-polish/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/Offwhite-Del/open-source-repo-polish/releases"><img alt="Release" src="https://img.shields.io/github/v/release/Offwhite-Del/open-source-repo-polish?display_name=tag&sort=semver"></a>
  <a href="LICENSE"><img alt="Apache-2.0 license" src="https://img.shields.io/github/license/Offwhite-Del/open-source-repo-polish"></a>
  <img alt="兼容 Agent Skills" src="https://img.shields.io/badge/Agent%20Skills-compatible-1f6feb">
</div>

Open Source Repo Polish 是一个跨 Agent Skill，用于把“功能可用”的仓库整理成清晰、可信、中英双语、方便参与贡献的开源项目，同时避免虚假徽章、品牌照搬和装饰性堆砌。

> **当前状态：** `v0.1.0`。内置审计只在本地只读运行、零遥测；除 Node.js 18+ 外没有运行时依赖。

## 为什么需要这个 Skill

仓库美化不等于“做一个漂亮 README”，而是让四个表面保持一致：

| 表面 | 核心问题 |
| --- | --- |
| 产品事实 | 访客能否理解项目做什么、不做什么？ |
| 上手路径 | 能否快速得到一个经过验证的结果？ |
| 信任 | 实证限制、安全边界、维护状态和贡献路径是否明确？ |
| 视觉层级 | 页面能否引导注意力，同时不抢走项目本身的焦点？ |

Skill 把 GitHub 仓库健康规范与三个基于公开资料重新归纳的设计镜头结合起来：

- **鲜明目的：**选择符合项目的具体视觉立场，拒绝通用 AI 模板。
- **技术温度：**平衡精确、几何秩序和人能读懂的语言。
- **平静层级：**优先清晰、一致、可访问和克制，而不是装饰。

它不会复制 Anthropic、OpenAI 或 Apple 的商标、字体、布局和受保护品牌资产。

## 快速开始

### GitHub CLI

GitHub CLI 2.90+ 可以把 Skill 安装到 Codex、Claude Code、Copilot、Cursor、Gemini CLI、OpenCode 等多种 Agent：

```bash
gh skill install Offwhite-Del/open-source-repo-polish \
  open-source-repo-polish --agent codex --scope user
```

将 `codex` 换成 `claude-code`、`github-copilot`、`cursor` 或其他受支持客户端即可。

## 作为插件安装

### ChatGPT 桌面端与 Codex 插件

```bash
codex plugin marketplace add Offwhite-Del/open-source-repo-polish \
  --sparse .agents/plugins \
  --sparse plugins
codex plugin add repo-polish@repo-polish
```

新建任务后调用 `$open-source-repo-polish`。

### Claude Code 与 Claude Code Desktop 插件

```bash
claude plugin marketplace add Offwhite-Del/open-source-repo-polish \
  --sparse .claude-plugin plugins
claude plugin install repo-polish@repo-polish
```

重载插件后调用 `/repo-polish:open-source-repo-polish`。

## 使用

对 Agent 说：

```text
使用 open-source-repo-polish 审计这个仓库，提出最小但价值最高的改进，
执行经过批准的修改，并验证最终结果。
```

也可以直接运行确定性审计：

```bash
node plugins/repo-polish/skills/open-source-repo-polish/scripts/audit-repo.mjs \
  --root . --json
```

脚本只读取已知的公开仓库表面，不读取 `.env`、认证文件、源代码、私人 Agent 会话或密钥值；不会联网，也不会修改文件。

## 审计示例

```text
Open Source Repo Polish 0.1.0
Root: /path/to/repository
Local readiness: 86/100
Findings: 2
- [medium] missing-quick-start: The README has no recognized quick-start heading.
- [low] missing-pr-template: No pull-request template was found.
```

分数只用于帮助导航。添加文件前，应结合项目成熟度和实际维护能力逐项判断。

## 安全与隐私

- 脚本只读取已识别的仓库文档与 Git 状态。
- 不读取源代码、`.env`、凭证、私人 Agent 会话或密钥值。
- 不访问网络，也不修改文件。
- 远端 GitHub 事实由 Agent 单独核验，不能从本地文件推断。

## 工作流

1. 明确仓库目的、受众、当前状态和发布成熟度。
2. 运行本地审计，并单独核验 GitHub 元数据。
3. 选择一个符合项目的明确设计方向。
4. 区分事实、推断、建议和阻塞。
5. 在分支上执行最小完整变更。
6. 渲染视觉资产，验证链接、测试、打包内容和密钥扫描。
7. 通过仓库正常 Pull Request 流程发布。

所有范围内发现被解决或都有一个明确阻塞时停止。检查表达到 100% 并不意味着应该继续添加装饰。

## 审计内容

- README、许可证、安全、支持、贡献、行为准则和变更日志
- Issue 与 Pull Request 模板
- 快速开始、安装、安全、实证/演示和双语导航信号
- 横幅/媒体、替代文本、徽章和本地链接完整性
- Git 分支和工作树状态

分数只是**本地就绪度启发式结果**，不是 GitHub Community Profile 分数，也不是质量保证。

## 项目结构

```text
plugins/repo-polish/skills/open-source-repo-polish/
  SKILL.md                       按需工作流
  references/                    设计、健康度与评价说明
  scripts/audit-repo.mjs         只读确定性审计
  agents/openai.yaml             Codex 界面元数据
.agents/plugins/                 Codex marketplace
.claude-plugin/                  Claude marketplace
test/                            审计行为测试
```

## 开发

```bash
npm test
npm run validate
gh skill publish --dry-run
claude plugin validate plugins/repo-polish
```

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)、[SECURITY.md](SECURITY.md) 和 [CHANGELOG.md](CHANGELOG.md)。

## 许可证

Apache License 2.0。链接的第三方设计资料仍受各自条款与商标约束。
