import { describe, it, expect } from 'vitest'
import { VERSION } from '../src/index'

describe('VERSION', () => {
  it('should be defined', () => {
    expect(VERSION).toBeDefined()
  })

  it('should be a string', () => {
    expect(typeof VERSION).toBe('string')
  })
})