export type RoomStatus = 'VACANT' | 'RENTED' | 'DEPOSIT_RESERVED' | 'MAINTENANCE';

export interface BuildingItem {
  id: string;
  name: string;
  address: string;
  active: boolean;
  totalRooms: number;
  vacantRooms: number;
  createdAt: string;
}

export interface FloorItem {
  id: string;
  buildingId: string;
  name: string;
  floorOrder: number;
  createdAt: string;
}

export interface RoomItem {
  id: string;
  buildingId: string;
  buildingName: string;
  floorId?: string;
  floorName?: string;
  roomNumber: string;
  basePrice: string | number;
  depositAmount: string | number;
  area?: number;
  maxTenants: number;
  bookable: boolean;
  status: RoomStatus;
  createdAt: string;
}
