# Character portraits — drop-in slot

The dialogue panel shows a small portrait next to whoever is speaking. By
default it draws a procedural, colour-coded box. Drop a real image in here
and the game will use it instead, automatically — no code change needed.

## Where to put a file

```
public/assets/portraits/<characterId>.png
```

`<characterId>` is the internal id from `src/data/characters.ts`, **not**
the character's display name. See the table below.

## Framing spec

- **Format:** PNG.
- **Shape:** square. **512×512** is the suggested size (any square works;
  the game renders it at 64×64 in the dialogue panel, scaled down).
- **Framing:** face-centered, head and shoulders, filling most of the
  frame — the image is cropped to a square with `object-fit: cover`, so
  anything near the edges may be trimmed.
- **Background:** anything; a plain or softly blurred background reads
  best at the small size the panel actually shows.

## What happens if a file is missing or fails to load

Nothing breaks. The game tries the image first; if it 404s (which is the
normal case — this folder ships empty), it falls back to the existing
procedural portrait automatically. Add files whenever you have them, in
any order, one at a time.

## Character id → display name

Only characters who actually speak in dialogue need an entry. The full
roster, from `src/data/characters.ts`:

| characterId  | Display name              | Where              |
|--------------|----------------------------|--------------------|
| `duke_armand`| Duke Leto Atreides         | Arrakeen           |
| `vell`       | Thufir Hawat               | Arrakeen           |
| `corvin`     | Count Fenring               | Arrakeen           |
| `shadir`     | Stilgar                    | Red Wall Sietch    |
| `ysane`      | Chani                      | Sietch Tabr        |
| `sova`       | Reverend Mother Ramallo    | Sietch Tabr        |
| `pell`       | Shishakli                  | Hagg               |
| `voss`       | Gurney Halleck             | Arrakeen           |
| `vast`       | Liet-Kynes                 | Hagg               |
| `maren`      | Lady Jessica                | Arrakeen           |
| `varn`       | Glossu Rabban               | Carthag            |
| `baron`      | Baron Vladimir Harkonnen    | Carthag            |
| `meko`       | Esmar Tuek                  | Tsimpo             |
| `sabiha`     | Harah                       | Cielago Depression |
| `orrin`      | Otheym                      | Cielago Depression |
| `krail`      | Overseer Krail              | Imperial Basin     |
| `dessin`     | Factor Dessin               | Imperial Basin     |
| `zurrah`     | Zurrah                      | Tsimpo             |
| `hallock`    | Sergeant Hallock            | Carthag            |
| `duncan`     | Duncan Idaho                 | Wind Pass          |

Example: to give Duke Leto a portrait, add
`public/assets/portraits/duke_armand.png`.

## Not covered by this slot

The seven generic faction conversations (harkonnen stronghold, fremen
sietch, and so on) draw an archetype box, not a named character's
portrait — they represent "whoever is currently in charge here," which
has no fixed face. This slot is for the named cast only.
