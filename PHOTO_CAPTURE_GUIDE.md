# Guided Photo Capture - Implementation Guide

## Overview

The guided photo capture flow has been implemented with strict landscape-only requirements and a step-by-step guided interface for vehicle inspections.

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration to add required fields:

```bash
# In Supabase SQL Editor, run:
```

```sql
-- Contents of add-photo-capture-fields.sql
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS photo_type TEXT;
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS order_index INTEGER;
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT false;
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS conditional_group TEXT;
ALTER TABLE claim_photos ADD COLUMN IF NOT EXISTS inspection_type TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS photos_completed BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_claim_photos_claim_id_order ON claim_photos(claim_id, order_index);
CREATE INDEX IF NOT EXISTS idx_claim_photos_photo_type ON claim_photos(photo_type);
```

### 2. Build and Deploy

```bash
npm run build
npm run deploy
```

## Features Implemented

### ✅ Landscape-Only Capture
- Blocks photo capture if device is in portrait mode
- Shows warning message to rotate device
- Validates dimensions before and after capture
- No portrait photos can be saved

### ✅ Inspection Type Selection
- Regular Vehicle (29 photo slots + conditionals)
- Heavy Duty / Commercial Vehicle (26 photo slots + conditionals + unlimited tire photos)

### ✅ Required Photo Sequence
**Base Flow (Both Types):**
1. VIN (windshield)
2. VIN (manufacturer sticker)
3. Mileage / oil sticker
4. Driver door interior
5. Rear interior
6. Center console
7. Headliner
8. Engine bay
9. Engine oil dipstick
10. Manufacturer/specialty label (conditional for regular, required for heavy duty)
11-19. Exterior shots (LF, left side, LR, rear, license plate, RR, right side, RF, front)
20-22. Damage photos (wide, close, details)
23-25. Conditional sections (structural, airbags, tow bill)

**Tire Section:**
- Regular: 4 required per-wheel tire tread photos (LF, LR, RR, RF)
- Heavy Duty: Generic tire photos (minimum 1, unlimited maximum)

### ✅ Step Locking
- Inspector cannot skip required slots
- Must capture current slot before proceeding
- Multi-photo slots allow "Next" button after first photo

### ✅ Soft Lock
- Photos can be retaken until inspection is completed
- After completion, photos become read-only
- "Complete Inspection" button disabled until all required slots filled

### ✅ Background Upload
- Photos upload automatically in background
- Upload status indicator shows progress
- Retry logic with exponential backoff
- Inspector can navigate away while uploads continue

### ✅ Conditional Sections
- Toggle switches for: Structural Damage, Airbags Deployed, Tow Bill
- If enabled, minimum 1 photo required
- If not enabled, section is skipped

### ✅ Progress Tracking
- "X of Y completed" counter
- Visual slot navigation grid
- Checkmarks on completed slots
- Current slot highlighted

## User Flow

1. **Access Photo Capture**
   - From claim detail page, click "📷 Guided Photo Capture" button

2. **Select Inspection Type**
   - Choose: Regular Vehicle or Heavy Duty / Commercial Vehicle

3. **Manufacturer Label Prompt (Regular Vehicles Only)**
   - Answer: "Yes - Label Present" or "No - No Label"
   - If yes, label photos will be required

4. **Enable Conditional Sections**
   - Toggle on any applicable sections:
     - Structural Damage
     - Airbags Deployed
     - Tow Bill

5. **Capture Photos in Order**
   - Follow guided sequence
   - Each slot shows:
     - Label (with * for required)
     - Instruction text
     - Capture button
     - Previously captured photos with retake option
   - Landscape mode enforced at every capture

6. **Navigate Between Slots**
   - Use slot navigation grid at bottom
   - Green = completed
   - Blue = current
   - Gray = pending

7. **Complete Inspection**
   - Button enabled when all required slots filled
   - Confirmation if uploads still in progress
   - Photos become read-only after completion

## Technical Implementation

### Files Created
- `src/types/photoCapture.ts` - Type definitions
- `src/config/photoSlots.ts` - Photo slot configuration
- `src/utils/photoCapture.ts` - Flow control logic
- `src/utils/uploadManager.ts` - Background upload manager
- `src/routes/appraiser/PhotoCapture.tsx` - Main UI component

### Files Modified
- `src/main.tsx` - Added route
- `src/routes/appraiser/ClaimDetail.tsx` - Added button link

### Database Schema
- `claim_photos.photo_type` - Type of photo (vin_windshield, etc.)
- `claim_photos.order_index` - Order in sequence
- `claim_photos.required` - Whether slot is required
- `claim_photos.conditional_group` - For conditional sections
- `claim_photos.inspection_type` - regular or heavy_duty
- `claims.photos_completed` - Inspection completion status

## Landscape Mode Enforcement

The system enforces landscape mode at THREE levels:

1. **Screen Orientation Check**
   ```typescript
   const orientation = screen.orientation?.type || 'portrait-primary';
   if (orientation.includes('portrait')) {
     alert('Please rotate device to LANDSCAPE mode');
     return null;
   }
   ```

2. **Camera Settings Validation**
   ```typescript
   const settings = videoTrack.getSettings();
   if (settings.width <= settings.height) {
     alert('Photo must be in LANDSCAPE orientation');
     return null;
   }
   ```

3. **Post-Capture Dimension Validation**
   ```typescript
   const img = await createImageBitmap(blob);
   if (img.width <= img.height) {
     alert('Photo orientation validation failed');
     return null;
   }
   ```

## Browser Compatibility

**Required APIs:**
- `navigator.mediaDevices.getUserMedia()` - Camera access
- `ImageCapture` API - Photo capture
- `createImageBitmap()` - Dimension validation
- `screen.orientation` - Orientation detection

**Supported Browsers:**
- Chrome/Edge (Android, Desktop)
- Safari (iOS 14.3+, requires HTTPS)
- Firefox (Android, Desktop)

**Not Supported:**
- IE11
- Legacy mobile browsers

## Troubleshooting

### Camera Access Denied
- Ensure HTTPS (required for camera API)
- Check browser permissions
- Verify no other app using camera

### Orientation Not Detected
- Screen Orientation API may not be available
- Fallback to dimension validation still works
- Prompt user to manually rotate device

### Upload Failures
- Check network connection
- Verify Supabase credentials
- Review browser console for errors
- Photos will retry automatically

### Photos Not Saving
- Verify database migration completed
- Check `claim_id` is available in global scope
- Ensure Supabase storage bucket permissions

## Mobile Optimization

- Large touch targets (minimum 44x44px)
- Clear visual feedback
- Warning banners for orientation
- Responsive layout
- Background upload prevents blocking

## Security Considerations

- Photos compressed before upload (max 1.5MB)
- Existing RLS policies apply
- No client-side storage of sensitive data
- Service role key used by edge function for auto-deletion

## Next Steps

1. **Test on actual devices** - iOS and Android
2. **Adjust photo slots** - If needed, modify `photoSlots.ts`
3. **Customize instructions** - Update instruction text per slot
4. **Add photo previews** - In claim detail page if needed
5. **Report generation** - Use photo_type and order_index for organized reports

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database migration completed
3. Test camera permissions
4. Review Supabase logs for upload errors
