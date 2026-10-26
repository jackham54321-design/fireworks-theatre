/**
 * User-activated audio, overlapping voice limits and programme crossfades.
 * Call bindAudioUI() after the audio controls exist in the DOM.
 */
export function createAudioController(deps) {
  const {
    getElement: $,
    clamp,
    TAU,
    seeded,
    notify,
    scoreScenes,
    scoreTracks,
    savePreferences,
    syncPhoenixAudio,
    syncStoryUI,
    state,
    soundPreferences,
    getClock,
    getPhoenix,
    getStory,
    getTextCloud,
    getSpecialCaption,
    getSpecialUntil,
    getInnerWidth = () => globalThis.innerWidth,
    document = globalThis.document,
    window = globalThis.window,
    phoenixCallPcmBase64,
    fireworkSamplesV25,
  } = deps;
  const runtime = {
    get clock() {
      return getClock();
    },
    get phoenix() {
      return getPhoenix();
    },
    get story() {
      return getStory();
    },
    get textCloud() {
      return getTextCloud();
    },
    get specialCaption() {
      return getSpecialCaption();
    },
    get specialUntil() {
      return getSpecialUntil();
    },
  };
  let audio = null,
    master = null,
    effectsBus = null,
    reverbSend = null,
    musicBus = null,
    musicPending = false,
    musicFailed = false,
    musicMixAt = 0,
    duckUntil = 0,
    duckDepth = 0,
    musicDuck = 1;
  let musicDecks = null,
    scoreScene = "ambient",
    musicAccentUntil = 0,
    musicRequest = 0,
    pendingScore = null,
    ambientScorePosition = 0;
  let phoenixCallBuffer = null,
    phoenixCallContext = null,
    phoenixCallLoading = null,
    phoenixCallFailed = false;
  const soundVoices = new Set(),
    soundBuffers = [],
    launchBuffers = [],
    detailBuffers = new Map(),
    lastBoom = [-10, -10, -10];
  function makeFireworkBuffer(kind, variant = 0) {
    const clip =
        kind === "launch"
          ? fireworkSamplesV25.launches[variant]
          : fireworkSamplesV25.burst,
      binary = atob(clip.pcm),
      channels = clip.channels;
    const length = binary.length / (channels * 2),
      buffer = audio.createBuffer(
        channels,
        length,
        fireworkSamplesV25.sampleRate,
      );
    for (let channel = 0; channel < channels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const at = (i * channels + channel) * 2,
          sample = binary.charCodeAt(at) | (binary.charCodeAt(at + 1) << 8);
        data[i] = (sample >= 32768 ? sample - 65536 : sample) / 32768;
      }
    }
    return buffer;
  }
  function makeDetailBuffer(kind, variant = 0) {
    const key = kind + ":" + variant;
    if (detailBuffers.has(key)) return detailBuffers.get(key);
    const duration =
      {
        air: 0.85,
        wing: 0.65,
        fire: 1.65,
        chime: 1.6,
        bloom: 1.5,
        paper: 0.65,
        lift: 1.9,
      }[kind] ?? 1;
    const rate = 32000,
      buffer = audio.createBuffer(1, Math.ceil(duration * rate), rate),
      data = buffer.getChannelData(0),
      rng = seeded(72631 + variant * 103 + kind.charCodeAt(0) * 31);
    let low = 0,
      mid = 0,
      peak = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / rate,
        u = t / duration,
        n = rng() * 2 - 1;
      low = low * 0.975 + n * 0.025;
      mid = mid * 0.72 + n * 0.28;
      let x = 0;
      const soft = Math.sin(Math.PI * u) ** 1.65;
      if (kind === "air" || kind === "wing" || kind === "paper")
        x =
          (mid * 0.65 +
            low * 1.5 +
            (n - mid) * (kind === "paper" ? 0.16 : 0.025)) *
          soft *
          (kind === "wing" ? 0.68 + 0.32 * Math.sin(Math.PI * u * 2) ** 2 : 1);
      else if (kind === "fire")
        x =
          (low * 1.8 + mid * 0.17) *
          Math.sin(Math.PI * u) ** 0.7 *
          (0.7 + 0.3 * Math.sin(t * 19 + Math.sin(t * 5)) ** 2);
      else if (kind === "chime" || kind === "bloom") {
        const f = kind === "chime" ? 980 + variant * 117 : 1480 + variant * 83,
          env =
            (1 - Math.exp(-t * 120)) *
            Math.exp(-t * (kind === "chime" ? 4 : 2.7)) *
            (1 - u) ** 0.6;
        x =
          (Math.sin(TAU * f * t) +
            0.35 * Math.sin(TAU * f * 2.71 * t) +
            0.13 * Math.sin(TAU * f * 4.13 * t)) *
            env *
            0.18 +
          (kind === "bloom" ? mid * soft * 0.14 : 0);
      } else if (kind === "lift")
        x =
          (mid * 0.4 + low * 2.2) *
          Math.sin(Math.PI * u) ** 0.8 *
          (0.2 + 0.8 * u);
      data[i] = x;
      peak = Math.max(peak, Math.abs(x));
    }
    if (kind === "fire")
      for (let k = 0; k < 30; k++) {
        const start = Math.floor(rng() * (data.length - 500));
        for (let j = 0; j < 400; j++)
          data[start + j] +=
            (rng() * 2 - 1) * 0.09 * Math.exp(-j / 65) * Math.min(1, j / 8);
      }
    peak = 0;
    for (const x of data) peak = Math.max(peak, Math.abs(x));
    for (let i = 0; i < data.length; i++)
      data[i] *=
        (0.7 / Math.max(0.01, peak)) *
        Math.min(1, i / 64, (data.length - 1 - i) / 192);
    detailBuffers.set(key, buffer);
    return buffer;
  }
  function playTheatreEffect(kind, pan = 0.5, gain = 0.1, variant = 0) {
    if (
      !audio ||
      !state.sound ||
      !soundPreferences.effects ||
      state.paused ||
      document.hidden
    )
      return false;
    const buffer =
      kind === "call" ? phoenixCallBuffer : makeDetailBuffer(kind, variant);
    if (!buffer) return false;
    const voice = playFireworkVoice(buffer, pan, gain, {
      cutoff: kind === "call" ? 14000 : kind === "fire" ? 2700 : 7300,
      sweep: kind !== "call",
    });
    if (voice) {
      voice.kind = kind;
      if (gain >= 0.18) duckMusic(Math.min(0.28, gain), 0.55);
    }
    return voice;
  }
  function storyActorSound(actor, pan, arrival = false) {
    if (!arrival)
      return playTheatreEffect(
        actor.art === "card" ? "paper" : "air",
        pan,
        actor.art === "card" ? 0.05 : 0.075,
        (actor.rank ?? 0) % 3,
      );
    const glass = ["watch", "key", "cup", "pot"].includes(actor.art),
      kind = glass ? "chime" : actor.art === "card" ? "paper" : "bloom";
    return playTheatreEffect(
      kind,
      pan,
      glass ? 0.1 : actor.art === "card" ? 0.06 : 0.09,
      (actor.rank ?? 0) % 3,
    );
  }
  function duckMusic(depth = 0.24, duration = 0.6) {
    if (!audio) return;
    duckDepth = Math.max(audio.currentTime < duckUntil ? duckDepth : 0, depth);
    duckUntil = Math.max(duckUntil, audio.currentTime + duration);
  }
  function scoreEnvelope(points, time) {
    for (let i = 1; i < points.length; i++)
      if (time < points[i][0]) {
        const a = points[i - 1],
          b = points[i],
          u = clamp((time - a[0]) / (b[0] - a[0]), 0, 1),
          s = u * u * (3 - 2 * u);
        return a[1] + (b[1] - a[1]) * s;
      }
    return points.at(-1)[1];
  }
  function programmeMusicShape() {
    if (!soundPreferences.followShows) return 1;
    if (runtime.story && !runtime.story.finished)
      return scoreEnvelope(
        [
          [0, 0.78],
          [5, 0.94],
          [12, 0.82],
          [16, 0.72],
          [24, 0.88],
          [34, 0.86],
          [39, 0.69],
          [46, 0.75],
          [51, 0.96],
          [59, 0.9],
          [65, 1],
          [74, 1.04],
          [79, 0.62],
          [82, 0.74],
          [86, 1.08],
          [90, 0.4],
        ],
        runtime.story.age,
      );
    if (
      runtime.phoenix?.status === "ready" &&
      !runtime.phoenix.finished &&
      runtime.phoenix.mode !== "dragon"
    )
      return runtime.phoenix.mode === "2d"
        ? scoreEnvelope(
            [
              [0, 0.42],
              [1.8, 0.82],
              [4, 0.96],
              [8, 0.84],
              [10.2, 0.6],
              [11.6, 0.86],
              [13, 1.08],
              [15, 0.8],
              [20, 0.36],
              [23.4, 0.04],
            ],
            runtime.phoenix.age,
          )
        : scoreEnvelope(
            [
              [0, 0.38],
              [2.3, 0.56],
              [3.4, 0.92],
              [6, 0.94],
              [13, 0.9],
              [15, 0.62],
              [17.7, 0.38],
              [18.65, 1.08],
              [21.5, 1.06],
              [25, 0.86],
              [27, 0.42],
              [28.4, 0.04],
            ],
            runtime.phoenix.age,
          );
    if (runtime.textCloud?.kind === "love")
      return scoreEnvelope(
        [
          [0, 0.74],
          [10, 0.9],
          [22, 0.78],
          [32, 0.94],
          [40, 1.05],
          [45, 0.4],
        ],
        runtime.textCloud.age,
      );
    return 1;
  }
  function programmeScoreTime() {
    if (!soundPreferences.followShows) return null;
    if (runtime.story && !runtime.story.finished) return runtime.story.age;
    if (
      runtime.phoenix?.status === "ready" &&
      !runtime.phoenix.finished &&
      runtime.phoenix.mode !== "dragon"
    )
      return Math.min(runtime.phoenix.age, runtime.phoenix.duration);
    return null;
  }
  function scoreCue(scene = scoreScenes[scoreScene]) {
    const time = programmeScoreTime();
    return scene.track === "moonlight"
      ? ambientScorePosition
      : scene.cue + (time ?? 0);
  }
  function alignProgrammeScore() {
    if (programmeScoreTime() === null) return;
    const deck = getMusicDecks().find(
      (d) => d.key === scoreScenes[scoreScene].track,
    );
    if (!deck) return;
    deck.cue = scoreCue();
    deck.needsSeek = true;
    seekScoreCue(deck);
  }
  function preparePhoenixCall() {
    if (!audio) return Promise.resolve(null);
    if (phoenixCallContext === audio && phoenixCallLoading)
      return phoenixCallLoading;
    const context = audio;
    phoenixCallContext = context;
    phoenixCallFailed = false;
    phoenixCallBuffer = null;
    const bytes = Uint8Array.from(atob(phoenixCallPcmBase64), (c) =>
      c.charCodeAt(0),
    );
    phoenixCallLoading = context
      .decodeAudioData(bytes.buffer)
      .then((buffer) => {
        if (audio !== context) return null;
        phoenixCallBuffer = buffer;
        return buffer;
      })
      .catch(() => {
        if (audio === context) phoenixCallFailed = true;
        return null;
      });
    return phoenixCallLoading;
  }
  function initAudio() {
    if (!state.sound) return;
    try {
      if (!audio) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audio = new AC({ latencyHint: "interactive" });
        master = audio.createGain();
        master.gain.value = 0;
        effectsBus = audio.createGain();
        const compressor = audio.createDynamicsCompressor();
        compressor.threshold.value = -15;
        compressor.knee.value = 15;
        compressor.ratio.value = 2.6;
        compressor.attack.value = 0.007;
        compressor.release.value = 0.28;
        effectsBus.connect(compressor).connect(master);
        const dc = audio.createBiquadFilter();
        dc.type = "highpass";
        dc.frequency.value = 26;
        dc.Q.value = 0.707;
        const glue = audio.createDynamicsCompressor();
        glue.threshold.value = -8;
        glue.knee.value = 9;
        glue.ratio.value = 3;
        glue.attack.value = 0.003;
        glue.release.value = 0.2;
        master.connect(dc).connect(glue);
        if (audio.createWaveShaper) {
          const ceiling = audio.createWaveShaper(),
            curve = new Float32Array(4097);
          for (let i = 0; i < curve.length; i++) {
            const x = (i / (curve.length - 1)) * 2 - 1,
              a = Math.abs(x);
            curve[i] =
              Math.sign(x) *
              (a <= 0.78
                ? a
                : 0.78 + 0.19 * (1 - Math.exp(-(a - 0.78) / 0.19)));
          }
          ceiling.curve = curve;
          ceiling.oversample = "4x";
          glue.connect(ceiling).connect(audio.destination);
        } else glue.connect(audio.destination);
        $("soundBtn").dataset.audioEngine = "theatre-mix-v2";
        // Same-origin HTTP media uses a gain bus, including iOS where element.volume is fixed.
        if (
          (window.location?.protocol !== "file:" || window.fireworksPortable) &&
          audio.createMediaElementSource
        ) {
          for (const deck of getMusicDecks()) {
            try {
              const source = audio.createMediaElementSource(deck.element);
              deck.bus = audio.createGain();
              deck.bus.gain.value = 0;
              source.connect(deck.bus).connect(master);
              deck.element.volume = 1;
              deck.element.dataset.audioRouting = "web-audio";
            } catch {
              deck.bus = null;
            }
          }
          musicBus = getMusicDecks()[0].bus;
        }
        const reverb = audio.createConvolver(),
          tail = audio.createBuffer(
            2,
            Math.ceil(audio.sampleRate * 0.85),
            audio.sampleRate,
          );
        for (let channel = 0; channel < 2; channel++) {
          const d = tail.getChannelData(channel);
          for (let i = 0; i < d.length; i++) {
            const t = i / audio.sampleRate;
            d[i] =
              (Math.random() * 2 - 1) *
              Math.exp(-t * 8) *
              0.1 *
              (t > 0.045 ? 1 : 0);
          }
        }
        reverb.buffer = tail;
        reverbSend = audio.createGain();
        reverbSend.gain.value = 0.2;
        const low = audio.createBiquadFilter();
        low.type = "lowpass";
        low.frequency.value = 2100;
        reverbSend.connect(reverb).connect(low).connect(effectsBus);
        soundBuffers.push(makeFireworkBuffer("burst"));
        for (let i = 0; i < fireworkSamplesV25.launches.length; i++)
          launchBuffers.push(makeFireworkBuffer("launch", i));
        preparePhoenixCall();
      }
      if (audio.state === "suspended" || audio.state === "interrupted")
        audio.resume().catch(() => {});
      updateAudioGains();
    } catch {
      if (audio) audio.close().catch(() => {});
      audio = master = effectsBus = reverbSend = null;
      soundBuffers.length = launchBuffers.length = 0;
      detailBuffers.clear();
      notify("烟花音效暂不可用，配乐仍可单独播放");
    }
  }
  function updateAudioGains() {
    syncPhoenixAudio();
    if (!audio) return;
    const t = audio.currentTime;
    master.gain.setTargetAtTime(
      state.sound && !state.paused && !document.hidden ? 0.82 : 0,
      t,
      0.035,
    );
    effectsBus.gain.setTargetAtTime(
      soundPreferences.effects ? soundPreferences.effectsVolume : 0,
      t,
      0.035,
    );
  }
  function stopSoundVoices() {
    for (const voice of [...soundVoices]) {
      try {
        voice.source.stop();
      } catch {}
      voice.clean();
    }
    lastBoom.fill(-10);
    duckUntil = 0;
    duckDepth = 0;
    musicDuck = 1;
  }
  function stopRocketSound(rocket) {
    const voice = rocket.soundVoice;
    if (!voice) return;
    try {
      voice.source.stop();
    } catch {}
    voice.clean();
    rocket.soundVoice = null;
  }
  function playFireworkVoice(
    buffer,
    pan,
    gain,
    {
      duration = buffer.duration,
      from = pan,
      to = pan,
      delay = 0,
      cutoff = 6000,
      launch = false,
      sweep = true,
      sampled = false,
    } = {},
  ) {
    if (
      !audio ||
      !state.sound ||
      !soundPreferences.effects ||
      soundPreferences.effectsVolume === 0 ||
      state.paused ||
      document.hidden ||
      audio.state !== "running"
    )
      return false;
    const limit = getInnerWidth() <= 760 ? 12 : 20;
    if (soundVoices.size >= limit) {
      const oldestLaunch = !launch && [...soundVoices].find((v) => v.launch);
      if (!oldestLaunch) return false;
      try {
        oldestLaunch.source.stop();
      } catch {}
      oldestLaunch.clean();
    }
    const t = audio.currentTime + delay,
      source = audio.createBufferSource(),
      filter = audio.createBiquadFilter(),
      level = audio.createGain(),
      nodes = [source, filter, level];
    source.buffer = buffer;
    source.playbackRate.value = sampled ? 1 : buffer.duration / duration;
    filter.type = launch && !sampled ? "bandpass" : "lowpass";
    filter.Q.value = launch && !sampled ? 0.65 : 0.6;
    filter.frequency.setValueAtTime(sampled ? 14000 : launch ? 720 : cutoff, t);
    if (sweep && !sampled)
      filter.frequency.exponentialRampToValueAtTime(
        launch ? 1700 : Math.max(380, cutoff * 0.25),
        t + duration,
      );
    level.gain.setValueAtTime(gain, t);
    level.gain.setTargetAtTime(0.0001, t + duration - 0.045, 0.012);
    source.connect(filter).connect(level);
    let output = level;
    if (audio.createStereoPanner) {
      const p = audio.createStereoPanner();
      p.pan.setValueAtTime(clamp(from * 2 - 1, -0.82, 0.82), t);
      p.pan.linearRampToValueAtTime(
        clamp(to * 2 - 1, -0.82, 0.82),
        t + duration,
      );
      level.connect(p);
      nodes.push(p);
      output = p;
    }
    output.connect(effectsBus);
    if (!sampled) output.connect(reverbSend);
    const voice = {
      source,
      launch,
      clean() {
        if (!soundVoices.delete(voice)) return;
        for (const node of nodes) node.disconnect();
      },
    };
    soundVoices.add(voice);
    source.onended = voice.clean;
    source.start(t);
    source.stop(t + duration + 0.02);
    return voice;
  }
  function boom(pan, power = 1, options = {}) {
    if (!audio || !state.sound || state.paused || !soundPreferences.effects)
      return;
    const lane = clamp(Math.floor(pan * 3), 0, 2),
      now = audio.currentTime;
    if (now - lastBoom[lane] < 0.09) return;
    const near = options.near === true,
      distance = near ? 0.08 : clamp(0.68 - power * 0.3, 0.14, 0.65),
      active = [...soundVoices].filter((v) => !v.launch).length;
    const gain =
      ((0.35 + clamp(power, 0.2, 1.5) * 0.27) * (1 - distance * 0.4)) /
      Math.sqrt(1 + active * 0.55);
    const gentle =
        !near &&
        (runtime.textCloud || ["petal", "butterfly"].includes(state.effect)),
      buffer = soundBuffers[0];
    if (
      playFireworkVoice(buffer, pan, gain * (gentle ? 0.48 : 1), {
        delay: 0.025 + distance * 0.09,
        sampled: true,
      })
    ) {
      lastBoom[lane] = now;
      duckMusic(
        gentle ? 0.1 : near ? 0.32 : 0.18 + clamp(power, 0, 1.5) * 0.07,
        near ? 0.75 : 0.48,
      );
    }
  }
  function whoosh(pan, flight = {}) {
    if (!audio) return;
    const duration = clamp(flight.duration ?? 1.15, 0.55, 3.2),
      buffer =
        launchBuffers.find((b) => b.duration >= duration - 0.00001) ??
        launchBuffers.at(-1);
    return playFireworkVoice(buffer, pan, 0.14, {
      duration,
      from: flight.from ?? pan,
      to: pan,
      launch: true,
      sampled: true,
    });
  }
  function musicAllowed() {
    return (
      state.sound &&
      soundPreferences.music &&
      !state.paused &&
      !document.hidden &&
      !(
        runtime.phoenix?.mode === "dragon" &&
        !runtime.phoenix.finished &&
        soundPreferences.followShows
      )
    );
  }
  function performanceScoreScene() {
    if (!soundPreferences.followShows) return "ambient";
    if (runtime.phoenix)
      return runtime.phoenix.mode === "dragon"
        ? "ambient"
        : runtime.phoenix.status === "ready" && !runtime.phoenix.finished
          ? "phoenix"
          : "ambient";
    if (runtime.story && !runtime.story.finished)
      return runtime.story.variant === "immersive" ? "immersive" : "classic";
    if (runtime.textCloud)
      return runtime.textCloud.kind === "love" ? "love" : "wish";
    if (runtime.clock < musicAccentUntil) return "finale";
    if (runtime.specialCaption && runtime.clock < runtime.specialUntil)
      return (
        runtime.specialCaption.scene ??
        { 心动: "heart", 星环: "orbit", 临境: "depth", 流星: "meteor" }[
          runtime.specialCaption.name
        ] ??
        "ambient"
      );
    return "ambient";
  }
  function getMusicDecks() {
    if (musicDecks) return musicDecks;
    musicDecks = [$("musicTrack"), $("musicTrackAlt")].map(
      (element, index) => ({
        element,
        key: index === 0 ? "moonlight" : null,
        bus: null,
        weight: 0,
        from: 0,
        target: 0,
        fadeAge: 0,
        fadeDuration: 0.8,
        pending: false,
        serial: 0,
        needsSeek: false,
        cue: 0,
      }),
    );
    for (const deck of musicDecks) {
      deck.element.addEventListener("loadedmetadata", () => {
        if (deck.element.currentSrc !== deck.element.src) return;
        deck.awaitMetadata = false;
        seekScoreCue(deck);
      });
      deck.element.addEventListener("waiting", () => {
        if (musicAllowed() && deck.key === scoreScenes[scoreScene].track) {
          musicPending = true;
          syncSoundUI();
        }
      });
      deck.element.addEventListener("playing", () => {
        if (musicAllowed() && deck.key === scoreScenes[scoreScene].track) {
          musicPending = false;
          syncSoundUI();
        }
      });
      deck.element.addEventListener("error", () => {
        if (musicAllowed() && deck.key === scoreScenes[scoreScene].track)
          failScoreDeck(deck);
      });
    }
    return musicDecks;
  }
  function seekScoreCue(deck) {
    if (!deck.needsSeek || deck.awaitMetadata || deck.element.readyState < 1)
      return;
    const duration = Number.isFinite(deck.element.duration)
      ? deck.element.duration
      : Infinity;
    try {
      deck.element.currentTime = clamp(
        deck.cue,
        0,
        Math.max(0, duration - 0.5),
      );
      deck.needsSeek = false;
    } catch {}
  }
  function fadeScoreDeck(deck, target, duration = 1.35) {
    if (deck.target === target && deck.weight === target) return;
    deck.from = deck.weight;
    deck.target = target;
    deck.fadeAge = 0;
    deck.fadeDuration = duration;
  }
  function pauseScoreDeck(deck) {
    if (
      deck.key === "moonlight" &&
      !deck.pending &&
      Number.isFinite(deck.element.currentTime)
    )
      ambientScorePosition = deck.element.currentTime;
    deck.element.pause();
  }
  function pauseAllMusic() {
    ++musicRequest;
    pendingScore = null;
    musicPending = false;
    for (const deck of getMusicDecks()) {
      ++deck.serial;
      deck.pending = false;
      pauseScoreDeck(deck);
      deck.weight = deck.target = deck.from = 0;
      if (deck.bus && audio)
        deck.bus.gain.setTargetAtTime(0, audio.currentTime, 0.025);
      else deck.element.volume = 0;
    }
  }
  function activateScoreDeck(deck) {
    if (!musicAllowed() || deck.key !== scoreScenes[scoreScene].track) return;
    for (const d of getMusicDecks()) fadeScoreDeck(d, d === deck ? 1 : 0);
    pendingScore = null;
    musicPending = false;
    musicFailed = false;
    syncSoundUI();
  }
  function failScoreDeck(deck) {
    deck.pending = false;
    pauseScoreDeck(deck);
    fadeScoreDeck(deck, 0, 0.3);
    for (const d of getMusicDecks())
      if (d !== deck && !d.element.paused) fadeScoreDeck(d, 1, 0.4);
    pendingScore = null;
    musicPending = false;
    musicFailed = true;
    syncSoundUI();
  }
  function requestSceneScore() {
    if (!musicAllowed()) return;
    const scene = scoreScenes[scoreScene],
      decks = getMusicDecks(),
      request = musicRequest;
    let deck = decks.find((d) => d.key === scene.track);
    if (deck?.pending) {
      deck.request = request;
      deck.cue = scoreCue(scene);
      deck.needsSeek = true;
      return;
    }
    if (deck && !deck.element.paused && !musicFailed) {
      activateScoreDeck(deck);
      return;
    }
    if (!deck) {
      deck = decks.find((d) => d.weight <= 0.0001);
      if (!deck) {
        // A third request during a crossfade first frees the quieter deck smoothly.
        const quiet = decks[0].weight <= decks[1].weight ? decks[0] : decks[1];
        fadeScoreDeck(quiet, 0, 0.24);
        for (const d of decks) if (d !== quiet) fadeScoreDeck(d, 1, 0.24);
        pendingScore = request;
        musicPending = true;
        syncSoundUI();
        return;
      }
    }
    const changed =
        deck.key !== scene.track ||
        (!!window.fireworksPortable && !deck.element.src),
      serial = ++deck.serial;
    deck.pending = true;
    deck.request = request;
    musicPending = true;
    musicFailed = false;
    if (changed) {
      pauseScoreDeck(deck);
      deck.key = scene.track;
      deck.weight = deck.target = deck.from = 0;
      deck.cue = scoreCue(scene);
      deck.needsSeek = true;
      deck.awaitMetadata = true;
      deck.element.src = window.fireworksPortable
        ? window.fireworksPortable.musicURL(scene.track)
        : `fireworks-audio/${scene.track}.mp3`;
    } else if (deck.element.currentTime === 0 && scene.track !== "moonlight") {
      deck.cue = scoreCue(scene);
      deck.needsSeek = true;
    }
    deck.element.dataset.score = scene.track;
    if (deck.bus && audio)
      deck.bus.gain.setTargetAtTime(0, audio.currentTime, 0.02);
    else deck.element.volume = 0;
    seekScoreCue(deck);
    syncSoundUI();
    let playing;
    try {
      playing = deck.element.play();
    } catch {
      if (serial === deck.serial) failScoreDeck(deck);
      return;
    }
    Promise.resolve(playing)
      .then(() => {
        if (serial !== deck.serial) return;
        deck.pending = false;
        deck.awaitMetadata = false;
        if (deck.request === musicRequest && programmeScoreTime() !== null) {
          deck.cue = scoreCue();
          deck.needsSeek = true;
        }
        seekScoreCue(deck);
        if (
          deck.request === musicRequest &&
          musicAllowed() &&
          deck.key === scoreScenes[scoreScene].track
        )
          activateScoreDeck(deck);
        else if (deck.weight === 0) pauseScoreDeck(deck);
      })
      .catch(() => {
        if (
          serial === deck.serial &&
          deck.request === musicRequest &&
          musicAllowed()
        )
          failScoreDeck(deck);
      });
  }
  function syncPerformanceScore() {
    const next = performanceScoreScene();
    if (next === scoreScene) return;
    scoreScene = next;
    ++musicRequest;
    pendingScore = null;
    musicFailed = false;
    musicPending = false;
    if (musicAllowed()) requestSceneScore();
    syncSoundUI();
  }
  function syncSoundUI() {
    $("soundBtn").setAttribute("aria-pressed", String(state.sound));
    $("soundBtn").setAttribute(
      "aria-label",
      state.sound ? "关闭声音" : "开启声音",
    );
    $("soundBtn").title = "音乐与音效 · M";
    $("soundInput").checked = state.sound;
    $("soundWaves").setAttribute(
      "d",
      state.sound ? "M15 8q4 4 0 8m3-11q7 7 0 14" : "m16 9 5 6m0-6-5 6",
    );
    const on = state.sound && soundPreferences.music,
      track = scoreTracks[scoreScenes[scoreScene].track];
    $("musicBtn").textContent = on
      ? musicFailed
        ? "重试配乐"
        : "暂停配乐"
      : "播放配乐";
    $("musicBtn").setAttribute("aria-pressed", String(on));
    $("effectsInput").checked = soundPreferences.effects;
    $("scoreAutoInput").checked = soundPreferences.followShows;
    const dragonScore =
      runtime.phoenix?.mode === "dragon" &&
      !runtime.phoenix.finished &&
      soundPreferences.followShows;
    $("scoreTitle").textContent = dragonScore ? "飞龙在天" : track.title;
    $("scoreSubtitle").textContent = dragonScore
      ? "Scott Buckley · Titan · 龙吟与雷霆"
      : "Scott Buckley · " + track.subtitle;
    if (!$("scoreCredits").dataset.ready) {
      $("scoreCredits").innerHTML = Object.values(scoreTracks)
        .map(
          (t) =>
            `<a href="https://www.scottbuckley.com.au/library/${t.page}/" target="_blank" rel="noopener noreferrer">${t.title}</a>`,
        )
        .join(" · ");
      $("scoreCredits").dataset.ready = "true";
    }
    for (const key of ["musicVolume", "effectsVolume"]) {
      $(key).value = Math.round(soundPreferences[key] * 100);
      $(key + "Value").textContent = $(key).value + "%";
    }
    $("musicStatus").textContent = !state.sound
      ? "轻触开启，让音乐为夜空伴奏。"
      : !soundPreferences.music
        ? "配乐已暂停 · 烟火由你聆听。"
        : state.paused
          ? "演出暂停 · 配乐已同步暂停。"
          : document.hidden
            ? "页面暂离 · 配乐已暂停。"
            : musicFailed
              ? "本段配乐未载入，点击重试；已有配乐会保留。"
              : musicPending
                ? "正在为这一场烟火换上配乐…"
                : soundPreferences.followShows
                  ? "配乐随演出流转 · 谢幕后接回日常乐章。"
                  : "月光流淌 · 保持日常配乐。";
    if (runtime.story) syncStoryUI(true);
  }
  function syncAudioPlayback() {
    updateAudioGains();
    const before = musicRequest;
    syncPerformanceScore();
    if (!musicAllowed()) {
      pauseAllMusic();
      if (!state.sound || state.paused || document.hidden) stopSoundVoices();
      syncSoundUI();
      return;
    }
    if (before === musicRequest) requestSceneScore();
  }
  function updateMusicMix(timestamp) {
    syncPerformanceScore();
    if (timestamp - musicMixAt < 45) return;
    const elapsed = Math.min(0.2, Math.max(0, (timestamp - musicMixAt) / 1000));
    musicMixAt = timestamp;
    if (!musicDecks) return;
    const targetDuck =
      audio && audio.currentTime < duckUntil ? 1 - duckDepth : 1;
    musicDuck +=
      (targetDuck - musicDuck) *
      (1 - Math.exp(-elapsed / (targetDuck < musicDuck ? 0.055 : 0.48)));
    const base = musicAllowed()
        ? soundPreferences.musicVolume * 0.8 * musicDuck
        : 0,
      shape = programmeMusicShape();
    for (const deck of musicDecks) {
      deck.fadeAge += elapsed;
      const p = clamp(deck.fadeAge / deck.fadeDuration, 0, 1),
        ease = p * p * (3 - 2 * p);
      deck.weight = deck.from + (deck.target - deck.from) * ease;
      if (p === 1 && deck.target === 0 && !deck.pending && !deck.element.paused)
        pauseScoreDeck(deck);
      const balance = Math.pow(
          10,
          (scoreTracks[deck.key]?.balanceDb ?? 0) / 20,
        ),
        envelope = deck.key === scoreScenes[scoreScene].track ? shape : 1;
      const level =
        base * balance * envelope * Math.sqrt(Math.max(0, deck.weight));
      if (deck.bus && audio)
        deck.bus.gain.setTargetAtTime(level, audio.currentTime, 0.035);
      else deck.element.volume = clamp(level, 0, 1);
    }
    if (
      pendingScore !== null &&
      pendingScore === musicRequest &&
      musicAllowed() &&
      musicDecks.some((d) => d.weight <= 0.0001)
    ) {
      pendingScore = null;
      requestSceneScore();
    }
  }
  function setSound(on) {
    state.sound = on;
    if (on) initAudio();
    syncAudioPlayback();
  }
  function toggleSound() {
    setSound(!state.sound);
  }
  function bindAudioUI() {
    $("soundBtn").addEventListener("click", toggleSound);
    $("soundInput").addEventListener("change", (e) =>
      setSound(e.target.checked),
    );
    $("musicBtn").addEventListener("click", () => {
      if (!musicFailed)
        soundPreferences.music = !state.sound || !soundPreferences.music;
      else {
        musicFailed = false;
        soundPreferences.music = true;
      }
      if (!state.sound) state.sound = true;
      initAudio();
      savePreferences();
      syncAudioPlayback();
    });
    $("scoreAutoInput").addEventListener("change", (e) => {
      soundPreferences.followShows = e.target.checked;
      savePreferences();
      syncAudioPlayback();
      syncSoundUI();
    });
    $("effectsInput").addEventListener("change", (e) => {
      soundPreferences.effects = e.target.checked;
      if (!soundPreferences.effects) stopSoundVoices();
      updateAudioGains();
      savePreferences();
      syncSoundUI();
    });
    for (const key of ["musicVolume", "effectsVolume"])
      $(key).addEventListener("input", (e) => {
        soundPreferences[key] = clamp(Number(e.target.value) / 100, 0, 1);
        updateAudioGains();
        savePreferences();
        $(key + "Value").textContent =
          Math.round(soundPreferences[key] * 100) + "%";
      });
  }

  return {
    get context() {
      return audio;
    },
    get output() {
      return master;
    },
    get accentUntil() {
      return musicAccentUntil;
    },
    set accentUntil(value) {
      musicAccentUntil = value;
    },
    inspect: () => ({
      audio,
      master,
      effectsBus,
      musicBus,
      soundBuffers,
      launchBuffers,
      soundVoices,
      duckUntil,
      scoreScene,
      musicRequest,
      pendingScore,
      musicPending,
      musicFailed,
      ambientScorePosition,
    }),
    makeFireworkBuffer,
    makeDetailBuffer,
    playTheatreEffect,
    storyActorSound,
    duckMusic,
    scoreEnvelope,
    programmeMusicShape,
    programmeScoreTime,
    scoreCue,
    alignProgrammeScore,
    preparePhoenixCall,
    initAudio,
    updateAudioGains,
    stopSoundVoices,
    stopRocketSound,
    playFireworkVoice,
    boom,
    whoosh,
    musicAllowed,
    performanceScoreScene,
    getMusicDecks,
    seekScoreCue,
    fadeScoreDeck,
    pauseScoreDeck,
    pauseAllMusic,
    activateScoreDeck,
    failScoreDeck,
    requestSceneScore,
    syncPerformanceScore,
    syncSoundUI,
    syncAudioPlayback,
    updateMusicMix,
    setSound,
    toggleSound,
    bindAudioUI,
  };
}
