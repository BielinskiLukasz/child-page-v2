# Activity Updates

This document records scene-specific graphical overhauls and the reasons behind them. It also lists the original behaviour that must remain intact, reduced-motion handling, and checks that still require a real browser or device.

## Current Scope

| Activity | ID | Main implementation | Artwork / styles | Status |
|---|---|---|---|---|
| Ogród Motyli | `motyle` | [`src/activities/MotyleActivity.tsx`](src/activities/MotyleActivity.tsx) | [`src/activities/motyle.css`](src/activities/motyle.css), inline SVG and CSS | Illustrated meadow and butterfly overhaul complete |
| Dzień i Noc | `dzien-i-noc` | [`src/activities/DzienINocActivity.tsx`](src/activities/DzienINocActivity.tsx) | [`src/activities/dzien-i-noc.css`](src/activities/dzien-i-noc.css), inline SVG and CSS | Layered day/night landscape overhaul complete |
| Nocne Niebo | `niebo` | [`src/activities/NieboActivity.tsx`](src/activities/NieboActivity.tsx) | [`src/activities/niebo.css`](src/activities/niebo.css), inline SVG and CSS | Layered night-sky overhaul complete |
| Magiczny Ogród | `ogrod` | [`src/activities/OgrodActivity.tsx`](src/activities/OgrodActivity.tsx) | [`src/activities/ogrod.css`](src/activities/ogrod.css), inline SVG and CSS | Layered meadow overhaul complete |
| Akwarium Artura | `akwarium` | [`src/activities/AkwariumActivity.tsx`](src/activities/AkwariumActivity.tsx) | Procedural canvas rendering | Layered aquarium overhaul complete |

The remaining activities retain their existing scene artwork and shared player effects. They are not covered by these five scene-specific overhauls.

---

## 1. Ogród Motyli

### Overview

The butterfly garden was upgraded from five flat flowers on a plain cream-to-green gradient into an illustrated meadow scene. It still follows the original contract in [`child-page/docs/activities/ogrod-motyli.md`](child-page/docs/activities/ogrod-motyli.md): five large flowers sit at fixed positions in a square play area, touching a flower makes the butterfly fly to it along a smooth curve while the flower sways, and after 10–15 seconds of rest the butterfly flies to another flower by itself.

The implementation is split between [`src/activities/MotyleActivity.tsx`](src/activities/MotyleActivity.tsx) for the flight model, the flower and butterfly artwork, the generated scenery and the decorative effects, and [`src/activities/motyle.css`](src/activities/motyle.css) for art direction and decorative motion. The meadow is anchored to the square play area, so the horizon always sits at 36% of the square in portrait and landscape, while the sun, clouds and foreground grass follow the screen. All artwork is inline SVG or CSS; no image downloads or external assets were added.

### What Changed and Why

| Area | Change | Why |
|---|---|---|
| Sky | Replaced the flat gradient with a sky that fades from blue to a warm haze, a soft sun glow, a sun with slowly turning rays below the playtime hourglass, three slowly drifting clouds and six floating dandelion seeds. | Gives the garden a sense of place and gentle life without adding controls. |
| Landscape | Added two layered hills with soft rims and a few distant trees, and a meadow with a light horizon haze. The meadow has 34 grass tufts, small daisy specks near the horizon, clover patches and pebbles, generated once per launch. A foreground grass silhouette runs along the bottom of the screen. | Grounds the flowers in a meadow. Anchoring the meadow to the play square keeps the composition the same in every orientation. |
| Flowers | Rebuilt all five flowers. Each has gradient petals with a darker outline and a white centre vein, a soft drop shadow drawn as geometry, and a shaded core with a ring of stamens and a highlight. Each also has a curved two-tone stem, two veined leaves, and a grass tuft with a ground shadow at the base. Every flower now has its own petal shape: wide rounded (6 petals), slim daisy (8), notched heart (5), pointed star (7) and spoon (6). | Makes the flowers richer and easier to tell apart. The petal counts are unchanged, so the original non-colour cue remains. The five petal shapes add a second cue, and the two 6-petal flowers now look different. The darker outlines target the contrast concern raised in PR #138 for pastel petals on a pale background. |
| Host flower | The flower the butterfly rests on gets a soft golden halo. It fades in on landing, breathes gently while the butterfly stays, and fades out on departure. | Shows which flower the butterfly chose and rewards the touch. |
| Butterfly | Redrew the butterfly with shaped fore- and hindwings, radial gradients from the chosen colour set, cream spots, veins and an eyespot in the forewing colour. The wings have a highlight and a white rim with a thin dark outer edge. The body is segmented, with slowly wiggling antennae and a small friendly face. | Makes the main character more appealing and readable on both sky and meadow. |
| Depth | In flight, the butterfly grows by up to 8% and its soft shadow moves further away, grows and fades. On landing, the shadow returns to a small contact shadow on the petals. | Gives a gentle sense of altitude without changing the flight path. |
| Pollen | A short trail of glowing pollen follows the butterfly in flight, and a small pollen puff bursts from the flower when it lands. Both use a fixed pool of 24 particles drawn in one SVG. | Gives a clear, calm cause-and-effect cue for every flight. |
| Rendering | The butterfly's CSS `drop-shadow` filter was replaced with drawn outlines, so the flapping wings no longer need re-filtering every frame. Decorative CSS motion pauses through a `.paused` class when the tab is hidden. | Keeps the richer scene inexpensive on low-end tablets. |

