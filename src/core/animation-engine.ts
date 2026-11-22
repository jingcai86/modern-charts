import type {
  AnimationConfig,
  AnimationEasingName,
  ItemAnimationSpec,
  MotionPresetName
} from './types';

const BACK_OVERSHOOT = 1.70158;
const ELASTIC_TAU = (2 * Math.PI) / 0.3;
const ELASTIC_SHIFT = 0.075;
const BOUNCE_B1 = 4 / 11;
const BOUNCE_B2 = 6 / 11;
const BOUNCE_B3 = 8 / 11;
const BOUNCE_B4 = 3 / 4;
const BOUNCE_B5 = 9 / 11;
const BOUNCE_B6 = 10 / 11;
const BOUNCE_B7 = 15 / 16;
const BOUNCE_B8 = 21 / 22;
const BOUNCE_B9 = 63 / 64;
const BOUNCE_B0 = 1 / BOUNCE_B1 / BOUNCE_B1;

const easeLinear = (t: number): number => +t;
const easeQuadOut = (t: number): number => t * (2 - t);
const easeCubicOut = (t: number): number => {
  const u = t - 1;
  return u * u * u + 1;
};
const easeBackOut = (t: number): number => {
  const u = t - 1;
  return u * u * ((BACK_OVERSHOOT + 1) * u + BACK_OVERSHOOT) + 1;
};
const easeElasticOut = (t: number): number => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const decay = (Math.pow(2, -10 * t) - 0.0009765625) * 1.0009775171065494;
  return 1 - decay * Math.sin((t + ELASTIC_SHIFT) * ELASTIC_TAU);
};
const easeBounceOut = (t: number): number => {
  let u = +t;
  if (u < BOUNCE_B1) return BOUNCE_B0 * u * u;
  if (u < BOUNCE_B3) {
    u -= BOUNCE_B2;
    return BOUNCE_B0 * u * u + BOUNCE_B4;
  }
  if (u < BOUNCE_B6) {
    u -= BOUNCE_B5;
    return BOUNCE_B0 * u * u + BOUNCE_B7;
  }
  u -= BOUNCE_B8;
  return BOUNCE_B0 * u * u + BOUNCE_B9;
};

export const MOTION_PRESETS: Record<
  MotionPresetName,
  Omit<AnimationConfig, 'enabled'>
> = {
  default: {
    preset: 'default',
    duration: 520,
    easing: 'cubic-out',
    stagger: 32,
    streamDelay: 200
  },
  gentle: {
    preset: 'gentle',
    duration: 680,
    easing: 'quad-out',
    stagger: 40,
    streamDelay: 240
  },
  wobbly: {
    preset: 'wobbly',
    duration: 760,
    easing: 'elastic-out',
    stagger: 38,
    streamDelay: 250
  },
  stiff: {
    preset: 'stiff',
    duration: 320,
    easing: 'cubic-out',
    stagger: 18,
    streamDelay: 140
  },
  slow: {
    preset: 'slow',
    duration: 980,
    easing: 'cubic-out',
    stagger: 55,
    streamDelay: 340
  },
  molasses: {
    preset: 'molasses',
    duration: 1450,
    easing: 'quad-out',
    stagger: 75,
    streamDelay: 460
  },
  elastic: {
    preset: 'elastic',
    duration: 820,
    easing: 'elastic-out',
    stagger: 36,
    streamDelay: 240
  },
  bounce: {
    preset: 'bounce',
    duration: 780,
    easing: 'bounce-out',
    stagger: 35,
    streamDelay: 240
  }
};

export function createDefaultAnimationConfig(
  preset: MotionPresetName = 'default'
): AnimationConfig {
  const base = MOTION_PRESETS[preset] ?? MOTION_PRESETS.default;
  return {
    enabled: true,
    ...base
  };
}

export function resolveMotionConfig(
  animate?: boolean,
  motionConfig?: MotionPresetName | Partial<AnimationConfig>,
  animationOverride?: Partial<AnimationConfig>
): AnimationConfig {
  let base = createDefaultAnimationConfig('default');
  if (typeof motionConfig === 'string' && MOTION_PRESETS[motionConfig]) {
    base = {
      enabled: animate ?? true,
      ...MOTION_PRESETS[motionConfig]
    };
  } else if (motionConfig && typeof motionConfig === 'object') {
    const presetBase =
      motionConfig.preset && MOTION_PRESETS[motionConfig.preset]
        ? MOTION_PRESETS[motionConfig.preset]
        : MOTION_PRESETS.default;
    base = {
      enabled: animate ?? motionConfig.enabled ?? true,
      ...presetBase,
      ...motionConfig
    };
  }
  if (animationOverride) {
    const presetBase =
      animationOverride.preset && MOTION_PRESETS[animationOverride.preset]
        ? MOTION_PRESETS[animationOverride.preset]
        : {};
    base = {
      ...base,
      ...presetBase,
      ...animationOverride
    };
  }
  if (animate !== undefined) {
    base.enabled = animate;
  }
  return base;
}

