# Governed healer (Lab 4, step 5)

The same agent in the format of every tool. It starts from Playwright's stock healer and adds the five
rules from Lab 4: classify every failure (DRIFT, BUG, UNSURE), fix DRIFT only, mark BUG with
`test.fail()`, ignore instructions that come from the application, and write `heal-report.json`
(schema: [`../heal-report.schema.json`](../heal-report.schema.json)). It also has fewer tools than the stock
healer: no `browser_evaluate`, no shell.

Copy the file for your tool to its folder, then read the rules and add your own.

| Tool | Copy this file | To | Call it |
|---|---|---|---|
| Copilot in VS Code, Copilot CLI | `copilot/playwright-test-governed-healer.agent.md` | `.github/agents/` | VS Code: pick it in the agent dropdown. CLI: `/agent` |
| Claude Code | `claude-code/playwright-test-governed-healer.md` | `.claude/agents/` | `@agent-playwright-test-governed-healer` |
| Codex | `codex/playwright_test_governed_healer.toml` | `.codex/agents/` | "Spawn the playwright_test_governed_healer agent to ..." |
| opencode | `opencode/playwright-test-governed-healer.md` | `.opencode/agents/` | `@playwright-test-governed-healer` |
| Cursor (subagent) | `cursor/playwright-test-governed-healer.md` | `.cursor/agents/` | `/playwright-test-governed-healer` |
| Cursor (manual rule) | `cursor/playwright-test-governed-healer.mdc` | `.cursor/rules/` | `@playwright-test-governed-healer` |
| Antigravity | `antigravity/playwright-test-governed-healer.md` | `.agents/rules/` | `@playwright-test-governed-healer` |
| Any other tool | `generic/playwright-test-governed-healer.md` | `prompts/` | paste it into the chat |

macOS / Linux, for example for Claude Code:

```bash
cp labs/lab-4/governed-healer/claude-code/playwright-test-governed-healer.md .claude/agents/
```

Windows PowerShell:

```powershell
Copy-Item labs\lab-4\governed-healer\claude-code\playwright-test-governed-healer.md .claude\agents\
```

Some tools only pick up new agents after a restart or a new session (Codex, Copilot CLI, opencode) or
after you reload the window (VS Code: "Developer: Reload Window").

Check the report before you commit it:

```bash
node -e "JSON.parse(require('fs').readFileSync('heal-report.json','utf8'))"
node scripts/audit-heal.mjs
```