### Preserved Behaviour

- All six flight and timing constants are identical to the original: `OMEGA` 2.2, `TURN` 0.55 rad, `SWAY_MS` 2,200 ms, `SWAY_AMP` 7°, and an automatic flight after 10–15 seconds of rest.
- The five flower positions and petal counts are identical to the original, as are the six flower colour sets and six butterfly colour sets. Both sets are still chosen with `pickOne` under the keys `motyle-flowers` and `motyle-butterfly`, so the same set never appears on two launches in a row.
- The butterfly still starts on flower 1 and uses the same critically damped spring with a rotated pull and an alternating curve side. It redirects mid-flight without a jump and snaps to the flower when it is closer than 0.006 and slower than 0.03.
- Touching the flower the butterfly is on or heading to only sways it and restarts the idle timer.
- The wing flap (0.6 + 0.4 × cos, at 4.5π rad/s in flight and 1.8π at rest) is unchanged. So are the velocity tilt clamped to ±15° and the 2.2-second damped sway around a point below the flower.
- The play square remains `min(94vw, 100dvh − 110px)` with a 60 px top margin. Each flower remains a button of 22% of the square with a 72 px minimum, labelled "Kwiatek 1" to "Kwiatek 5", with the same pointer and Enter/Space handling. The butterfly is still `aria-hidden` and not a touch target.
- Decorative layers use `pointer-events: none`. The new grass tuft and ground shadow at each stem base also ignore input. A flower can therefore still be triggered by its button, stem and leaves, as before; the second leaf adds a small extra area below the right side of the button.
- Hidden time still does not count toward the idle timer, and the loop stops while the tab is hidden.
- There is still no score, failure state, sound or completion.

### Reduced Motion

As in the original, the butterfly flight, wing flaps and flower sway are JavaScript-driven and are not reduced; this documented limitation is unchanged. The new decorative effects respect the setting: the pollen trail and landing puff are never created, and the dandelion seeds are hidden. The global rule stops the drifting clouds, sun rays, antenna wiggle and halo breathing, which become static, and the host halo appears and disappears instantly. The altitude scale and shadow still follow the flight.

These rules follow the code path but have not been visually verified in a browser in this environment.

### Known Limitations

- Butterfly flight and flower sway still ignore `prefers-reduced-motion`.
- The meadow details (clover, pebbles, daisy specks), clouds, sun and seeds are decorative. A child may touch them and nothing happens.
- The butterfly's face is tiny at the smallest sizes and only reads on larger screens.
- The altitude shadow is stylised rather than cast on a real surface; when the butterfly flies over the sky, the shadow floats below it.
- Some colour sets can still put similar pastels on neighbouring flowers. The petal outlines, counts and shapes reduce this but do not remove it, and contrast has not been measured.
- On very wide, short windows (more than four play-square widths wide), the ends of the hills become visible as a flat horizon.
- Flowers keep only their number as an accessible name.

---

## 2. Dzień i Noc

### Overview

The day/night scene was upgraded from a flat sky with a plain sun and moon into an illustrated landscape that changes with the time of day. It still follows the original contract in [`child-page/docs/activities/dzien-i-noc.md`](child-page/docs/activities/dzien-i-noc.md): touching the sun brings a smooth 3.5-second night, touching the moon brings the day back, touching the sky sends a cloud drifting by, birds fly during the day, and at night new stars slowly appear while a satellite or plane occasionally passes.

The implementation is split between [`src/activities/DzienINocActivity.tsx`](src/activities/DzienINocActivity.tsx) for the transition, birds, clouds, stars, night flyers and the artwork components, and [`src/activities/dzien-i-noc.css`](src/activities/dzien-i-noc.css) for art direction and decorative motion. The existing rAF loop still sets one progress variable, `--p` (0 = day, 1 = night). A second variable, `--dusk`, peaks halfway through the change. All colour changes in the sky, landscape, clouds and sun follow these two variables. A temporary flat dusk overlay from an earlier polish pass was moved out of `src/index.css` and replaced by a horizon sunset band. All artwork is inline SVG or CSS; no image downloads or external assets were added.