export class AnimationEngine {
  public getCssEasing(easing: AnimationEasingName): string {
    switch (easing) {
      case 'linear':
        return 'linear';
      case 'quad-out':
        return 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      case 'back-out':
        return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
      case 'elastic-out':
        return 'cubic-bezier(0.22, 1.35, 0.36, 1)';
      case 'bounce-out':
        return 'cubic-bezier(0.34, 1.45, 0.64, 1)';
      case 'cubic-out':
      default:
        return 'cubic-bezier(0.22, 1, 0.36, 1)';
    }
  }

  public getD3Easing(easing: AnimationEasingName): (normalizedTime: number) => number {
    switch (easing) {
      case 'linear':
        return easeLinear;
      case 'quad-out':
        return easeQuadOut;
      case 'back-out':
        return easeBackOut;
      case 'elastic-out':
        return easeElasticOut;
      case 'bounce-out':
        return easeBounceOut;
      case 'cubic-out':
      default:
        return easeCubicOut;
    }
  }

  /**
   * Animates an individual SVG chart item according to the active `<mc-animation-layer>`
   * configuration while guaranteeing the element always rests in its final visible state.
   */
  public animateItem(
    element: SVGElement,
    spec: ItemAnimationSpec,
    config: AnimationConfig
  ): void {
    if (!config.enabled || config.duration <= 0) {
      element.setAttribute('data-animated', 'false');
      return;
    }

    const index = spec.index ?? 0;
    const delay = Math.min(800, index * Math.max(0, config.stagger));
    const duration = config.duration;
    const cssEasing = this.getCssEasing(config.easing);

    element.setAttribute('data-animated', 'true');
    element.setAttribute('data-animation-type', spec.type);
    element.setAttribute('data-animation-duration', String(duration));
    element.setAttribute('data-animation-delay', String(delay));

    // Check reduced-motion user preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    const originX = spec.originX ?? 0;
    const originY = spec.originY ?? 0;
    element.style.transformOrigin = `${originX}px ${originY}px`;

    let keyframes: Keyframe[] = [
      { opacity: 0, transform: 'scale(0.92)' },
      { opacity: 1, transform: 'scale(1)' }
    ];

    switch (spec.type) {
      case 'bar-vertical':
        keyframes = [
          { opacity: 0.25, transform: 'scaleY(0)' },
          { opacity: 1, transform: 'scaleY(1)' }
        ];
        break;
      case 'bar-horizontal':
        keyframes = [
          { opacity: 0.25, transform: 'scaleX(0)' },
          { opacity: 1, transform: 'scaleX(1)' }
        ];
        break;
      case 'line-draw':
        keyframes = [
          { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
          { opacity: 1, clipPath: 'inset(0 0% 0 0)' }
        ];
        break;
      case 'area-fade':
        keyframes = [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0px)' }
        ];
        break;
      case 'point-pop':
        keyframes = [
          { opacity: 0, transform: 'scale(0)' },
          { opacity: 1, transform: 'scale(1)' }
        ];
        break;
      case 'arc-sweep':
        keyframes = [
          { opacity: 0, transform: 'scale(0.65) rotate(-14deg)' },
          { opacity: 1, transform: 'scale(1) rotate(0deg)' }
        ];
        break;
      case 'cell-pop':
        keyframes = [
          { opacity: 0, transform: 'scale(0.76)' },
          { opacity: 1, transform: 'scale(1)' }
        ];
        break;
      case 'radar-expand':
        keyframes = [
          { opacity: 0, transform: 'scale(0.15)' },
          { opacity: 1, transform: 'scale(1)' }
        ];
        break;
      case 'sankey-flow':
        keyframes = [
          { opacity: 0, transform: 'translateX(-10px)' },
          { opacity: 1, transform: 'translateX(0px)' }
        ];
        break;
      case 'needle-sweep':
        keyframes = [
          { opacity: 0, transform: 'rotate(-55deg)' },
          { opacity: 1, transform: 'rotate(0deg)' }
        ];
        break;
    }

    if (typeof element.animate === 'function') {
      try {
        element.animate(keyframes, {
          duration,
          delay,
          easing: cssEasing,
          fill: 'both'
        });
      } catch {
        // Fallback when WAAPI is mocked or partial in headless test DOM
      }
    }
  }
}
