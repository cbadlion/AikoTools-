export type AspectRatioType = '9:16' | '16:9' | '1:1' | '4:5';

export type LayerType = 'text' | 'shape' | 'image' | 'solid' | 'null' | 'adjustment' | 'audio';

export type BlendMode =
  | 'normal'
  | 'screen'
  | 'multiply'
  | 'overlay'
  | 'lighter' // Add / Linear Dodge
  | 'color-dodge'
  | 'darken'
  | 'lighten'
  | 'difference'
  | 'exclusion';

export type EasingType =
  | 'linear'
  | 'easy-ease'
  | 'ease-in'
  | 'ease-out'
  | 'bounce'
  | 'bezier';

export interface BezierHandles {
  cp1: [number, number]; // [x1, y1] normalized (0 to 1)
  cp2: [number, number]; // [x2, y2] normalized (0 to 1)
}

export interface Keyframe<T = number | [number, number] | [number, number, number]> {
  id: string;
  frame: number;
  value: T;
  easing: EasingType;
  bezier?: BezierHandles;
}

export interface AnimatableProperty<T = number | [number, number] | [number, number, number]> {
  value: T;
  isAnimated: boolean;
  keyframes: Keyframe<T>[];
}

export interface TransformProperties {
  position: AnimatableProperty<[number, number, number]>; // X, Y, Z
  scale: AnimatableProperty<[number, number]>; // Scale X %, Scale Y %
  scaleLocked: boolean;
  rotation: AnimatableProperty<number>; // Degrees
  rotationX?: AnimatableProperty<number>; // 3D Tilt X
  rotationY?: AnimatableProperty<number>; // 3D Tilt Y
  opacity: AnimatableProperty<number>; // 0 to 100
  anchorPoint: AnimatableProperty<[number, number]>; // X, Y offset from center
}

export type EffectType =
  | 'glow'
  | 'glitch'
  | 'motion_blur'
  | 'gaussian_blur'
  | 'wave_warp'
  | 'color_tint'
  | 'vignette'
  | 'film_grain'
  | 'displacement';

export interface LayerEffect {
  id: string;
  type: EffectType;
  name: string;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

export interface LayerExpression {
  enabled: boolean;
  type: 'wiggle' | 'spin' | 'pulse' | 'none';
  freq: number; // frequency (times per second)
  amp: number;  // amplitude (pixels or degrees)
}

export type ShapeType = 'rect' | 'rounded_rect' | 'circle' | 'star' | 'polygon' | 'triangle';

export interface ShapeData {
  shapeType: ShapeType;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  cornerRadius?: number;
  starPoints?: number;
  width?: number;
  height?: number;
}

export interface TextData {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  letterSpacing: number; // px tracking
  lineHeight: number;
  align: 'center' | 'left' | 'right';
  isBold: boolean;
  isItalic: boolean;
  shadowBlur?: number;
  shadowColor?: string;
}

export interface ImageData {
  url: string;
  naturalWidth?: number;
  naturalHeight?: number;
  fit?: 'contain' | 'cover' | 'original';
}

export interface AELayer {
  id: string;
  name: string;
  type: LayerType;
  colorLabel: string; // color tag like AE
  visible: boolean;
  locked: boolean;
  solo: boolean;
  motionBlur: boolean;
  is3D: boolean;
  inFrame: number;
  outFrame: number;
  parentId?: string | null;
  blendMode: BlendMode;
  transform: TransformProperties;
  effects: LayerEffect[];
  expression?: LayerExpression;
  shapeData?: ShapeData;
  textData?: TextData;
  imageData?: ImageData;
  mediaUrl?: string;
  solidColor?: string;
}

export interface Composition {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  bgColor: string;
  aspectRatio: AspectRatioType;
}

export type ActiveTool = 'select' | 'hand' | 'zoom' | 'rotate' | 'anchor' | 'shape' | 'text';

export type InspectorTab = 'transform' | 'effects' | 'graph' | 'content' | 'blend' | 'expression' | 'presets';
