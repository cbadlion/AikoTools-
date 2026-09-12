import { AnimatableProperty, Keyframe, EasingType, BezierHandles, TransformProperties } from '../types/ae';

// Cubic bezier evaluator for Easy Ease and custom graph curves
function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  // Approximate finding t for given x, then calculate y
  // Standard de Casteljau / Newton-Raphson approximation
  let low = 0;
  let high = 1;
  let s = t;

  for (let i = 0; i < 8; i++) {
    const x = 3 * (1 - s) * (1 - s) * s * p1x + 3 * (1 - s) * s * s * p2x + s * s * s;
    if (Math.abs(x - t) < 0.001) break;
    if (x < t) low = s;
    else high = s;
    s = (low + high) / 2;
  }

  // Calculate y for parameter s
  const y = 3 * (1 - s) * (1 - s) * s * p1y + 3 * (1 - s) * s * s * p2y + s * s * s;
  return y;
}

// Ease curves mapping
export function evaluateEasing(progress: number, easing: EasingType, bezier?: BezierHandles): number {
  const t = Math.max(0, Math.min(1, progress));

  switch (easing) {
    case 'linear':
      return t;
    case 'easy-ease':
      // AE default F9 Easy Ease [0.4, 0, 0.2, 1]
      return cubicBezier(t, 0.42, 0.0, 0.58, 1.0);
    case 'ease-in':
      return cubicBezier(t, 0.42, 0.0, 1.0, 1.0);
    case 'ease-out':
      return cubicBezier(t, 0.0, 0.0, 0.58, 1.0);
    case 'bounce': {
      // Elastic overshoot bounce
      const p = 0.3;
      return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
    }
    case 'bezier':
      if (bezier) {
        return cubicBezier(t, bezier.cp1[0], bezier.cp1[1], bezier.cp2[0], bezier.cp2[1]);
      }
      return cubicBezier(t, 0.42, 0.0, 0.58, 1.0);
    default:
      return t;
  }
}

// Interpolate number or array value
export function interpolateValue<T extends number | [number, number] | [number, number, number]>(
  prop: AnimatableProperty<T>,
  frame: number
): T {
  if (!prop.isAnimated || !prop.keyframes || prop.keyframes.length === 0) {
    return prop.value;
  }

  const kfs = [...prop.keyframes].sort((a, b) => a.frame - b.frame);

  // Before first keyframe
  if (frame <= kfs[0].frame) {
    return kfs[0].value as T;
  }

  // After last keyframe
  if (frame >= kfs[kfs.length - 1].frame) {
    return kfs[kfs.length - 1].value as T;
  }

  // Find surrounding keyframes
  let prev = kfs[0];
  let next = kfs[1];

  for (let i = 0; i < kfs.length - 1; i++) {
    if (frame >= kfs[i].frame && frame <= kfs[i + 1].frame) {
      prev = kfs[i];
      next = kfs[i + 1];
      break;
    }
  }

  const span = next.frame - prev.frame;
  if (span === 0) return prev.value as T;

  const rawProgress = (frame - prev.frame) / span;
  const easedProgress = evaluateEasing(rawProgress, prev.easing, prev.bezier);

  const v1 = prev.value;
  const v2 = next.value;

  if (typeof v1 === 'number' && typeof v2 === 'number') {
    return (v1 + (v2 - v1) * easedProgress) as T;
  }

  if (Array.isArray(v1) && Array.isArray(v2)) {
    if (v1.length === 2 && v2.length === 2) {
      return [
        v1[0] + (v2[0] - v1[0]) * easedProgress,
        v1[1] + (v2[1] - v1[1]) * easedProgress,
      ] as T;
    }
    if (v1.length === 3 && v2.length === 3) {
      return [
        v1[0] + (v2[0] - v1[0]) * easedProgress,
        v1[1] + (v2[1] - v1[1]) * easedProgress,
        v1[2] + (v2[2] - v1[2]) * easedProgress,
      ] as T;
    }
  }

  return prop.value;
}

// Pseudo-random continuous noise generator for Wiggle
function pseudoNoise(seed: number, t: number): number {
  const i0 = Math.floor(t);
  const i1 = i0 + 1;
  const f = t - i0;

  // Smoothstep
  const smoothF = f * f * (3 - 2 * f);

  const hash = (n: number) => {
    const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  const v0 = hash(i0) * 2 - 1;
  const v1 = hash(i1) * 2 - 1;

  return v0 + (v1 - v0) * smoothF;
}

// Calculate expression offsets
export function evaluateExpressionOffset(
  expr: { enabled: boolean; type: 'wiggle' | 'spin' | 'pulse' | 'none'; freq: number; amp: number } | undefined,
  frame: number,
  fps: number,
  layerSeed: number = 42
): { x: number; y: number; rot: number; scale: number } {
  if (!expr || !expr.enabled || expr.type === 'none') {
    return { x: 0, y: 0, rot: 0, scale: 0 };
  }

  const time = frame / fps;

  switch (expr.type) {
    case 'wiggle': {
      // AE classic wiggle(freq, amp)
      const t = time * expr.freq;
      const nx = pseudoNoise(layerSeed, t);
      const ny = pseudoNoise(layerSeed + 101, t);
      const nRot = pseudoNoise(layerSeed + 202, t);
      return {
        x: nx * expr.amp,
        y: ny * expr.amp,
        rot: nRot * (expr.amp * 0.15),
        scale: 0,
      };
    }
    case 'spin': {
      // continuous spin
      return {
        x: 0,
        y: 0,
        rot: (time * expr.freq * 360) % 360,
        scale: 0,
      };
    }
    case 'pulse': {
      // heartbeat pulse
      const pulseVal = Math.sin(time * expr.freq * Math.PI * 2) * (expr.amp * 0.01);
      return {
        x: 0,
        y: 0,
        rot: 0,
        scale: pulseVal * 100,
      };
    }
    default:
      return { x: 0, y: 0, rot: 0, scale: 0 };
  }
}
