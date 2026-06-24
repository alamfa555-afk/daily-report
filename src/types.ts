export interface Site {
  id: string;
  name: string;
  siteNo: string;
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
