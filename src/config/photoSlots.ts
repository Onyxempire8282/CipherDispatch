import { PhotoSlot } from '../types/photoCapture';

export const PHOTO_SLOTS: PhotoSlot[] = [
  // Base flow (both types)
  { id: 'vin_windshield', photo_type: 'vin_windshield', label: 'VIN (Windshield)', instruction: 'Capture VIN through windshield in landscape mode', order_index: 1, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'vin_sticker', photo_type: 'vin_sticker', label: 'VIN (Manufacturer Sticker)', instruction: 'Capture manufacturer VIN sticker in landscape mode', order_index: 2, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'mileage', photo_type: 'mileage', label: 'Mileage / Oil Sticker', instruction: 'Capture odometer or oil sticker in windshield', order_index: 3, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'door_interior', photo_type: 'door_interior', label: 'Driver Door Interior', instruction: 'Capture driver door panel', order_index: 4, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'rear_interior', photo_type: 'rear_interior', label: 'Rear Interior', instruction: 'Capture rear seating area', order_index: 5, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'console', photo_type: 'console', label: 'Center Console', instruction: 'Capture center console area', order_index: 6, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'headliner', photo_type: 'headliner', label: 'Headliner', instruction: 'Capture roof interior', order_index: 7, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'engine_bay', photo_type: 'engine_bay', label: 'Engine Bay', instruction: 'Capture engine compartment overview', order_index: 8, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'dipstick', photo_type: 'dipstick', label: 'Engine Oil Dipstick', instruction: 'Capture oil dipstick reading', order_index: 9, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },

  // Manufacturer label (CONDITIONAL for regular, REQUIRED for heavy duty)
  { id: 'label_regular', photo_type: 'manufacturer_label', label: 'Manufacturer/Specialty Label', instruction: 'Capture label if present', order_index: 10, required: false, inspection_types: ['regular'], max_photos: -1 },
  { id: 'label_heavy', photo_type: 'manufacturer_label', label: 'Manufacturer/Specialty Label', instruction: 'Capture truck body tags, trailer tags, specialty equipment labels', order_index: 10, required: true, inspection_types: ['heavy_duty'], max_photos: -1 },

  // Exterior
  { id: 'lf_exterior', photo_type: 'lf_exterior', label: 'Left Front', instruction: 'Capture left front quarter panel', order_index: 11, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'left_side', photo_type: 'left_side', label: 'Left Side', instruction: 'Capture left side profile', order_index: 12, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'lr_exterior', photo_type: 'lr_exterior', label: 'Left Rear', instruction: 'Capture left rear quarter panel', order_index: 13, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'rear', photo_type: 'rear', label: 'Rear', instruction: 'Capture rear view', order_index: 14, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'license_plate', photo_type: 'license_plate', label: 'License Plate', instruction: 'Capture license plate clearly', order_index: 15, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'rr_exterior', photo_type: 'rr_exterior', label: 'Right Rear', instruction: 'Capture right rear quarter panel', order_index: 16, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'right_side', photo_type: 'right_side', label: 'Right Side', instruction: 'Capture right side profile', order_index: 17, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'rf_exterior', photo_type: 'rf_exterior', label: 'Right Front', instruction: 'Capture right front quarter panel', order_index: 18, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'front', photo_type: 'front', label: 'Front', instruction: 'Capture front view', order_index: 19, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },

  // Damage
  { id: 'damage_wide', photo_type: 'damage_wide', label: 'Damage Overview (Wide)', instruction: 'Capture damage from distance', order_index: 20, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'damage_close', photo_type: 'damage_close', label: 'Damage Overview (Closer)', instruction: 'Capture damage detail', order_index: 21, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: 1 },
  { id: 'damage_detail', photo_type: 'damage_detail', label: 'Damage Photos', instruction: 'Capture additional damage details (minimum 1 required)', order_index: 22, required: true, inspection_types: ['regular', 'heavy_duty'], max_photos: -1 },

  // Conditional
  { id: 'structural', photo_type: 'structural_damage', label: 'Structural Damage', instruction: 'Capture frame/structural damage', order_index: 23, required: false, conditional_group: 'structural', inspection_types: ['regular', 'heavy_duty'], max_photos: -1 },
  { id: 'airbags', photo_type: 'airbags_deployed', label: 'Airbags Deployed', instruction: 'Capture deployed airbags clearly visible in interior', order_index: 24, required: false, conditional_group: 'airbags', inspection_types: ['regular', 'heavy_duty'], max_photos: -1 },
  { id: 'tow_bill', photo_type: 'tow_bill', label: 'Tow Bill', instruction: 'Capture tow bill/receipt', order_index: 25, required: false, conditional_group: 'tow_bill', inspection_types: ['regular', 'heavy_duty'], max_photos: -1 },

  // Tires - Regular Vehicle (per-wheel)
  { id: 'lf_tread', photo_type: 'lf_tread', label: 'Left Front Tire Tread', instruction: 'Capture LF tire tread depth', order_index: 26, required: true, inspection_types: ['regular'], max_photos: 1 },
  { id: 'lr_tread', photo_type: 'lr_tread', label: 'Left Rear Tire Tread', instruction: 'Capture LR tire tread depth', order_index: 27, required: true, inspection_types: ['regular'], max_photos: 1 },
  { id: 'rr_tread', photo_type: 'rr_tread', label: 'Right Rear Tire Tread', instruction: 'Capture RR tire tread depth', order_index: 28, required: true, inspection_types: ['regular'], max_photos: 1 },
  { id: 'rf_tread', photo_type: 'rf_tread', label: 'Right Front Tire Tread', instruction: 'Capture RF tire tread depth', order_index: 29, required: true, inspection_types: ['regular'], max_photos: 1 },

  // Tires - Heavy Duty (generic)
  { id: 'tires_generic', photo_type: 'tires_generic', label: 'Tires (Generic)', instruction: 'Capture tire condition (minimum 1 required)', order_index: 26, required: true, inspection_types: ['heavy_duty'], max_photos: -1 },
];
