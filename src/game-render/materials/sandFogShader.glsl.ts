// src/game-render/materials/sandFogShader.glsl.ts
// Height-falloff fog override for the sand material — split out of
// sandShader.glsl.ts because this patches three's built-in fog chunk, not
// the sand-specific ones, and keeps that file under the line cap.
//
// Finding 1: FogExp2 applied uniformly with altitude turned dusk into "a flat
// mauve gradient with zero terrain, zero horizon, zero sun" — the same
// density sat on the crests as in the troughs. Scaling density down with
// world height instead pools haze in the troughs and clears the crests and
// skyline. See skyMath.ts's heightFogFactor for the tested TS mirror of the
// formula below; GLSL has no module system, so it cannot be shared directly.

/** Adds the one uniform three's own fog_pars_fragment chunk does not carry. */
export const SAND_FOG_DECLARATIONS = /* glsl */ `
uniform float uFogHeightScale;
`

/**
 * Replaces three's `#include <fog_fragment>` verbatim except for one line:
 * fogDensity is scaled by exp(-worldY / uFogHeightScale) before the standard
 * FogExp2 formula runs. The sky dome is untouched by this — SkyDome.ts's
 * material sets `fog: false`, so it was never subject to scene fog at all.
 */
export const SAND_FOG_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogHeightFactor = exp(-max(vWorldPosition.y, 0.0) / uFogHeightScale);
    float fogEffectiveDensity = fogDensity * fogHeightFactor;
    float fogFactor = 1.0 - exp(- fogEffectiveDensity * fogEffectiveDensity * vFogDepth * vFogDepth);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif
`
