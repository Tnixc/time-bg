import { interpolate, converter, clampRgb, formatHex } from "culori";

// Perceptual colour mixing in OKLab (via culori). OKLab interpolates lightness
// and the a/b axes directly, so warm/cool transitions pass through a neutral
// midpoint instead of arcing through unrelated hues (the green that OKLCH's
// shortest hue path produced between the blue day palette and warm sunsets).

const toRgb = converter("rgb");

/** Blend two colours in OKLab and return a hex string. */
export function mixHex(a: string, b: string, t: number): string {
	return formatHex(interpolate([a, b], "oklab")(t));
}

export interface Ramp {
	/** sRGB bytes [r, g, b] at position t in [0,1]. */
	rgbAt(t: number): [number, number, number];
	/** Hex colour at position t in [0,1]. */
	hexAt(t: number): string;
}

/** A three-stop ramp (core -> mid -> edge, evenly spaced) interpolated in OKLab. */
export function makeRamp(core: string, mid: string, edge: string): Ramp {
	const interp = interpolate([core, mid, edge], "oklab");
	return {
		rgbAt(t) {
			const { r, g, b } = clampRgb(toRgb(interp(t)));
			return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
		},
		hexAt(t) {
			return formatHex(interp(t));
		},
	};
}
