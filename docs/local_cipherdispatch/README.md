# Claim Cipher - Local Static App

This is a fully functional static HTML/JavaScript version of the Claim Cipher auto appraisal app. It uses the same Supabase backend as the React version.

## Features

✅ **Authentication** - Login with existing Supabase accounts (admin/appraiser roles)
✅ **View Claims** - Browse active and archived claims
✅ **Create Claims** - Add new claims with all details
✅ **Claim Details** - View full claim information
✅ **Photo Management** - Upload, view, and delete photos from phone/camera
✅ **Photo Gallery** - Lightbox viewer with navigation and download
✅ **Map Integration** - Click to open address in device maps app
✅ **Role-Based Access** - Admins see all claims, appraisers see their assigned claims
✅ **Mobile Friendly** - Works on phones, tablets, and desktops

## How to Use

### Option 1: Open Directly in Browser

Simply open `index.html` in any modern web browser (Chrome, Safari, Firefox, Edge).

### Option 2: Use Live Server (Recommended)

1. Install a local web server (e.g., VS Code Live Server extension)
2. Right-click `index.html` and select "Open with Live Server"
3. The app will open in your browser

### Option 3: Python HTTP Server

```bash
# Navigate to the local_cipherdispatch folder
cd local_cipherdispatch

# Start a simple HTTP server
python -m http.server 8000

# Open http://localhost:8000 in your browser
```

## File Structure

```
local_cipherdispatch/
├── index.html          # Login page
├── admin.html          # Admin claims list (all claims)
├── my-claims.html      # Appraiser claims list (assigned only)
├── new-claim.html      # Create new claim form
├── claim-detail.html   # View/edit claim with photos
├── styles.css          # Shared styles
└── js/
    └── config.js       # Supabase configuration
```

## Login Credentials

Use the same login credentials you created in the React app. The app will automatically redirect based on your role:

- **Admin role** → Redirects to admin.html (view all claims)
- **Appraiser role** → Redirects to my-claims.html (view assigned claims)

## Photo Upload

- **From Phone**: Tap "Upload Photos" → Choose Camera or Photo Library
- **From Desktop**: Click "Upload Photos" → Select files
- **Multiple Photos**: Select multiple images at once
- **Auto Compression**: Images are automatically compressed to 1.5MB max
- **Delete**: Click the ✕ button on any photo thumbnail
- **View Full Size**: Click any photo to open lightbox with navigation
- **Download**: Use download button in lightbox

## Map Integration

When viewing a claim with an address, click the "📍 Open in Maps" button:

- **iPhone/iPad**: Opens in Apple Maps
- **Android**: Opens in Google Maps
- **Desktop**: Opens in default browser maps

## Browser Compatibility

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Works offline with cached data (PWA features)

## Troubleshooting

### White/Blank Screen

- Check browser console for errors (F12 or Cmd+Option+I)
- Ensure you have internet connection (needs to connect to Supabase)
- Try clearing browser cache and reload

### Photos Not Uploading

- Check file size (should be < 10MB)
- Ensure images are in supported format (JPG, PNG, HEIC, WebP)
- Check browser console for Supabase storage errors

### Map Not Opening

- Ensure claim has a complete address
- Check if device/browser allows opening external apps
- Try copying address and pasting into maps manually

## Supabase Connection

This app connects to the same Supabase instance as your React app:

- **URL**: https://qrouuoycvxxxutkxkxpp.supabase.co
- **Database**: claims, profiles tables
- **Storage**: claim-photos bucket
- **Auth**: Email/password authentication with RLS

## Advantages of Static Version

1. **No Build Required** - Just open and use
2. **Works Anywhere** - Any device with a web browser
3. **Easy Deployment** - Upload to any web host
4. **No Dependencies** - No npm install needed
5. **Fast Loading** - Minimal JavaScript bundle
6. **Offline Ready** - Can cache for offline use

## Notes

- All data is synced with the React app (same database)
- Photos uploaded here appear in React app and vice versa
- Changes made here are immediately visible in React app
- Uses the same authentication system
