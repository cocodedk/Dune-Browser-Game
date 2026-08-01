I could not find a publicly released studio blueprint or CAD file. The best reconstruction uses the licensed MENG model for scale, its assembly manual for part separation, and a rigged CC-licensed fan model for the mesh.

![Image](https://images.openai.com/static-rsc-4/KX_zhVFqE9ZZ1icfks7zxkCSkuKdguC10tyIAUxayPsHe55Hn4DY1f5vjgYT68sqdftX3hKlis3UslahDDS1AWff6xtRifqe3F1pMFhrctz0h9pWhKXs-YfnyQ3tM1UITusRdG0e4sEk6fQGJQ0S1y4Va4Og1dUBFMVHlCQ7yZx8jY9T0ifNsPA73wTvaX0B?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/XFZZobtlpFUhg3mLEApY5gfLKkc528RWtoRHRgs_D4Wpmzn2tij76caVLfvKhY1Kuiq8BMJxg22xCT595ilAbaN2YLxS1cYdtADiR7DfCljV5VzY0ZH5-EoWnwNAPiLm2VTy7n56iZ24yeElAiq9piBWbQ7AgRTiycV1lEkxNPvxP_euu654xOVp8yfDZJum?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/Fx2kR3yp1AxQyv6iVlmvC6u0HPbizWnvYiQiQ41DNzaa1wwvv2C9_2W45pw2O5K_OBUBKG0RmbYbUJdHQYck1caYUs7D-1JZe5n4ukxzPf4HMrSbyp-rPXnWboAqsDYTBqEru_CJga9yfXfN6hsAjxrd8O8pHNgEN_iPU0AU0dIuDcYbHroLf9LFZy9zProD?purpose=fullsize)

## Confirmed dimensions

MENG’s licensed 1:72 kit is 720 mm wide with the wings extended and 318 mm long. At full scale:

| Measurement         |                          Full-size value | Confidence                             |
| ------------------- | ---------------------------------------: | -------------------------------------- |
| Wingspan            |                                  51.84 m | High, derived from licensed model      |
| Nose-to-tail length |                                 22.896 m | High, derived from licensed model      |
| Number of wings     |                         8, four per side | High                                   |
| Wing movement       |         Rotate, retract, unfold and flap | High                                   |
| Cockpit             | Two pilots in front; larger cabin behind | High                                   |
| Landing system      |   Retractable landing feet and rear ramp | High                                   |
| Practical prop mass |                          About 11 tonnes | Prop only, not fictional aircraft mass |

The MENG mechanism allows corresponding left and right wing pairs to move together while each pair remains independently positionable. Its manual also separates the canopy, cockpit, fuselage shells, eight wings, wing linkages, ramp and landing gear. [MENG model details](https://www.meng-model.com/en/contents/59/618.html), [licensed kit measurements and features](https://kingshobby.com/store/atreides-ornithopter-dune-movie-meng-ds-007), [MENG assembly manual](https://www.manualslib.de/manual/1582326/Meng-Dune-Atreides-Ornithopter.html)

LEGO’s licensed model confirms the functional arrangement: folding and flapping wings, 180-degree wing retraction, retractable landing feet, rear ramp and opening cockpit. [LEGO specifications](https://www.lego.com/static/product/dune-atreides-royal-ornithopter-10327), [official LEGO instructions](https://www.lego.com/en-id/service/building-instructions/10327)

A University of Leicester study found no official specifications. Based on actor comparisons, it estimated each wing at 20 m including a 2 m root rod, approximately 2.5 m wide, moving through a total arc of about 20 degrees. These are useful estimates, but they conflict slightly with the larger MENG-derived span. [Physics study PDF](https://journals.le.ac.uk/index.php/pst/article/download/4178/3636/13443)

## Working Three.js dimensions

Use one Three.js unit as one metre. These values produce the correct overall proportions; values marked “estimated” should be adjusted against orthographic images.

```js
export const THOPTER_SPEC = {
  overall: {
    length: 22.896,
    wingspan: 51.84,
    bodyWidth: 5.4,       // estimated
    bodyHeight: 4.3,      // estimated, gear retracted
    landedHeight: 7.2,    // estimated
  },

  body: {
    cockpitLength: 5.8,
    cabinLength: 9.2,
    tailLength: 7.896,
    rampWidth: 2.8,
    rampLength: 3.3,
  },

  wing: {
    count: 8,
    rootArmLength: 3.0,
    bladeLength: 20.2,
    maxChord: 2.5,
    tipChord: 0.35,
    thickness: 0.08,
    flapHalfAngleDeg: 10, // approximately 20° total travel
  },

  landingGear: {
    strutLength: 3.0,
    footLength: 1.3,
  }
};
```

Treat 51.84 m as the target bounding-box width. A wing should reach roughly 25.92 m from the centreline. With the proposed 2.7 m half-body width, that leaves about 23.2 m for the root mechanism and blade.

## Required object hierarchy

Do not combine the craft into one mesh. Use this transform hierarchy:

```text
Ornithopter
├── Body
│   ├── CockpitCanopy
│   ├── RearRamp
│   └── LandingGear
└── WingRig
    ├── L0_Fold → L0_Flap → L0_Feather → L0_Blade
    ├── L1_Fold → L1_Flap → L1_Feather → L1_Blade
    ├── L2_Fold → L2_Flap → L2_Feather → L2_Blade
    ├── L3_Fold → L3_Flap → L3_Feather → L3_Blade
    └── mirrored R0–R3
```

Each wing needs three pivots:

* `Fold`: swings the wing backwards alongside the fuselage.
* `Flap`: moves it above and below the flight plane.
* `Feather`: rotates the blade around its long axis.
* The geometry’s origin must sit at the mechanical wing root.

Suggested extended sweep angles are `16°, 5°, -5°, -16°`. This fans the four blades slightly forward and aft instead of stacking them on one line.

## Wing animation

Adjacent wing pairs should alternate phase. Corresponding left and right wings use the same phase:

```js
const DEG = THREE.MathUtils.degToRad;

function animateWingFlight(wings, time, throttle = 1) {
  const frequency = THREE.MathUtils.lerp(4, 18, throttle);
  const amplitude = DEG(10);
  const featherAmplitude = DEG(22);

  wings.forEach((wing, index) => {
    const pairIndex = index % 4;
    const phase = pairIndex % 2 === 0 ? 0 : Math.PI;
    const cycle = time * Math.PI * 2 * frequency + phase;

    const flap = Math.sin(cycle) * amplitude;
    const feather = Math.cos(cycle) * featherAmplitude;

    wing.flap.rotation.z = wing.side * flap;
    wing.feather.rotation.x = feather;
  });
}
```

For deployment, interpolate the folding pivot from approximately 85–95 degrees backwards to its extended sweep angle:

```js
function setDeployment(wing, amount) {
  amount = THREE.MathUtils.smoothstep(amount, 0, 1);

  wing.fold.rotation.y = THREE.MathUtils.lerp(
    wing.foldedAngle,
    wing.extendedAngle,
    amount
  );

  wing.flap.rotation.z *= amount;
}
```

The film’s wings move too quickly to look convincing as eight sharply rendered meshes. DNEG used substantial digital motion blur; helicopter footage supplied the dust behavior and lighting reference. [DNEG production account](https://www.foundry.com/insights/film-tv/how-dneg-created-vfx-of-dune)

For real-time Three.js, use:

* Five to nine translucent copies of each wing distributed across the flap arc.
* Opacity around `0.04–0.12`.
* No shadows on the blurred copies.
* A dark metallic wing material with low roughness.
* A strong grazing-angle directional light to produce the characteristic flashes.
* Analytic wing positions rather than frame-by-frame animation, to reduce aliasing.

A fan reconstruction found that sharp glints depended on low wing roughness and very precise light angles. [Wing-animation experiment](https://undy567.artstation.com/projects/lRVePe)

## Materials

```js
const bodyMaterial = new THREE.MeshStandardMaterial({
  color: 0x292b26,
  metalness: 0.55,
  roughness: 0.72
});

const wingMaterial = new THREE.MeshStandardMaterial({
  color: 0x151816,
  metalness: 0.88,
  roughness: 0.24,
  side: THREE.DoubleSide
});

const canopyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x263438,
  metalness: 0.1,
  roughness: 0.18,
  transmission: 0.25,
  transparent: true,
  opacity: 0.58
});
```

The craft should look nearly black with a dark olive-khaki tint and heavy sand accumulation, rather than clean military green. A model builder who compared the kit with the film and official art book reached the same conclusion. [MENG model reference](https://spruepiewithfrets.wordpress.com/2024/07/20/call-it-dune-er-done-meng-1-72-atreides-ornithopter/)

## Fastest route to an accurate model

A downloadable fan model on Sketchfab is UV-mapped, rigged, 32,600 triangles and explicitly attempts to match the CGI version rather than the slightly different practical prop. It has a Creative Commons Attribution licence. [Rigged CGI-style model](https://sketchfab.com/3d-models/denis-villeneuve-dune-ornithopter-uv-rigged-2167c358e08143aa83f44c626e54c881)

Recommended pipeline:

1. Download its FBX.
2. Open it in Blender and scale the extended model to `51.84 × 22.896 m`.
3. Rename the eight wing pivots using the hierarchy above.
4. Separate fold, flap and feather transforms if the existing rig does not expose them.
5. Export as GLB with Meshopt or Draco compression.
6. Load it with `GLTFLoader`.
7. Drive the bones or pivot groups with the animation functions above.

There is also a lighter 14,000-triangle CC Attribution model, already fully rigged but without a cockpit. [14k rigged model](https://sketchfab.com/3d-models/dune-2021-ornithopter-rigged-fan-made-a3ce0992a5a34c19ae891bde6695d1e6)

The 32.6k model is the best starting point for a browser implementation. Rebuilding the entire angular fuselage procedurally in Three.js would take considerably longer and would still be less accurate than loading that mesh and controlling it through Three.js.

