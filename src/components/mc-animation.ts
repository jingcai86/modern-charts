import { HTMLElementBase } from '../core/dom';
import {
  createDefaultAnimationConfig,
  MOTION_PRESETS,
  resolveMotionConfig
} from '../core/animation-engine';
import type {
  AnimationConfig,
  AnimationEasingName,
  AnimationEntryMode,
  MotionPresetName
} from '../core/types';

/**
 * `<mc-animation-layer>` (and `<mc-animation>` alias)
 * Dedicated Web Component for configuring chart animations, Nivo-style `motionConfig`
 * presets (`default`, `gentle`, `wobbly`, `stiff`, `slow`, `molasses`, `elastic`, `bounce`),
 * duration, easing, stagger, and AI progressive layer streaming delay.
 */
export class MCAnimationLayer extends HTMLElementBase {
  static observedAttributes = [
    'enabled',
    'preset',
    'motion-config',
    'duration',
    'easing',
    'stagger',
    'stream-delay',
    'mode'
  ];

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.style.display = 'none';
    this.#notifyChange();
  }

  connectedMoveCallback(): void {
    this.#notifyChange();
  }

  disconnectedCallback(): void {
    this.#notifyChange();
  }

  attributeChangedCallback(
    _name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    if (oldVal !== newVal) {
      this.#notifyChange();
    }
  }

  get enabled(): boolean {
    return (
      !this.hasAttribute('enabled') ||
      this.getAttribute('enabled') !== 'false'
    );
  }
  set enabled(val: boolean) {
    this.setAttribute('enabled', String(val));
  }

  get preset(): MotionPresetName {
    return (
      ((this.getAttribute('preset') ||
        this.getAttribute('motion-config')) as MotionPresetName) || 'default'
    );
  }
  set preset(val: MotionPresetName) {
    this.setAttribute('preset', val);
  }

  get duration(): number {
    if (this.hasAttribute('duration')) {
      return Number(this.getAttribute('duration'));
    }
    return (MOTION_PRESETS[this.preset] ?? MOTION_PRESETS.default).duration;
  }
  set duration(val: number) {
    this.setAttribute('duration', String(val));
  }

  get easing(): AnimationEasingName {
    if (this.hasAttribute('easing')) {
      return this.getAttribute('easing') as AnimationEasingName;
    }
    return (MOTION_PRESETS[this.preset] ?? MOTION_PRESETS.default).easing;
  }
  set easing(val: AnimationEasingName) {
    this.setAttribute('easing', val);
  }

  get stagger(): number {
    if (this.hasAttribute('stagger')) {
      return Number(this.getAttribute('stagger'));
    }
    return (MOTION_PRESETS[this.preset] ?? MOTION_PRESETS.default).stagger;
  }
  set stagger(val: number) {
    this.setAttribute('stagger', String(val));
  }

  get streamDelay(): number {
    if (this.hasAttribute('stream-delay')) {
      return Number(this.getAttribute('stream-delay'));
    }
    return (MOTION_PRESETS[this.preset] ?? MOTION_PRESETS.default).streamDelay;
  }
  set streamDelay(val: number) {
    this.setAttribute('stream-delay', String(val));
  }

  public applyFromConfig(config: Partial<AnimationConfig>): void {
    if (config.enabled !== undefined)
      this.setAttribute('enabled', String(config.enabled));
    if (config.preset) this.setAttribute('preset', config.preset);
    if (config.duration !== undefined)
      this.setAttribute('duration', String(config.duration));
    if (config.easing) this.setAttribute('easing', config.easing);
    if (config.stagger !== undefined)
      this.setAttribute('stagger', String(config.stagger));
    if (config.streamDelay !== undefined)
      this.setAttribute('stream-delay', String(config.streamDelay));
    if (config.mode) this.setAttribute('mode', config.mode);
  }

  public getAnimationConfig(): AnimationConfig {
    const presetName =
      ((this.getAttribute('preset') ||
        this.getAttribute('motion-config')) as MotionPresetName) || 'default';
    const base = createDefaultAnimationConfig(presetName);

    return resolveMotionConfig(this.enabled, presetName, {
      preset: presetName,
      duration: this.hasAttribute('duration')
        ? Number(this.getAttribute('duration'))
        : base.duration,
      easing:
        (this.getAttribute('easing') as AnimationEasingName) || base.easing,
      stagger: this.hasAttribute('stagger')
        ? Number(this.getAttribute('stagger'))
        : base.stagger,
      streamDelay: this.hasAttribute('stream-delay')
        ? Number(this.getAttribute('stream-delay'))
        : base.streamDelay,
      mode: (this.getAttribute('mode') as AnimationEntryMode) || undefined
    });
  }

  #notifyChange(): void {
    this.dispatchEvent(
      new CustomEvent('mc-layer-change', {
        bubbles: true,
        composed: true,
        detail: { source: 'mc-animation-layer', element: this }
      })
    );
  }
}