### What Changed and Why

| Area | Change | Why |
|---|---|---|
| Day sky | Replaced the two-colour gradient with a deeper blue sky that fades to a warm haze at the horizon, a soft top glow and a warm glow around the sun. | Gives the day a clear light source and depth. |
| Sunset | Added a warm violet-pink-orange band behind the hills that is strongest halfway through the change. Clouds get a pink underside, the hills a warm tint and the sun a deeper orange at the same moment. `--dusk` now ranges from 0 to 1. | Turns the 3.5-second transition into a recognisable sunset or sunrise instead of a plain cross-fade. |
| Night sky | Added violet and teal nebula tints, a faint Milky Way band and a soft moon glow. | Makes the night calmer and richer without bright flashes. |
| Stars | The original seeded stars and the slowly added stars now twinkle in three independently animated layers. The brightest stars have a soft glow and four-point sparkle spikes. A rare shooting star crosses the night sky every 27 seconds. | Keeps the original "living sky" idea and makes it easier to notice. |
| Landscape | Added three layered hills with rims, a pond with lily pads and reeds, front grass, a cottage with a flower box, a fence, an apple tree, a pine and three groups of tulips. A day copy and a night copy of the landscape cross-fade with `--p`: tulips are open by day and closed buds at night, cottage windows light up, chimney smoke rises, and fireflies glow over the meadow. | Shows the time-of-day change on the ground as well as in the sky, in a way a young child can read. |
| Pond reflection | Added a shimmering glitter path on the pond under the sun and moon: gold by day, silver by night. | Links the sky to the landscape and gives a calm motion detail. |
| Sun | Replaced the flat disc and stroke rays with a shaded sun with a halo, slowly rotating rounded rays, a highlight and a friendly face. | Makes the main control an inviting character that pairs with the existing sleeping moon. The original sun had no face. |
| Moon | Kept the original sleeping face and added a shaded disc, craters with rims, a highlight, rosy cheeks, a halo and two "z" shapes that float up at night. | Makes the night state readable at a glance and keeps the bedtime theme. |
| Sun and moon motion | While they cross-fade, the sun sinks and the moon rises by 10% of the button size. The button itself does not move. A short pressed-state scale gives tactile feedback. | Suggests setting and rising without moving the touch target. |
| Clouds | Rebuilt clouds with a soft shadow, white body, highlight, a moonlit blue tint at night and a pink sunset underside. Depth now uses an opacity factor instead of a per-cloud CSS brightness filter. | Clouds stay readable at night and take part in the sunset. Removing the per-cloud filter avoids re-filtering seven moving elements during the transition. |
| Birds | Redrew the birds with a tail, two-tone wings with darker tips, a belly, beak, eye glint and cheek. Each bird gets one of four soft colour palettes (bluebird, robin, canary or lilac). | Makes the flock friendlier and easier to tell apart while keeping the original flap animation. |
| Night flyers | The plane is now a small silhouette, facing its direction of travel, with a red tail light. The satellite is a small body with two solar panels and a soft glow. Both replace the original 3.5 px dots. | Makes the rare night visitors recognisable as a plane or a satellite. |
| Rendering | The night landscape copy is a separate layer whose content stays static, so only its opacity changes during the transition. Smoke, fireflies, pond glitter, twinkle, rays, "z" shapes and the meteor are compositor-friendly CSS animations, and they pause through the existing `.paused` class when the tab is hidden. A static scene vignette replaces the generic stage light overlay. | Keeps the richer scene inexpensive on low-end tablets. |

### Preserved Behaviour

- All 15 timing and limit constants are identical to the original: 3,500 ms transition (1,200 ms under reduced motion) with smoothstep easing, 3 ambient and at most 7 clouds, a 20 s bird crossing with a 2.6 s loop, a new star every 15–30 s growing over 8 s up to 160, and a night flyer every 20–45 s (satellite 18 s, plane 12 s, 0.7 s light pulse).
- A touch on the sun goes to night when progress is below 0.5 and to day otherwise. During the transition, touches on the sun/moon and the sky are ignored, while bird touches still work.
- There is still one sun/moon button at 50% / 42% with the size `clamp(150px, 38vmin, 320px)`. Its label switches between "Słońce" and "Księżyc" at progress 0.5.
- A sky touch still adds a cloud entering from −30 vw at the touched height (minus 8%, clamped to 2–70%). The landscape is decorative and non-interactive, so touching it also adds a cloud, matching the original, where the whole screen is sky.
- Birds: a flock of 2–3 appears only when day is fully reached, flies in lanes that avoid the sun/moon box, is respawned 0–1.5 s after a bird leaves, and is removed once night begins. Touching a bird makes it loop away from the sun/moon.
- The first 100 stars still come from the fixed seed 7 and look the same on every visit. Added stars still grow from 1 px in 8 s.
- Only one night flyer can exist at a time. It appears only at full night, is not touchable and is removed when day returns.
- Keyboard: Enter/Space on the sun/moon toggles the time of day, and Enter/Space on a bird starts its loop.
- There is still no score, failure state, sound or completion.

