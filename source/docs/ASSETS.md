# Asset notices and licenses

## Scope of the MIT grant

The project's original source code, locally synthesized burst/tail/wind audio,
and procedural rose implementation are MIT-licensed by the project owner.
That grant does **not** license bundled music, third-party runtimes/models,
user-attested paid media, generated-model service outputs, or the OpenAI-made
rose photo. See `assets/licenses.json` for the machine-readable matrix.

## Required notices

### Three.js — MIT

The vendored Three.js runtime is distributed under the MIT License. Preserve
`assets/vendor/three/LICENSE` when redistributing it. Primary source:
<https://github.com/mrdoob/three.js/blob/dev/LICENSE>.

### MediaPipe Tasks Vision and Hand Landmarker — Apache-2.0

The vendored MediaPipe runtime/WASM and `hand_landmarker.task` are retained
under Apache License 2.0; preserve `assets/vendor/mediapipe/LICENSE`.
Primary license: <https://www.apache.org/licenses/LICENSE-2.0/>. Model card:
<https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf>.

### Music by Scott Buckley — CC BY 4.0

Credit **Scott Buckley**, link the work page and
<https://creativecommons.org/licenses/by/4.0/>, and indicate the changes
listed below. No endorsement is implied. The table below retains each shipped
track's credits and change notes.

| Shipped file | Work / official page | Current local change note |
| --- | --- | --- |
| `moonlight.mp3` | [Moonlight](https://www.scottbuckley.com.au/library/moonlight/) | Full recording; transcoded to 128 kbps stereo MP3/44.1 kHz. |
| `hope.mp3` | [A Kind Of Hope](https://www.scottbuckley.com.au/library/a-kind-of-hope/) | 12–87 s excerpt; transcode, constant gain, edge fades. |
| `computations.mp3` | [Computations in a Snowstorm](https://www.scottbuckley.com.au/library/computations/) | 25–100 s excerpt; transcode, constant gain, edge fades. |
| `reverie.mp3` | [Reverie](https://www.scottbuckley.com.au/library/reverie/) | 30–100 s excerpt; transcode, constant gain, edge fades. |
| `childhood.mp3` | [Childhood](https://www.scottbuckley.com.au/library/childhood/) | 0–100 s excerpt; transcode, constant gain, edge fades. |
| `celestial.mp3` | [Celestial](https://www.scottbuckley.com.au/library/celestial/) | 25–130 s excerpt; transcode, constant gain, edge fades. |
| `titan.mp3` | [Titan](https://www.scottbuckley.com.au/library/titan/) | 100–140 s excerpt; transcode, constant gain, edge fades. |
| `signal.mp3` | [Signal to Noise](https://www.scottbuckley.com.au/library/signal-to-noise/) | 40–115 s excerpt; transcode, constant gain, edge fades. |
| `snowfall.mp3` | [Snowfall](https://www.scottbuckley.com.au/library/snowfall/) | 28–103 s excerpt; transcode, constant gain, edge fades. |

All nine tracks use runtime level correction, programme envelopes, smooth
effects ducking, and a shared output ceiling. Playback speed and pitch are
unchanged. See Scott Buckley's [use information](https://www.scottbuckley.com.au/library/using-this-music/).

## Media not covered by the MIT grant

- **Tripo dragon and phoenix models:** the user confirms the jobs ran on a paid
  Tripo plan with project-original generated concepts as inputs. This is
  recorded as a user-confirmed paid entitlement, not independent invoice
  verification. Terms: <https://www.tripo3d.ai/terms>.
- **Aigei dragon, phoenix, glass, and launch audio:** the user confirms paid
  access and a right to use these four media items. Each remains
  `user_attested_not_independently_verified`; this repository does not claim
  CC0, MIT, or formal legal clearance. Provider FAQ:
  <https://www.aigei.com/faq/doc/45.html>.
- **Thunder:** SoundDino represents that its thunderstorm effect may be
  incorporated into commercial projects. That provider representation does not
  independently verify a right to redistribute the raw asset. Source:
  <https://sounddino.com/zh/effects/thunderstorm/>.
- **Rose image:** the photo was generated with OpenAI and carries embedded
  C2PA provenance evidence. This is provenance information, not a replacement
  for any applicable service terms.

When redistributing a build, retain these notices and the corresponding
third-party license texts. Do not represent any user-attested paid media as
open-source material.
