# 🚪 BEHIND THE DOOR
### A Psychological Horror Interactive Story Game
**Multimedia College Assignment**

---

## 📁 Project Structure

```
BehindTheDoor/
├── index.html          ← Main HTML (single page application)
├── style.css           ← All styles, animations, VFX
├── script.js           ← Game engine (Audio, FX, Story, Save)
├── assets/
│   ├── audio/          ← Drop .mp3/.ogg files here (optional)
│   └── images/         ← Drop scene images here (optional)
└── README.md
```

---

## 🎮 How to Run

Simply open `index.html` in any modern browser.  
**No server, no installation required.**

> Chrome/Edge recommended for best Web Audio API support.

---

## 🗺️ Story Map

```
START
 └─ s01_bedroom (Waking Up)
     └─ s02_knock (Three Knocks)
         ├─ A: Open Door → s03a
         │   ├─ A: Walk Toward It → s04a → s05a → s06_good_path → GOOD ENDING
         │   │                              └─ s05b (Light Switch) → JUMPSCARE → s06_basement_door
         │   │                                                         ├─ A: Descend → s07_descend → SECRET ENDING
         │   │                                                         └─ B: Run Outside → GOOD ENDING
         │   └─ B: Retreat → s04b → s05c (Door Inside) → BAD ENDING
         └─ B: Stay Silent → s03b
             ├─ A: Call Help → s04c
             │   ├─ A: Open Anyway → s05d → s06_secret_door → SECRET ENDING
             │   └─ B: Go to Window → s05e → s06_climb_out → GOOD ENDING
             │                          └─ B: Lock Window → BAD ENDING
             └─ B: Under Bed → s04d → s05f (Jumpscare) → BAD ENDING
```

### 🏆 Three Endings
| Ending | How to Get |
|--------|-----------|
| ✦ GOOD — "The Light Beyond" | Follow the path / run outside / climb out the window |
| ✗ BAD — "Still There" | Retreat, hide, or make fearful choices |
| ◈ SECRET — "The Loop" | Demand answers or find the black door |

---

## 🔧 Technical Features

| Feature | Implementation |
|---------|---------------|
| **Typewriter Effect** | `setInterval` character-by-character rendering |
| **Sound Effects** | Web Audio API synthesis (no files needed) |
| **Ambient Drone** | Oscillator nodes with frequency drift |
| **Glitch Effect** | CSS animation + `mix-blend-mode: exclusion` |
| **Screen Shake** | CSS `@keyframes` translate/rotate |
| **Light Flicker** | CSS opacity animation with `steps()` |
| **Jumpscare** | Flash + shake + audio sting combined |
| **VHS Overlay** | Animated SVG noise + CSS scanlines |
| **Save System** | `localStorage` auto-save on every scene |
| **Pause Menu** | ESC key or pause button |

---

## 🎨 Design Language

- **Palette:** Deep black (#050507) × Dark red (#c0392b) × Bone white (#f0ede8)
- **Fonts:** Cinzel Decorative (titles) · Crimson Text (body) · Share Tech Mono (UI)
- **Aesthetic:** VHS horror / cinematic / psychological thriller

---

## ➕ How to Extend the Story

1. Add a new scene object to `STORY` in `script.js`:
```js
my_new_scene: {
  id: 'my_new_scene',
  chapter: 'CHAPTER VII — NEW CHAPTER',
  bgClass: 'bg-hallway',   // CSS class from style.css
  speaker: 'NARRATOR',
  audio: 'knock',          // null | 'knock' | 'creak' | 'breathe' | 'heartbeat'
  fx: 'glitch',            // null | 'glitch' | 'shake' | 'flicker' | 'jumpscare'
  lines: [
    'First line of dialogue.',
    'Second line.',
  ],
  choices: [
    { text: 'A — Do something', next: 'some_scene_id' },
    { text: 'B — Do something else', next: 'another_scene_id' },
  ],
},
```

2. Add a custom background class to `style.css`:
```css
.bg-mybg {
  background-image: linear-gradient(/* your gradient */);
}
```

3. Wire it up by pointing any existing scene's `next` or `choices[].next` to your new scene id.

---

## 📋 Assignment Checklist

- [x] Modern dark horror UI
- [x] Responsive layout (mobile + desktop)
- [x] Smooth transitions and animations
- [x] Interactive story system (branching narrative)
- [x] Multiple endings (3: Good / Bad / Secret)
- [x] Sound effects and background ambience (Web Audio API)
- [x] Dialogue box system with speaker label
- [x] Choice buttons
- [x] Scene switching with background changes
- [x] Save simple progress in localStorage
- [x] Typing text effect (typewriter)
- [x] Glitch visual effects during scary moments
- [x] Background changes depending on scene
- [x] Minimalist but immersive design
- [x] 8+ scenes
- [x] Jumpscare/glitch moments
- [x] Suspense atmosphere
- [x] Typewriter dialogue animation
- [x] Screen shake effect
- [x] Flickering light animation
- [x] Interactive cursor hover effects
- [x] Pause menu (ESC key + button)
- [x] Restart system
- [x] Modular / OOP code structure
- [x] Comments on important code sections
- [x] VHS/noise/scanline overlay

---

*Made with 🖤 for Multimedia Class*