### Corrections and Earlier Deviations

- **Star layout restored.** The React port had changed the order of the random draws in the seeded star generator, so the fixed layout differed from the original app. The draw order now matches the original (`bright, x, y, size, opacity`), and a scripted check confirms that the first 100 stars match exactly.
- **Stars centred.** Every star is now centred on its position. This fixes the documented inconsistency where the initial stars had no centring transform but the added stars did.
- **Cloud depth (retained deviation).** Since an earlier polish pass, each cloud gets a depth factor based on its random width: its speed is multiplied by 0.7–1.3 and its displayed size by 0.78–1.2. Effective speeds are therefore about 1.1–3.1 vw/s for ambient clouds and 2.2–4.2 vw/s for touch-added clouds, instead of the original 1.6–2.4 and 3.2 vw/s. Night cloud opacity now falls to about 0.6 instead of 0.4, because clouds are tinted blue at night.

### Reduced Motion

The transition still runs in 1.2 seconds. Because the sky, landscape and cloud colours and the sun sink and moon rise all follow `--p`, they still change during that shorter transition. The global reduced-motion rules stop CSS animations, so the rays, twinkle layers and pond glitter become static, and fireflies stay as softly glowing still dots. The meteor, chimney smoke and floating "z" shapes are hidden. As in the original, ambient clouds stay still, and a sky touch creates a static cloud that disappears after 6 seconds. Birds and night flyers remain JavaScript-driven and still move.

These rules follow the code path but have not been visually verified in a browser in this environment.

### Known Limitations

- The cottage, trees, flowers and fireflies are decorative. A child may touch them expecting a reaction; a touch there adds a cloud.
- Birds in the lower flight lane can cross in front of the landscape.
- In short landscape windows the landscape is at least 66 px tall, so small details such as reeds and the flower box can be hard to see.
- Decorative CSS animations in the hidden landscape copy keep running underneath the visible copy (for example, the day glitter at night and the night fireflies during the day). They are lightweight compositor animations but have not been profiled on low-end devices.
- The plane does not tilt along its slight diagonal path.
- The generic stage light overlay is disabled with `:has()`. In browsers without `:has()` support, the generic overlay and the scene vignette are both shown.
- The friendly sun face is a new character design and is not part of the original activity.

---

## 3. Nocne Niebo

### Overview

The night sky was upgraded from a single gradient with plain dots into a layered, illustrated bedtime scene. It still follows the original contract in [`child-page/docs/activities/nocne-niebo.md`](child-page/docs/activities/nocne-niebo.md): ten constellations appear in shuffled rounds, stars can be lit in any order, an edge draws itself when both of its stars are lit, and completing a shape shows praise and enables **Dalej**.

The implementation is split between [`src/activities/NieboActivity.tsx`](src/activities/NieboActivity.tsx) for constellation data, state, accessible controls, generated backdrop data and the ten completion illustrations, and [`src/activities/niebo.css`](src/activities/niebo.css) for art direction and decorative motion. The earlier temporary shooting-star and constellation-name rules were moved out of `src/index.css` into `niebo.css`. All artwork is inline SVG or CSS; no image downloads or external assets were added.

### What Changed and Why

