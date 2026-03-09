import { supabase } from '../lib/supabase';
import { UploadTask, InspectionState } from '../types/photoCapture';
import { PHOTO_SLOTS } from '../config/photoSlots';
import imageCompression from 'browser-image-compression';

export function getPhotoUrlWithFallback(storagePath: string): string {
  if (!storagePath) return '';
  if (storagePath.startsWith('http')) return storagePath;
  return `https://aviwltfqlunxxvkajpyt.supabase.co/storage/v1/object/public/claim-photos/${storagePath}`;
}

export function buildPhotoPath(firm: string, claimNumber: string, photoType: string, sequence: number): string {
  const cleanFirm = firm?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'UNKNOWN';
  const cleanClaim = claimNumber?.replace(/[^a-zA-Z0-9-]/g, '') || 'UNKNOWN';
  const cleanType = photoType?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'photo';
  const seq = String(sequence).padStart(2, '0');
  return `${cleanFirm}-${cleanClaim}-${cleanType}-${seq}`;
}

export class UploadManager {
  private queue: UploadTask[] = [];
  private maxRetries = 3;
  private processing = false;
  private lastError: string | null = null;

  async addPhoto(slotId: string, blob: Blob): Promise<string> {
    const photoId = crypto.randomUUID();

    const task: UploadTask = {
      photoId,
      slotId,
      blob,
      status: 'pending',
      retryCount: 0
    };

    this.queue.push(task);

    // Start processing if not already
    if (!this.processing) {
      this.processQueue();
    }

    return photoId;
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.some(t => t.status === 'pending' || (t.status === 'failed' && t.retryCount < this.maxRetries))) {
      for (const task of this.queue) {
        if (task.status === 'completed') continue;
        if (task.status === 'uploading') continue;
        if (task.status === 'failed' && task.retryCount >= this.maxRetries) continue;

        await this.uploadPhoto(task);
      }

      await this.delay(1000);
    }

    this.processing = false;
  }

  private async uploadPhoto(task: UploadTask) {
    try {
      task.status = 'uploading';

      // Get claim_id and inspection_type from somewhere accessible
      const claimId = (window as any).__current_claim_id;
      const inspectionType = (window as any).__inspection_type;

      if (!claimId) {
        throw new Error('No claim ID available');
      }

      // Compress photo — imageCompression expects File, convert Blob
      const file = new File([task.blob], `${task.photoId}.jpg`, { type: 'image/jpeg' });
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        maxSizeMB: 1.5,
        useWebWorker: true,
      });

      // Upload to storage
      const path = `claim/${claimId}/${task.photoId}.jpg`;
      const { error: storageError } = await supabase.storage
        .from('claim-photos')
        .upload(path, compressed, { contentType: 'image/jpeg' });

      if (storageError) throw storageError;

      // Save to database
      const slot = PHOTO_SLOTS.find(s => s.id === task.slotId);
      if (!slot) throw new Error('Slot not found');

      const { error: dbError } = await supabase
        .from('claim_photos')
        .insert({
          id: task.photoId,
          claim_id: claimId,
          storage_path: path,
          photo_type: slot.photo_type,
          order_index: slot.order_index,
          required: slot.required,
          conditional_group: slot.conditional_group || null,
          inspection_type: inspectionType
        });

      if (dbError) throw dbError;

      task.status = 'completed';

    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error(`Upload failed for ${task.photoId}:`, msg);
      this.lastError = msg;
      task.retryCount++;
      task.status = 'failed';

      // Retry with backoff
      if (task.retryCount < this.maxRetries) {
        await this.delay(1000 * Math.pow(2, task.retryCount));
        task.status = 'pending';
      }
    }
  }

  getStatus(): { allComplete: boolean; uploading: number; failed: number; pending: number; lastError: string | null } {
    const pending = this.queue.filter(t => t.status === 'pending').length;
    const uploading = this.queue.filter(t => t.status === 'uploading').length;
    const failed = this.queue.filter(t => t.status === 'failed' && t.retryCount >= this.maxRetries).length;
    const allComplete = this.queue.length > 0 && this.queue.every(t => t.status === 'completed');

    return { allComplete, uploading, failed, pending, lastError: this.lastError };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getTaskStatus(photoId: string): UploadTask | undefined {
    return this.queue.find(t => t.photoId === photoId);
  }
}

export const uploadManager = new UploadManager();
