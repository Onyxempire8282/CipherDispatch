import { InspectionState, PhotoSlot, InspectionType } from '../types/photoCapture';
import { PHOTO_SLOTS } from '../config/photoSlots';

export function getActiveSlots(state: InspectionState): PhotoSlot[] {
  if (!state.inspection_type) return [];

  let slots = PHOTO_SLOTS.filter(slot =>
    slot.inspection_types.includes(state.inspection_type!)
  );

  // Handle manufacturer label for regular vehicles
  if (state.inspection_type === 'regular') {
    if (state.manufacturer_label_present === false) {
      slots = slots.filter(s => s.id !== 'label_regular');
    }
  }

  // Filter conditionals
  slots = slots.filter(slot => {
    if (!slot.conditional_group) return true;
    return state.enabled_conditionals.has(slot.conditional_group);
  });

  return slots.sort((a, b) => a.order_index - b.order_index);
}

export function getCurrentSlot(state: InspectionState): PhotoSlot | null {
  if (state.completed) return null;
  if (!state.inspection_type) return null;

  const activeSlots = getActiveSlots(state);

  // Find first incomplete slot
  for (const slot of activeSlots) {
    const capturedPhotos = state.captured_photos.get(slot.id) || [];
    const capturedCount = capturedPhotos.length;

    if (slot.max_photos === 1 && capturedCount === 0) {
      return slot;
    }

    if (slot.max_photos === -1 && slot.required && capturedCount === 0) {
      return slot;
    }
  }

  return null;
}

export function canProceedToNextSlot(state: InspectionState, slotId: string): boolean {
  const slot = PHOTO_SLOTS.find(s => s.id === slotId);
  if (!slot) return false;

  const capturedPhotos = state.captured_photos.get(slotId) || [];
  const capturedCount = capturedPhotos.length;

  if (slot.max_photos === 1) {
    return capturedCount >= 1;
  }

  if (slot.max_photos === -1 && slot.required) {
    return capturedCount >= 1;
  }

  return true;
}

export function canCompleteInspection(state: InspectionState): boolean {
  if (!state.inspection_type) return false;

  const activeSlots = getActiveSlots(state);

  for (const slot of activeSlots) {
    if (!slot.required && !slot.conditional_group) continue;

    const capturedPhotos = state.captured_photos.get(slot.id) || [];
    const capturedCount = capturedPhotos.length;

    if (slot.required && capturedCount === 0) {
      return false;
    }

    if (slot.conditional_group && state.enabled_conditionals.has(slot.conditional_group) && capturedCount === 0) {
      return false;
    }
  }

  return true;
}

export function getProgressStats(state: InspectionState): { completed: number; total: number } {
  if (!state.inspection_type) return { completed: 0, total: 0 };

  const activeSlots = getActiveSlots(state);

  let completed = 0;
  for (const slot of activeSlots) {
    if (!slot.required && !slot.conditional_group) continue;

    const capturedPhotos = state.captured_photos.get(slot.id) || [];
    const capturedCount = capturedPhotos.length;
    if (capturedCount > 0) completed++;
  }

  const total = activeSlots.filter(s =>
    s.required || (s.conditional_group && state.enabled_conditionals.has(s.conditional_group))
  ).length;

  return { completed, total };
}

export async function validateLandscapeOrientation(): Promise<{ valid: boolean; message?: string }> {
  const orientation = screen.orientation?.type || 'portrait-primary';

  if (orientation.includes('portrait')) {
    return {
      valid: false,
      message: 'Please rotate your device to LANDSCAPE mode to capture photos'
    };
  }

  return { valid: true };
}

export async function captureLandscapePhoto(): Promise<Blob | null> {
  try {
    // Check orientation first
    const orientationCheck = await validateLandscapeOrientation();
    if (!orientationCheck.valid) {
      alert(orientationCheck.message);
      return null;
    }

    // Request camera
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });

    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();

    // Validate dimensions
    if (settings.width && settings.height && settings.width <= settings.height) {
      stream.getTracks().forEach(track => track.stop());
      alert('Photo must be in LANDSCAPE orientation. Please rotate device.');
      return null;
    }

    // Capture
    const imageCapture = new ImageCapture(videoTrack);
    const blob = await imageCapture.takePhoto();

    // Double-check blob dimensions
    const img = await createImageBitmap(blob);
    if (img.width <= img.height) {
      stream.getTracks().forEach(track => track.stop());
      alert('Photo orientation validation failed. Please ensure device is in LANDSCAPE mode.');
      return null;
    }

    stream.getTracks().forEach(track => track.stop());
    return blob;

  } catch (error) {
    console.error('Camera error:', error);
    alert('Failed to access camera. Please check permissions.');
    return null;
  }
}
