# The harvester's look — what the film shows, and what the 3MF measures

Two sources feed the build, with deliberately different authority:

- `harvester.3mf` — the MEASURED shape authority (proportions, block layout).
- the 2021 film — the ACT authority (what the machine does) and the source
  of two parts the 3MF lacks (the cutter, the cab).

## The film harvester, feature by feature

The Villeneuve harvester is not a vehicle so much as a factory that moves.
From the film (and its production stills), the signature reads, in order of
how much they matter to identification:

1. **Two massive continuous tracks.** The machine is a platform carried by
   two enormous track assemblies at the sides, each nearly as tall as the
   platform itself, far apart. The space BETWEEN the tracks is as much part
   of the silhouette as the tracks.
2. **The open deck.** The top is a long, flat, largely OPEN processing bed —
   grinding and conveyor machinery standing on it, no cabin roof. You can
   see under the deck between the tracks.
3. **The forward cutter.** A long low arm reaches ahead of the nose with a
   wide blunt head that dips into the sand. In the film the harvester is
   anchored to the spice bed by it — it is what the machine is doing when
   the worm arrives.
4. **A small raised cab** at the front of the deck — a control position, not
   a passenger cabin; low and squat against the mass behind it.
5. **Industrial desert palette**: warm sand body, near-black shadowed
   machinery and tracks, rusted-metal details, dust everywhere.

## What the 3MF measures (and what it is)

`harvester.3mf` is a fan-made "Dune Spice Harvester" (MakerLab "Image to 3D
v2", designer General_genius, BY-NC-SA, 2025-02-07). It is one
499,978-triangle mesh, no named parts, no per-part transforms — a 73.5mm
print, so its ABSOLUTE size is meaningless; only ratios transfer.

Measured with the same plate method the ornithopter shop used on its kit
(`tools/plate-to-outline.mjs`): parse the mesh, project, slice, cross-check.

**Orientation.** The slicer laid the model on its side. The file's axes are
length=X (73.498mm), width=Y (52.388mm), height=Z (22.321mm). As-printed
(the naive read) the model looks like a tower; re-oriented it is a
long, low machine — which is the first confirmation the orientation is
right.

**Ratios:** 3.29 : 2.35 : 1 (length : width : height).

**Block layout (from cross-sections every ~5mm along the length):**
- Two full-length track pods, each ~18% of the overall width, running the
  whole length at the sides, ground to deck height.
- A deck band across the top between the pods, and an underframe near the
  ground — the mid-section is open between them.
- Solid end blocks: a tall nose block and a tail block filling between the
  pods. The deck line is highest at the nose, gently lower over the middle,
  raised again at the tail.

**What the 3MF lacks:** no separate cutter boom ahead of the nose, no cab,
no wheels (the pods are solid). Those are film-derived additions.

## How the two are reconciled in the build

- Proportions and block layout: MEASURED from the 3MF, at an authored 48m
  hull scale (the film harvester is enormous; 48m is twice the ornithopter
  and reads huge against the test area's 10m posts).
- Cutter, cab, wheels, palette: FILM-derived, marked as such in
  provenance.ts.
- The machine's ACT (crawl, differential steer, terrain ride) is authored
  and unit-tested, per the film: slow, heavy, unstoppable.

If better references arrive — film stills, a print kit, a better model —
they belong in `.shots/reference/`, and every number they change gets a
MEASURED provenance entry. Until then, the 3MF ratios are the shape
authority and this file is the record of why.