| Area | Change | Why |
|---|---|---|
| Sky | Added soft violet, teal and twilight nebula tints, a faint Milky Way band, 111 background stars in three independently twinkling layers, 72 band specks and five coloured accent sparkles placed outside the play square. | Gives the scene depth and atmosphere while keeping the constellation the brightest element. |
| Play-area lens | Added a soft, dark radial pool behind the constellation square. | Keeps decorative stars from competing with the tappable stars. |
| Moon | Added a sleepy crescent moon with craters, a closed eye, a blush and a slowly breathing halo, placed below the playtime hourglass. | Provides a gentle focal point and links the activity to the calm bedtime theme. |
| Horizon | Added two layered hill silhouettes with moonlit rims, four distant village lights, a cottage with a warm window, a small group of trees and a telescope pointing at the sky. The horizon is lower in landscape. | Gives the sky a sense of place and a simple story cue ("looking at the stars") without adding controls. |
| Shooting stars | Replaced the earlier thin streaks with two glowing meteors that cross behind the constellation every 23 and 31 seconds. | Rare, calm surprises that do not interrupt play. |
| Tappable stars | Unlit stars are small cool-blue star shapes with a slowly breathing dotted ring, each in its own phase. Lit stars grow into warm gold stars with a halo, diffraction spikes, a glint and a one-time light burst. | Makes "touch me" and "already lit" readable at a glance without text. |
| Lines | Replaced the dashed guide with a dotted trail that disappears under lit edges, and draws each lit edge as a crisp core line over a soft glow. The glows breathe gently after completion. | Clearer progress and a warmer glow without relying on CSS filters on SVG child elements, which render inconsistently in Safari. |
| Completion reward | Added a golden nebula fill, an illustrated figure for each of the ten shapes (car, bear, house, cat, fish, decorated tree, heart, sailing boat, smiling star and kite) that fades in behind the lines, a small light that travels around the outline, and ten sparkles that burst from the centre of the shape. | Rewards finishing a shape and helps a young child recognise what the stars drew. |
| Praise and Dalej | Restyled the praise in the rounded display font with a soft glow, the constellation name in a pill and two twinkling sparkles. **Dalej** is now a golden pill with an arrow and starts a gentle glow after 2.2 seconds. | Makes the next step easier to notice while keeping the text short and optional. |
| Transition | The sky now fades and slightly scales during the original 800 ms change between shapes. | Softens the change without altering its timing. |
| Rendering | Backdrop positions are generated once per launch. Each twinkle layer is a separate SVG whose opacity animates as a whole, and decorative motion pauses with the existing `.paused` rule when the tab is hidden. | Keeps the richer scene inexpensive to animate on low-end tablets. |

### Preserved Behaviour

- There are still exactly ten shapes with the original star coordinates, ring counts and extra edges: car 10 stars, bear 8, house 7, cat 8, fish 9, tree 11, heart 8, boat 7, star 10 and kite 6.
- Stars can be lit in any order; tapping an already lit star does nothing.
- An edge draws over 0.9 seconds as soon as both of its stars are lit.
- A shape is complete when every star is lit; there are no wrong taps, failure states, scores or sounds.
- **Dalej** remains the only way forward. It disables itself, fades the sky for `FADE_MS` = 800 ms, builds the next shape and accepts input again 800 ms later; double taps and taps during the change are ignored.
- Every shape appears once per round in random order, and the first shape of a new round is never the last shape of the previous round.
- Star and line coordinates still share one square 0–100 space, and the sky remains a square of `min(94vw, 100dvh − 76px)`, so shapes are never distorted.
- Star buttons remain 56 × 56 px, keep the label "Gwiazdka" and keep the React port's `aria-pressed` lit state. The praise region is still `aria-live="polite"`, with praise at the top and **Dalej** at the bottom right.
- Decorative layers use `pointer-events: none`; only the stars and **Dalej** are controls.
- The activity still reports no completion to Analytics because the original documentation defines it as open-ended. The shared `win-spark` effect is therefore not triggered; the local sparkle burst is used instead.

### Reduced Motion

The global reduced-motion rules disable CSS animations and transitions. Lines, fills, lit stars and completion figures appear instantly, while background twinkle, the invitation rings, moon and window glow, line breathing and the **Dalej** glow become static. Meteors, the travelling outline light, the completion sparkles and the per-star light burst are hidden. The 800 ms JavaScript timers between shapes still run.

These rules follow the code path but have not been visually verified in a browser in this environment.

### Known Limitations

- Star spacing is unchanged: the closest pairs (house 10 units, car 12, tree 14, fish 16) still make neighbouring 56 px targets overlap on phones.
- The completion figures are decorative approximations aligned to the fixed star coordinates and are not described to screen readers; all stars still share the label "Gwiazdka".
- In short landscape windows, the lowest stars of the house, heart, tree and kite can sit in front of the horizon silhouette. They remain fully tappable.
- Background stars are decorative and non-interactive. A child may still try to tap them, although they are much smaller and dimmer and sit under the lens.
- The praise still contains the fixed name "Artur".

---

## 4. Magiczny Ogród

### Overview

The garden was upgraded from a flat sky-and-lawn composition into a layered, illustrated meadow. The activity still follows the original contract in [`child-page/docs/activities/magiczny-ogrod.md`](child-page/docs/activities/magiczny-ogrod.md): one of eight weather/time combinations is selected per launch, touching the lawn grows a random plant, and touching the drifting cloud gently clears the garden.

