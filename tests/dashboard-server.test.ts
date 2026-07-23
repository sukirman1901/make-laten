import { describe, it, expect } from 'vitest'
import { DashboardServer } from '../src/dashboard/server.js'
import http from 'http'

function fetch(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resolve({ status: res.statusCode || 0, body }))
    }).on('error', reject)
  })
}

describe('DashboardServer', () => {
  it('should serve dashboard HTML', async () => {
    const server = new DashboardServer({ port: 0 })
    const port = await server.start()
    
    try {
      const res = await fetch(`http://localhost:${port}`)
      expect(res.status).toBe(200)
      expect(res.body).toContain('make-laten')
      expect(res.body).toContain('<html')
    } finally {
      server.stop()
    }
  })

  it('should serve stats API', async () => {
    const server = new DashboardServer({ port: 0 })
    const port = await server.start()
    
    try {
      const res = await fetch(`http://localhost:${port}/api/stats`)
      expect(res.status).toBe(200)
      const data = JSON.parse(res.body)
      expect(data).toHaveProperty('summary')
      expect(data).toHaveProperty('requests')
    } finally {
      server.stop()
    }
  })

  it('should serve graph API', async () => {
    const server = new DashboardServer({ port: 0 })
    const port = await server.start()
    
    try {
      const res = await fetch(`http://localhost:${port}/api/graph`)
      expect(res.status).toBe(200)
      const data = JSON.parse(res.body)
      expect(data).toHaveProperty('nodes')
      expect(data).toHaveProperty('edges')
    } finally {
      server.stop()
    }
  })
})
