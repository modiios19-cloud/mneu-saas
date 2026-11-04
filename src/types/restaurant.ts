export interface Category {
  id: string;
  labelAr: string;
  labelEn?: string;
  sublabelEn?: string;
  name?: string;
  nameEn?: string;
  icon?: string;
  isActive?: boolean;
}

export type ItemBadge = 'popular' | 'new' | 'offer' | 'soldout' | 'spicy';

export interface MenuItem {
  id: string;
  categoryId: string;
  nameAr: string;
  nameEn?: string;
  descriptionAr: string;
  descriptionEn?: string;
  price: number;
  originalPrice?: number;
  calories?: number;
  imageUrl: string;
  isPopular?: boolean;
  isSpicy?: boolean;
  isVegetarian?: boolean;
  badge?: ItemBadge | string;
  isSoldOut?: boolean;
}

export interface RestaurantContact {
  phone?: string;
  whatsapp?: string;
  maps?: string;
  instagram?: string;
  tiktok?: string;
  locationNameAr?: string;
  locationNameEn?: string;
  workingHoursAr?: string;
  workingHoursEn?: string;
}

export interface ClientContact {
  name?: string;
  phone?: string;
  location?: string;
  locationUrl?: string;
}

export interface RestaurantData {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  logoUrl: string;
  coverUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  currency?: string;
  statusText?: string;
  statusTextEn?: string;
  isActive?: boolean;
  type?: 'restaurant' | 'cafe' | string;
  themeConfig?: Record<string, any>;
  /** Self-contained HTML exported for this menu, authored in Stitch. */
  stitchDesignCode?: string;
  layoutStyle?: string;
  fontFamily?: string;
  borderRadius?: string;
  scansCount?: number;
  views?: number;
  lastScanAt?: string;
  dailyViews?: { date: string; views: number; scans: number }[];
  analytics?: {
    qr: number;
    social: number;
    direct: number;
    categoryViews?: { categoryId: string; views: number }[];
  };
  categories: Category[];
  products: MenuItem[];
  contact: RestaurantContact;
  client?: ClientContact;
  businessInfo?: string;
  updatedAt?: string;
}

export interface PlatformSettings {
  platformTagline?: string;
  platformSubtitle?: string;
  platformName: string;
  platformLogoUrl?: string;
  allowedVenueTypes?: { id: string; labelAr: string; icon?: string }[];
  /** Public HTTPS origin used to build client-facing preview links. */
  publicBaseUrl?: string;
}

