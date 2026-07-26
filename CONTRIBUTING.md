# Contributing / 参与贡献

Keep changes focused, evidence-backed, and compatible with the Agent Skills specification. Do not copy third-party branding or publish private repository data.

变更应范围明确、有证据支持并兼容 Agent Skills 规范。不要复制第三方品牌，也不要公开私人仓库数据。

```bash
npm test
npm run validate
gh skill publish --dry-run
claude plugin validate plugins/repo-polish
```

Update English and Simplified Chinese user documentation together. Explain the problem, evidence, validation, risk, and rollback path in each pull request.

中英文用户文档应同步更新；Pull Request 需说明问题、证据、验证、风险和回滚路径。
