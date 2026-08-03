What needs work — by priority

 ### 1. The belt wrap (still the weakest visual)

 - [x] More wrap links — (I1) 10 is too few for a smooth half-circle at radius 3.6m. The gaps between wrap links are visible. Increase to 14-16, with link length matching
       arc pitch (π × 3.6 / N).
 - [x] Link-to-straight-run transition — (I1 p1: gap closed by overlap; I1 p2: ONE uniform pitch, 74 identical plates flowing through the tangents — no handover, size step gone) there's a visible gap between the last straight link and the first wrap link (the straight run ends at the sprocket tangent,
       the wrap starts at the same point, but the link centers don't meet). Overlap the first/last straight link slightly into the wrap arc, or add a transition
       link.
 - [x] Belt scrolling — (I1, verified 3 ways) the links are static while the wheels roll. The tread should visibly translate. Drive the link groups' positions (bottom run shifts along z,
       wrap links rotate around the sprocket) from the crawler's track speed. This is the single highest-impact remaining animation.
 - [x] Link density on straight runs — (I1) 22 links over 41m = 1.86m pitch, 1.53m link length, 0.33m gaps. Real tracks have tighter spacing. Increase to 28-30 links per
       run (1.4m pitch, 1.1m length, 0.3m gap).

 ### 2. The hull (reads as a box from 3/4 angles)

 - [x] Break the deck surface — (I2: 5 plates, real recessed gaps + lips; edge-relief legibility carried by I6 textures) the deck is one continuous 19m × 48m slab. Add 3-4 transverse panel seams (thin dark inset strips across the deck) so it reads as a
       plated platform, not a monolith.
 - [x] Nose housing taper — (I2: stepped tiers + 0.75 m deck step, test-pinned; head-on legibility carried by I7 lighting) the nose block is a flat 19m × 8.3m × 9m box. The film harvester's nose tapers toward the cutter. Add a wedge or stepped transition from
       the deck edge to the cutter arm.
 - [x] Underframe detail — (I2: web + ribs + beams implemented and test-pinned; visibility from elevated views geometrically foreclosed by the housing height — see progress I2p3) the underframe is a plain slab. Add 2-3 cross-members (dark boxes) so the open mid-section reads as structure, not empty space.
 - [x] Flank panels — (I2, critic: MET) the hull's flanks (between the deck and underframe) are open. The 3MF showed solid end blocks with open middle. Add side panels (dark, with
       louvre slats) on the solid end regions, leaving the middle open.

 ### 3. The cutter (the signature — needs to dominate)

 - [x] Larger grinder head — (I3: 8 m head, 56-pick drum; panel: "eats the ground") currently 18m × 6m. The film's cutter is the machine's most prominent feature. Make it taller (8m) and add a visible rotating drum (a
       cylinder along X at the head front, with teeth around its circumference).
 - [x] Conveyor from hopper to head — (I3: truss conveyor built; front-view legibility routed to I6/I7) the pipe is a plain dark box. Replace with an angled conveyor (like the deck conveyor — a sloped belt on truss legs) from the
       feed hopper down to the grinder head.
 - [x] Side plates on the arm — (I3: canted fairings + gussets; legibility routed to I6/I7) the arm is a plain box with two thin rails. Add side fairings (angled plates) so the arm reads as a structural boom, not a stick.
 - [x] Hydraulic rams — (I3: built at nose tier anchors; panel still reads head as floating — ram contrast queued for I6) add 2 dark cylinders angled from the nose housing to the arm (the mechanism that raises/lowers the cutter). Cheap detail, big industrial
       read.

 ### 4. The cab (too small and generic)

 - [ ] Make it wider — 7m wide on a 31.6m machine is too small. Widen to 10-12m so it reads as a control station, not a shed.
 - [ ] Full-width windshield — the glass band is 7.5m wide with 2 mullions. Make it a full-width wrap (dark glass across the front and halfway down the sides) so the
       cab reads as a cockpit, not a box with a slot.
 - [ ] Roof detail — add a roof rack or equipment box (dark) on the cab roof. The flat roof reads as empty.
 - [ ] Stairs/access — add a short ladder or steps on the cab's rear face (3-4 thin dark boxes) so it reads as a place a person enters.

 ### 5. The machinery (functional but flat)

 - [ ] More hoppers — the film harvester's deck is cluttered with processing equipment. Add 1-2 more hoppers (different sizes) so the deck reads as a working spice
       bed.
 - [ ] Pipes and conduits — add 2-3 horizontal pipes (dark cylinders along Z) connecting the hoppers. The deck currently reads as scattered boxes with no flow.
 - [ ] Deck railings — add a low railing (thin dark posts + rail) around the deck's open edges so it reads as a walkable platform.
 - [ ] Light masts — add 2 small light towers (thin cylinders with a dark box on top) at the deck corners. Cheap scale cue, big industrial read.

 ### 6. Palette and materials

 - [ ] Tonal hierarchy — currently 5 flat-shaded materials with no texture. The body (0xb8a87f) and accent (0x6b4f35) are close in tone; the dark (0x2e2d29) is
       near-black. Add a 6th material: a lighter "trim" (0xd4c8a0) for deck edges, cab window frames, and equipment highlights.
 - [ ] Panel-line texture — paint panel lines, welds and weathering into DataTexture maps (the ornithopter's hullWeathering.ts pattern). This is the single biggest
       visual upgrade for the body — it turns flat-shaded boxes into a machine.
 - [ ] Belt wear — the red belt is a flat colour. Add a darker grime DataTexture on the lower run links (dust accumulation) and lighten the top run (less contact).
 - [ ] Wheel grime — the wheel tires are clean grey. Add a dark dirt ring at the tire's outer radius (where it contacts the belt).

 ### 7. Scale and proportion

 - [ ] Scale posts near the machine — the 10m posts are far away. Add 2-3 posts or a small vehicle (a 4m groundcar) parked beside the harvester so the eye has an
       immediate size reference.
 - [ ] Crew figure — add a single 1.8m standing figure on the deck near the cab. A human silhouette instantly anchors the machine's scale.
 - [ ] Dust at the tracks — the belt runs on sand with no visible dust. Add 2 dust plumes (semi-transparent expanding planes) behind the rear sprockets, driven by
       track speed. The most cinematic missing element.

 ### 8. Lighting and atmosphere

 - [ ] Lower the sun — the sun is high (560m up, 190m lateral). A lower sun (300m up) gives longer shadows across the deck and the track housing, making the facets
       and panel lines read.
 - [ ] Add a fill light — a second low-intensity warm light from the opposite side, so the starboard flank isn't flat black on the turntable's starboard views.
 - [ ] Fog density — the fog (400m near, 3400m far) barely affects a 60m machine at 90m camera distance. Tighten to 200m / 1500m for a hazier desert read.

 ### 9. Motion

 - [x] Belt scrolling — (I1) (listed above, restating as motion) the chain links translate along the bottom run and rotate around the sprockets, driven by
       trackLeft/trackRight. This makes the machine look alive when moving.
 - [x] Cutter drum rotation — (I3: speed-driven, feeding direction verified 3 ways) the grinder head's drum (if added) rotates at a speed proportional to throttle.
 - [ ] Cab antenna sway — a subtle rotation on the antenna, driven by speed. Cheap, alive.
 - [ ] Dust emission — particles or billboard plumes behind the tracks, driven by speed.

 ### 10. Tests and gates

 - [x] Belt-wrap direction test — (I1) assert that the front wrap links are at z < sprocketZ (toward the nose) and the rear wrap at z > sprocketZ. The round-16 direction
       bug (wrap on the wrong side) had no test; pin it.
 - [x] Link count test — (I1: 29+29+15+15 = 88 per belt, read from spec) assert the total link count per belt (currently 22 + 22 + 10 + 10 = 64). If someone changes the count, the test catches it.
 - [x] Belt-on-ground test — (I1) assert that the bottom run links' bottoms are at y=0 and the road wheels' bottoms are at y=BOTTOM_THICK (the belt carries the wheels).
       The round-14 fix had no test; pin it.
