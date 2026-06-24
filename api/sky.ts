import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getWeatherData } from '../lib/weather'
import { getSkyColors } from '../lib/sky-color'
import { generateSvg } from '../lib/image'
import { generatePng } from '../lib/image'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const location = (req.query.location as string) || 'Waterloo+Ontario'
  const format = (req.query.format as string) || 'png'
  const width = parseInt(req.query.width as string) || 1920
  const height = parseInt(req.query.height as string) || 1080

  try {
    const { times, nowMinutes } = await getWeatherData(location)
    const colors = getSkyColors(times, nowMinutes)

    if (format === 'svg') {
      const svg = generateSvg(colors, width, height)
      res.setHeader('Content-Type', 'image/svg+xml')
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
      return res.status(200).send(svg)
    }

    const buffer = await generatePng(colors, width, height)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
    res.status(200).send(buffer)
  } catch {
    const fallback = { core: '#e4f7bf', mid: '#c6ecf5', edge: '#8cc3ea' }
    if (format === 'svg') {
      const svg = generateSvg(fallback, width, height)
      res.setHeader('Content-Type', 'image/svg+xml')
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60')
      return res.status(200).send(svg)
    }
    const buffer = await generatePng(fallback, width, height)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60')
    res.status(200).send(buffer)
  }
}
