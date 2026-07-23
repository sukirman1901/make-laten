export const CLAUDE_MD = `# make-laten

## ALWAYS use make-laten for:

- Reading files → \`read\` tool (85% token savings)
- Searching code → \`grep\` tool (grouped results)
- Git operations → \`git-diff\`, \`git-status\` tools
- Web operations → \`fetch\`, \`search\` tools

## NEVER use:
- Read tool for files > 100 lines
- Raw grep/rg for code search
- webfetch without compression

## Detail expansion
After \`read\`, use \`read-detail\` for zero-loss expansion.
`