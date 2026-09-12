export type CommissionTierId = 'bubbles' | 'frame_static' | 'frame_animation';

export interface CommissionTier {
  id: CommissionTierId;
  name: string;
  volts: number;
  badge: string;
  shortDesc: string;
  detailedDesc: string;
  turnaround: string;
  revisions: number;
  deliverables: string[];
  features: string[];
  popular?: boolean;
  accentColor: string;
  textColor: string;
  tagColor: string;
  paperTilt: string;
}

export interface CommissionAddon {
  id: string;
  name: string;
  description: string;
  volts: number;
  iconName: string;
}

export type OrderStatus =
  | 'pending'
  | 'sketch_review'
  | 'lineart_color'
  | 'animation_polish'
  | 'completed'
  | 'delivered';

export interface OrderReferenceFile {
  name: string;
  size: number;
  dataUrl: string;
}

export interface CommissionOrder {
  id: string;
  createdAt: string;
  clientName: string;
  discord: string;
  gmail: string;
  socialHandle?: string;
  tierId: CommissionTierId;
  characterName: string;
  characterDescription: string;
  poseAndExpression: string;
  animationDetails?: string;
  backgroundPreference: 'transparent' | 'comic_pop' | 'custom_color' | 'detailed';
  backgroundNote?: string;
  addons: string[];
  referenceLinks?: string;
  referenceFiles: OrderReferenceFile[];
  totalVolts: number;
  status: OrderStatus;
  artistNotes?: string;
  estimatedDelivery?: string;
  isPaid?: boolean;
}

export interface CommissionQueueStats {
  openSlots: number;
  totalSlots: number;
  isCommsOpen: boolean;
  activeOrdersCount: number;
  totalVoltsInQueue: number;
}
