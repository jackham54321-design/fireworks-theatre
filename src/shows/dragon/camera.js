const ease = (a, b, t) => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * u * (u * (u * 6 - 15) + 10);
};

// One sustained hero approach replaces independent, overlapping zoom pulses.
export function cameraState(t, aspect, body, root, head) {
  const intro = 1 - ease(3.1, 4.1, t),
    ix = (body[0].x + body[2].x + body[4].x) / 3;
  const ascent = ease(3.9, 4.8, t) * (1 - ease(6.4, 7.9, t));
  const hero = ease(6.4, 8.55, t) * (1 - ease(13.15, 15, t));
  const orbit = 2.1 * Math.sin(0.8 * t - 0.55) * (1 - ease(3, 4.2, t));
  const close = ease(7.8, 8.7, t) * (1 - ease(9.6, 10.8, t));
  const portrait = 1 - ease(0.65, 0.95, aspect),
    bodyFrame = ease(6.1, 7.0, t) * (1 - ease(13.2, 15, t));
  const span =
    1.05 -
    0.1 * ease(13.15, 15, t) -
    0.4 * ascent -
    0.35 * hero +
    0.1 * portrait * bodyFrame;
  const base = [ix * intro, 1.45 - 0.95 * intro, -9 * intro];
  const aim = [head.x * 0.65, head.y - 1.55, head.z - 1.0];
  const target = base.map((v, i) => v + (aim[i] - v) * hero);
  target[0] +=
    (body.reduce((sum, p) => sum + p.x, 0) / body.length - target[0]) *
    0.55 *
    portrait *
    bodyFrame;
  const position = [
    (-0.8 + ix * 0.2) * intro + orbit - 4.8 * hero - 1.5 * ascent,
    1.45 - 0.55 * intro - 0.6 * ascent + (aim[1] - 2.8) * hero,
    12 - 4.5 * intro - 1.5 * ascent - 10.5 * hero - 0.65 * close,
  ];
  return {
    position,
    target,
    fov:
      (2 *
        Math.atan(Math.tan(Math.PI / 9) * Math.max(1, span / aspect)) *
        180) /
      Math.PI,
  };
}
