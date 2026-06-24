export interface DayTimes {
  dawn: number
  sunrise: number
  sunset: number
  dusk: number
}

export interface WeatherData {
  times: DayTimes
  nowMinutes: number
}

function parseTime(str: string): number {
  const clean = str.replace(/[+-]\d{4}$/, '')
  const [h, m] = clean.split(':').map(Number)
  return h * 60 + m
}

export async function getWeatherData(location: string): Promise<WeatherData> {
  const url = `https://wttr.in/${location}?format=%D+%S+%s+%d+%T`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`wttr.in returned ${res.status}`)
  const text = await res.text()
  const parts = text.trim().split(/\s+/)
  if (parts.length < 5) throw new Error(`unexpected wttr.in response: "${text}"`)
  return {
    times: {
      dawn:    parseTime(parts[0]),
      sunrise: parseTime(parts[1]),
      sunset:  parseTime(parts[2]),
      dusk:    parseTime(parts[3]),
    },
    nowMinutes: parseTime(parts[4]),
  }
}
