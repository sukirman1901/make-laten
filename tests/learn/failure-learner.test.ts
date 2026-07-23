import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FailureLearner } from '../../src/learn/failure-learner.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('FailureLearner', () => {
  let learner: FailureLearner
  let tmpFile: string

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `make-laten-failures-${process.pid}-${Date.now()}.json`)
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
    learner = new FailureLearner({ persistencePath: tmpFile })
  })

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
  })

  it('should record failures', () => {
    learner.record({
      type: 'compress',
      error: 'File not found',
      context: { filePath: '/missing.ts' }
    })

    const failures = learner.getFailures()
    expect(failures.length).toBe(1)
    expect(failures[0].error).toBe('File not found')
  })

  it('should detect repeated failures', () => {
    for (let i = 0; i < 3; i++) {
      learner.record({
        type: 'compress',
        error: 'File not found',
        context: { filePath: `/missing${i}.ts` }
      })
    }

    const suggestions = learner.getSuggestions('compress')
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it('should provide recovery suggestions', () => {
    learner.record({
      type: 'compress',
      error: 'File not found',
      context: { filePath: '/missing.ts' }
    })

    const suggestions = learner.getSuggestions('compress')
    expect(suggestions.some(s => s.includes('check'))).toBe(true)
  })

  it('starts empty when persistence file is missing', () => {
    expect(learner.getFailures()).toEqual([])
  })
})
