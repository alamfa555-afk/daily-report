export interface Site {
  id: string;
  name: string;
  siteNo: string;
  projectManager?: string;
  createdAt: string;
}

export type ElementStatus = 'good' | 'damage' | 'reject';

export interface UnloadingDetails {
  unloaderId: string;
  unloaderName: string;
  unloaderTitle: string;
  equipmentType: string; // mobile crane, crawler crane, forklift, manlift, etc.
  capacity: number; // in Tons
  equipmentPlateNo: string;
  operatorName: string;
  operatorId: string;
  equipmentStatus?: "ARA" | "rented";
}

export interface ErectionDetails {
  erectorId: string;
  erectorName: string;
  erectorTitle: string;
  equipmentType: string;
  capacity: number; // in Tons
  equipmentPlateNo: string;
  operatorName: string;
  operatorId: string;
  equipmentStatus?: "ARA" | "rented";
}

export interface Delivery {
  id: string;
  siteId: string;
  mdrNo: string;
  elementCode: string;
  elementType: string;
  weight: number; // in Ton
  quantity: number;
  totalWeight: number; // weight * quantity
  status: ElementStatus;
  zone: string;
  villaType: string;
  buildingNo: string;
  floorNo?: string;
  houseNo: string;
  flatNo: string;
  trailerNo?: string;
  unloadingDetails: UnloadingDetails;
  remarks?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  recordedBy: string;
}

export interface Erection {
  id: string;
  siteId: string;
  elementCode: string;
  elementType: string;
  weight: number; // in Ton
  quantity: number;
  totalWeight: number; // weight * quantity
  status: ElementStatus;
  zone: string;
  villaType: string;
  buildingNo: string;
  floorNo?: string;
  houseNo: string;
  flatNo: string;
  erectionDetails: ErectionDetails;
  remarks?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  recordedBy: string;
}

export interface Suggestion {
  id: string;
  fieldName: string;
  value: string;
  createdAt: string;
}

export interface Equipment {
  id: string;
  siteId: string;
  siteNo: string;
  equipmentType: string; // mobile crane, crawler crane, forklift, manlift, etc.
  plateNo: string;
  capacity: number; // capacity (ton)
  status: 'rented' | 'ARA';
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operator';
  assignedSiteIds: string[];
  status: 'pending' | 'approved';
  createdAt: string;
}

export const ALLOWED_EMPLOYEES: Record<string, string> = {};


