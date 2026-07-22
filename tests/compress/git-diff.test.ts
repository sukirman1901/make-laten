import { describe, it, expect } from 'vitest'
import { GitDiffCompressor } from '../../src/compress/git-diff.js'

describe('GitDiffCompressor', () => {
  const compressor = new GitDiffCompressor()

  it('should condense git diff output', async () => {
    const input = {
      diff: `
diff --git a/src/main.ts b/src/main.ts
index 1234567..abcdefg 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,10 +1,12 @@
 import { foo } from './foo'
 import { bar } from './bar'
+import { baz } from './baz'
 
 function main() {
-  console.log('old')
+  console.log('new')
+  console.log('added')
 }
 
 export default main
      `.trim()
    }

    const result = await compressor.compress(input)
    
    expect(result.content).toContain('import { baz }')
    expect(result.content).toContain("console.log('new')")
    expect(result.confidence).toBeGreaterThan(0.8)
  })
})
