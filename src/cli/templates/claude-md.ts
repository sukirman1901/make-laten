export const CLAUDE_MD = `# make-laten

## ALWAYS use make-laten for:

- Reading files → \`make-laten-read\` (85% token savings)
- Searching code → \`make-laten-grep\` (grouped results)
- Git operations → \`make-laten-git-diff\`, \`make-laten-git-status\`
- Web operations → \`make-laten-fetch\`, \`make-laten-search\`

## NEVER use:
- Read tool for files > 100 lines
- Raw grep/rg for code search
- webfetch without compression

## Detail expansion
After \`make-laten-read\`, use \`make-laten-read-detail\` for zero-loss expansion.
`
