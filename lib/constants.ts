export interface SkyPhase {
	core: string; // warm inner color at the horizon (radial center)
	mid: string; // middle band
	edge: string; // cool outer color at the top and edges
}

// Palettes are sampled from the reference sunset studies: a warm core glowing
// at the horizon, a transitional mid band, and a cool edge fading out at the top.
export const SKY_PHASES = {
	night: { core: "#1c1c44", mid: "#101030", edge: "#070716" },
	dawn: { core: "#e8915c", mid: "#7e5f7a", edge: "#3a3463" },
	sunrise: { core: "#fc7c4b", mid: "#FCCE90", edge: "#f9d4b9" },
	day: { core: "#c6ecf5", mid: "#1290CF", edge: "#0561B1" },
	sunset: { core: "#fb8f4d", mid: "#FFBF89", edge: "#8d95b9" },
	dusk: { core: "#c96a8a", mid: "#6a3a6e", edge: "#241640" },
} as const satisfies Record<string, SkyPhase>;