All artwork is inline SVG or CSS. No image downloads, fonts, or other external assets were added for this activity.

### What Changed and Why

| Area | Change | Why |
|---|---|---|
| Landscape | Added three rolling hill layers, distant tree silhouettes, subtle highlights, and a soft meadow contour. | Replaces the flat lawn with depth while retaining the original interactive lawn area in the bottom 45% of the scene. |
| Sky and weather palettes | Added separate illustrated gradients for sunny, cloudy, and rainy scenes in both day and night variants. Rain slightly desaturates the landscape. | Makes all eight original weather/time combinations visually distinct instead of recolouring one generic background. |
| Sun and moon | Replaced the flat orb with a shaded disc, highlight, and halo. The sun has slowly rotating rays; the moon has subtle craters. | Gives the sky a focal point without adding another required interaction. |
| Clouds | Rebuilt both weather banks and the reset cloud from layered SVG puffs with underside shading and a soft highlight. | Keeps the original cloud-clear interaction while making the cloud readable as a friendly illustrated object. |
| Meadow detail | Added 42 grass tufts generated once per launch, foreground blade silhouettes, and 14 dew drops on suitable sunny or breezy days. | Adds texture and small discoveries without crowding the interactive plant layer. |
| Rain | Restyled the original 30 drops and added three reflective puddles with slow expanding rings below the plants. | Makes rain affect the ground as well as the sky while leaving planting taps unobstructed. |
| Breeze | Kept the original wind streaks and added seven drifting seed-fluff particles. | Gives the breeze a second, gentle motion cue at meadow level. |
| Night | Kept the original 40 stars and fireflies, and added three low, translucent mist wisps. Plants retain a soft night glow. | Builds a calm nocturnal atmosphere without bright flashes or an intense particle effect. |
| Ambient life | Added two tiny, slowly travelling daytime birds, hidden at night and during rain. | Makes the garden feel alive even before the child plants anything. |
| Plants | Rebuilt all seven original kinds with shaded stems, leaf veins, petal/cap gradients, highlights, pollen, mushroom gills, and a ground-contact shadow. The seed now includes a small soil mound. | Makes flowers and mushrooms more distinct and readable while preserving their original categories and growth sequence. |
| Clear feedback | Added a single expanding pale ring during the original 900 ms clear/fade and planting lock. | Gives the cloud touch a visible consequence without changing game rules or adding text. |
| Rendering and lifecycle | Decorative geometry is generated once per launch. Existing plant limits, timers, cleanup, and visibility-based animation pause are retained. | Keeps the richer scene bounded and prevents animation work from continuing in a hidden tab. |

### Preserved Behaviour

- The weather pool is still four weather types × day/night, selected with `pickOne(..., 'ogrod-weather')`, so the same combination does not immediately repeat.
- There are still exactly seven plant kinds: four flowers and three mushrooms, using the original pastel and cap colour palettes.
- Plant scale remains random from 0.8 to 1.2, positions remain percentages of the garden, and plants remain bottom-centred on the tapped point.
- Live plants remain capped at 20, simultaneous fading plants at 6, and removal remains timer-based after 900 ms.
- The original growth classes and timeline are retained: seed, stem, leaves, and bloom use the same delays and durations as before.
- The reset cloud still drifts for 80 seconds, clears all live plants, and locks planting for 900 ms.
- The interactive lawn still occupies the bottom 45%; decorative layers and the plant layer do not intercept pointer input.
- Keyboard behaviour is unchanged: Enter/Space on the lawn plants at a random valid position, and Enter/Space on the cloud clears the garden.
- There is still no score, failure state, sound, required reading, or completion state.

### Reduced Motion

The global reduced-motion rules disable CSS animations and transitions, so plants appear fully grown and clearing completes without the animated fade. The reset cloud remains available in a static position. Birds, drifting seeds, puddle rings, sun-ray rotation, and the clear ring are hidden; mist becomes a static translucent layer.

These rules are present in the implementation, but their final appearance has not been visually verified in this environment.

### Known Limitations

- This is procedural SVG/CSS illustration, not a hand-painted asset set. Fine details may look different at low resolutions or high device pixel ratios.
- Decorative birds, seeds, and mist are intentionally non-interactive. Only the lawn and reset cloud are activity controls.
- Multiple plants still overlap freely near the 20-plant limit, as in the original activity.
- The cloud remains the only way to clear the garden.

---

## 5. Akwarium Artura

### Overview

The aquarium was redesigned from a simple blue canvas with basic fish silhouettes into a layered, animated underwater scene. It remains a calm, open-ended touch experience: tapping the water drops food, while tapping a fish releases bubbles and makes that fish react.

