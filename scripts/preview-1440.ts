// Generates assets/day-cycle-{location}.png — 1,440 vertical slices, one per
// minute of a representative day, annotated with real sun times from wttr.in.
// Run with:
//   vp dlx esbuild scripts/preview-1440.ts --bundle --platform=node --format=esm \
//     --external:sharp --outfile=scripts/.preview-1440.mjs \
//     && node scripts/.preview-1440.mjs [location]
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import { generatePng } from "../lib/image.ts";
import { getSkyColors } from "../lib/sky-color.ts";
import { getWeatherData } from "../lib/weather.ts";

const location = process.argv[2] || "Waterloo+Ontario";
const label = location.replace(/\+/g, " ");

let times: { dawn: number; sunrise: number; sunset: number; dusk: number };
try {
	const data = await getWeatherData(location);
	times = data.times;
} catch {
	console.warn(`failed to fetch data for "${label}", using fallback times`);
	times = { dawn: 5 * 60, sunrise: 6 * 60 + 30, sunset: 19 * 60 + 30, dusk: 21 * 60 };
}

const now = new Date();
const date = now.toISOString().slice(0, 10);
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

const fmt = (m: number) =>
	`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const annotation = `${label} — ${date} — sunrise ${fmt(times.sunrise)} / sunset ${fmt(times.sunset)}`;

const MINUTES = 1440;
const STRIP_W = 2;
const HEADER_H = 40;

const WIDTH = MINUTES * STRIP_W;
const TOTAL_H = Math.round(WIDTH * 670 / 1344);
const FOOTER_H = Math.round(30 * TOTAL_H / 670);
const STRIP_H = TOTAL_H - FOOTER_H - HEADER_H;

console.log(`output: ${WIDTH}x${TOTAL_H} (strips ${STRIP_W}x${STRIP_H}, header ${HEADER_H}, footer ${FOOTER_H})`);
console.log(`  times: dawn ${fmt(times.dawn)}, sunrise ${fmt(times.sunrise)}, sunset ${fmt(times.sunset)}, dusk ${fmt(times.dusk)}`);

const BATCH = 60;
const batchCount = MINUTES / BATCH;
const batchImages: { input: Buffer; left: number; top: number }[] = [];

for (let b = 0; b < batchCount; b++) {
	const offset = b * BATCH;
	const strips = await Promise.all(
		Array.from({ length: BATCH }, (_, i) =>
			generatePng(getSkyColors(times, offset + i), STRIP_W, STRIP_H),
		),
	);

	const batchWidth = BATCH * STRIP_W;
	const batchImage = await sharp({
		create: { width: batchWidth, height: STRIP_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
	})
		.composite(strips.map((input, i) => ({ input, left: i * STRIP_W, top: 0 })))
		.png()
		.toBuffer();

	batchImages.push({ input: batchImage, left: offset * STRIP_W, top: HEADER_H });
}

const fontSize = Math.round(14 * TOTAL_H / 670);
const headerFontSize = Math.round(16 * TOTAL_H / 670);

const hourLabels = Array.from(
	{ length: 24 },
	(_, h) =>
		`<text x="${h * 60 * STRIP_W + 30 * STRIP_W}" y="${STRIP_H + HEADER_H + Math.round(FOOTER_H * 0.7)}" fill="#cbd5e1" font-family="monospace" font-size="${fontSize}" text-anchor="middle">${String(h).padStart(2, "0")}</text>`,
).join("");

const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${TOTAL_H}">
  <rect x="0" y="0" width="${WIDTH}" height="${HEADER_H}" fill="#0b0b16"/>
  <text x="${Math.round(WIDTH / 2)}" y="${Math.round(HEADER_H * 0.7)}" fill="#94a3b8" font-family="monospace" font-size="${headerFontSize}" text-anchor="middle">${annotation}</text>
  ${hourLabels}
</svg>`;

const out = await sharp({
	create: { width: WIDTH, height: TOTAL_H, channels: 4, background: "#0b0b16" },
})
	.composite([
		...batchImages,
		{ input: Buffer.from(overlay), top: 0, left: 0 },
	])
	.png()
	.toBuffer();

const safeName = location.replace(/\+/g, "-");
mkdirSync("assets", { recursive: true });
await sharp(out).toFile(`assets/day-cycle-${safeName}.png`);
console.log(`wrote assets/day-cycle-${safeName}.png ${WIDTH} x ${TOTAL_H}`);
