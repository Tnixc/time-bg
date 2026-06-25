// Generates assets/day-cycle.png — 24 vertical slices, one per hour of a
// representative day, for the README and quick visual testing. Run with:
//   vp dlx esbuild scripts/preview.ts --bundle --platform=node --format=esm \
//     --external:sharp --outfile=scripts/.preview.mjs && node scripts/.preview.mjs
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import { generatePng } from "../lib/image.ts";
import { getSkyColors } from "../lib/sky-color.ts";

const SLICE_W = 56;
const SLICE_H = 640;
const FOOTER_H = 30;
const HOURS = 24;
const WIDTH = SLICE_W * HOURS;

// Representative day (minutes from midnight): sunrise 06:30, sunset 19:30, with
// dawn/dusk spread so each twilight lands on an hour mark in the strip.
const times = {
	dawn: 5 * 60,
	sunrise: 6 * 60 + 30,
	sunset: 19 * 60 + 30,
	dusk: 21 * 60,
};

const slices = await Promise.all(
	Array.from({ length: HOURS }, (_, h) =>
		generatePng(getSkyColors(times, h * 60), SLICE_W, SLICE_H),
	),
);

const labels = Array.from(
	{ length: HOURS },
	(_, h) =>
		`<text x="${h * SLICE_W + SLICE_W / 2}" y="${SLICE_H + 20}" fill="#cbd5e1" font-family="monospace" font-size="14" text-anchor="middle">${String(h).padStart(2, "0")}</text>`,
).join("");
const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${SLICE_H + FOOTER_H}">${labels}</svg>`;

const out = await sharp({
	create: {
		width: WIDTH,
		height: SLICE_H + FOOTER_H,
		channels: 4,
		background: "#0b0b16",
	},
})
	.composite([
		...slices.map((input, h) => ({ input, left: h * SLICE_W, top: 0 })),
		{ input: Buffer.from(labelSvg), top: 0, left: 0 },
	])
	.png()
	.toBuffer();

mkdirSync("assets", { recursive: true });
await sharp(out).toFile("assets/day-cycle.png");
console.log("wrote assets/day-cycle.png", WIDTH, "x", SLICE_H + FOOTER_H);