The entire scene is rendered procedurally by [`src/activities/AkwariumActivity.tsx`](src/activities/AkwariumActivity.tsx); no external artwork is required.

### What Changed and Why

| Area | Change | Why |
|---|---|---|
| Water | Replaced the simple two-colour gradient with a five-stop water-column gradient, soft surface reflections, and four slowly drifting light shafts. | Adds depth and an underwater sense of place without external images or a busy composition. |
| Static background | Added distant rock silhouettes, far corals, a wavy sand edge, seven sand ripples, scattered pebbles, and three shells. This artwork is rendered once into an offscreen canvas and reused until resize. | Makes the scene feel illustrated while avoiding redrawing static detail every animation frame. |
| Aquatic plants | Replaced the original five simple stems with nine tapered, leafy blades arranged in three depth layers. Their shapes are procedural and their sway has different phases. | Adds foreground, middle-ground, and background depth while keeping the scene responsive at any aspect ratio. |
| Reef life | Added four branching corals, two anemones with 11 moving tentacles each, a subtly pulsing starfish, a wandering jellyfish, and 46 pieces of drifting plankton. | Gives the child more calm details to discover and makes the aquarium feel inhabited before the first touch. |
| Fish | Reworked the basic body-and-triangle fish into shaded fish with a two-lobed hinged tail, dorsal, pelvic, and pectoral fins, a gill arc, reflective eye, blink, and a mouth that opens while eating. | Makes fish easier to read as characters and their movement and reactions more expressive. |
| Fish variety | Preserved 2–8 fish per launch, selected from 45 unique shape/colour combinations, and added four body patterns: stripes, spots, pale belly, and plain. | Keeps launches varied while allowing a small number of recognizable, distinct fish. |
| Food and fish reactions | Food now has a small highlight and gentle sideways drift as it sinks. Eating produces a small sand-coloured particle puff and a mouth-opening reaction. | Gives the existing cause-and-effect interaction a clearer visual finish. |
| Crab | Added a small crab that walks along the sand, pauses, moves toward nearby food that has reached the bottom, and reacts with a chewing motion when it eats. | Adds a second, easy-to-understand character interaction at the bottom of the aquarium. |
| Touch response | Touches create expanding water rings. Fish touches still release bubbles and nudge the fish, and now also trigger a temporary blush. Bubbles have a soft radial highlight and pop into a fading ring near the surface. | Makes every touch visibly register while keeping the interaction simple and silent. |
| Animation and lifecycle | Dynamic elements share one `requestAnimationFrame` loop with capped time steps. Static artwork is cached separately. The loop pauses when the document is hidden, and listeners and the resize observer are removed on cleanup. | Keeps motion coordinated, avoids hidden-tab work, and prevents duplicate loops when the activity is reopened. |

### Preserved Behaviour

- Fish still choose the nearest uneaten food pellet and steer toward it with a capped turning rate.
- Tapping an empty part of the water drops food; tapping near a fish produces bubbles instead.
- There is no score, failure state, sound, or mandatory completion.
- Food remains limited to 10 pellets, with a 28 px/s fall speed in normal motion, a 6-second resting lifetime, and a 25-second maximum age.
- Fish bubbles remain limited to 30 on screen; touch ripples are limited to 10 and particle puffs to 60.
- Fish, plants, food, and bubbles stay in the same CSS-pixel coordinate space as pointer input and are redrawn for the current viewport size.

### Reduced Motion

With `prefers-reduced-motion: reduce`, fish and bubbles move at 60% speed, light shafts are removed, plant sway and tail wag stop, and moving scale shimmer is disabled.

Water-surface reflections, pectoral fins, crab legs, and the jellyfish still animate. Full reduced-motion coverage therefore remains a follow-up rather than a verified accessibility guarantee.

### Known Limitations

- Fish patterns are assigned deterministically from each fish's index and shape rather than independently randomized.
- Fish and crab can target the same food at the same time; there is no reservation or collision avoidance.
- The canvas is exposed as one labelled image, not as separate accessible fish or food objects, and has no keyboard interaction.
- The scene is procedural canvas artwork, not a hand-painted illustration; details can vary across device sizes and pixel ratios.
- Some decorative motion still runs with reduced motion enabled, as listed above.

---

## 6. Shared Player UI

These elements belong to [`src/components/Player.tsx`](src/components/Player.tsx) and the shared styles, not to any scene's simulation.

### What Is `act-hint-badge`?

`act-hint-badge` is a generic **player overlay**, not an asset of any individual activity. It is the pulsing circular touch hint defined in [`src/index.css`](src/index.css) and rendered by the Player over any activity.

