// Photo capture type definitions

export type InspectionType = 'regular' | 'heavy_duty';

export interface PhotoSlot {
  id: string;
  photo_type: string;
  label: string;
  instruction: string;
  order_index: number;
  required: boolean;
  conditional_group?: string;
  inspection_types: InspectionType[];
  max_photos: number; // 1 for single, -1 for unlimited
}

export interface CapturedPhoto {
  id: string;
  slot_id: string;
  blob: Blob;
  url: string; // local preview URL
  uploaded: boolean;
}

export interface InspectionState {
  claim_id: string;
  inspection_type: InspectionType | null;
  completed: boolean;
  manufacturer_label_present?: boolean;
  enabled_conditionals: Set<string>;
  captured_photos: Map<string, CapturedPhoto[]>;
}

export interface UploadTask {
  photoId: string;
  slotId: string;
  blob: Blob;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  retryCount: number;
}