If the player receives no pointer input for about 3.2 seconds, it shows a 92 px translucent white circle containing a purple tap/ripple symbol. It is decorative (`aria-hidden` and `pointer-events: none`) and hides on the first pointer-down anywhere in the document. It does not alter the activity simulation or create a second touch target. Keyboard input alone does not currently dismiss it.

### Other Shared Feedback

- `stage-ripple` gives a soft visual response at the pointer position.
- `win-spark` particles respond to activity and level completion events reported through Analytics. Activities that report no completion, such as Ogród Motyli, Nocne Niebo and Dzień i Noc, do not trigger them.
- A short vibration is attempted on supported devices; unsupported browsers safely ignore it.
- These effects sit outside the activities' gameplay rules and do not add scoring, sound, or failure states.

---

## 7. Validation

### Completed Checks

- `npx tsc --noEmit` passes.
- `npm run build` passes.
- The original activity IDs, constellation/weather/plant/fish data and limits, pointer interactions, keyboard controls where present, timers, resize handling, visibility pause, and cleanup remain represented in the React implementations.
- A scripted comparison confirms that all 15 Dzień i Noc timing and limit constants are identical to `child-page/js/dzien-i-noc.js`, and that the first 100 seeded stars match the original generator exactly.
- A scripted comparison confirms that the six Ogród Motyli flight and timing constants, the five flower positions and petal counts, and all twelve colour sets match `child-page/js/motyle.js`.
- All ten Nocne Niebo shapes have a matching completion illustration.
- `src/index.css` imports the shared activity styles before `src/activities/ogrod.css`, `src/activities/niebo.css`, `src/activities/dzien-i-noc.css` and `src/activities/motyle.css`, allowing the scene-specific art direction to override the original rules.

### Manual Browser and Device Checks Still Required

**Ogród Motyli**

- Touch each flower. Check that the butterfly flies along a curve, the flower sways, the halo moves to the new flower, and a pollen trail and landing puff appear. Redirect the butterfly mid-flight and confirm there is no jump.
- Leave the butterfly resting for 10–15 seconds; check the automatic flight and that the halo follows it.
- Reopen the activity about seven times. Confirm that the flower and butterfly colour sets change, never repeat twice in a row, and stay readable against the sky, hills and meadow.
- Check 320 × 568, 640 × 360 and tablet sizes. The horizon should sit in the same place relative to the flowers, the sun and flowers should stay clear of the back button and hourglass, and the foreground grass should stay clear of the bottom flowers.

**Dzień i Noc**

- Toggle the sun and moon several times. Check the sunset colours halfway through, that the sun sinks and the moon rises inside a button that does not move, and that touches on the sun/moon and sky are ignored during the transition while bird touches still loop.
- Stay at night for at least 60 seconds. Check that new stars appear and grow, that a plane or satellite crosses (the plane facing its direction of travel in both directions, with a calm red light), and that the flyer disappears when day returns.
- Touch the sky and the landscape and check that clouds are added. Confirm that birds avoid the sun/moon box and remain tappable in front of the landscape.
- Check 320 × 568, 640 × 360 and tablet sizes for landscape height and detail, the pond glitter under the sun, and the cottage, trees and flowers near the screen edges.

**Nocne Niebo**

- Complete all ten shapes across two rounds. Confirm that each illustration aligns with its stars and appears only after completion, and that a new round never starts with the previous shape.
- Double-tap **Dalej** and tap stars during the fade; confirm that no shape is skipped and that taps are ignored.
- Check 320 × 568, 640 × 360 and tablet sizes for neighbouring-star overlap, the horizon behind low stars, and the moon and praise against the back button and hourglass.

**Magiczny Ogród**

- Open every weather/time combination and confirm that decorative layers never block lawn or cloud input.
- Grow all seven plant kinds, exceed 20 plants, and verify that the oldest plants fade and are removed correctly.
- Clear the garden repeatedly and confirm the 900 ms lock, fade, and keyboard behaviour.

**Akwarium Artura**

- Tap water and fish, verify food chasing and crab feeding, and check pellet and bubble caps during rapid multi-touch.

**All five**

- Test portrait, short landscape, rotation, browser zoom, and high device pixel ratios.
- Background and restore each activity to verify that animation resumes without a time jump or duplicate loop.
- Verify reduced motion on a real device, including which decorative motions still remain in the aquarium and Dzień i Noc, and that the Ogród Motyli butterfly still flies while its pollen effects are absent.
- Measure frame rate and touch latency on low-end Android and iOS hardware.

Visual appearance and frame rate on physical devices have not been manually verified in this environment.
