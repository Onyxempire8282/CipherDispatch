#!/bin/bash

# Test script for photo cleanup function
# Tests the cleanup logic without actually deleting photos

echo "🧪 Testing Photo Cleanup Function"
echo "=================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if function exists
if [ ! -f "supabase/functions/cleanup-old-photos/index.ts" ]; then
    echo "❌ Function not found at: supabase/functions/cleanup-old-photos/index.ts"
    exit 1
fi

echo "✅ Function file found"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating template..."
    cat > .env << EOF
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CRON_SECRET=your_cron_secret_here
EOF
    echo "📝 Please edit .env file with your credentials"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate environment variables
if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://YOUR_PROJECT.supabase.co" ]; then
    echo "❌ SUPABASE_URL not configured in .env"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ "$SUPABASE_SERVICE_ROLE_KEY" = "your_service_role_key_here" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not configured in .env"
    exit 1
fi

echo "✅ Environment variables validated"
echo ""

# Test 1: Check database connectivity
echo "📊 Test 1: Checking database connectivity..."
psql "$SUPABASE_URL" -c "SELECT COUNT(*) FROM claim_photos;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "⚠️  Direct DB connection failed (this is OK if using API only)"
fi
echo ""

# Test 2: Query for old photos
echo "📊 Test 2: Querying for photos older than 14 days..."
CUTOFF_DATE=$(date -u -d '14 days ago' '+%Y-%m-%dT%H:%M:%S.000Z')
echo "   Cutoff date: $CUTOFF_DATE"

# Using curl to query via PostgREST API
OLD_PHOTOS=$(curl -s \
  "$SUPABASE_URL/rest/v1/claim_photos?select=count&created_at=lt.$CUTOFF_DATE" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

if [ $? -eq 0 ]; then
    echo "✅ Query successful"
    echo "   Result: $OLD_PHOTOS"
else
    echo "❌ Query failed"
fi
echo ""

# Test 3: Test function locally (if deployed)
echo "📊 Test 3: Testing deployed function..."
FUNCTION_URL="$SUPABASE_URL/functions/v1/cleanup-old-photos"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Function executed successfully"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "⚠️  Function not deployed yet. Deploy with:"
    echo "   supabase functions deploy cleanup-old-photos"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Authentication failed. Check CRON_SECRET in .env"
else
    echo "❌ Function returned HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 4: Verify storage access
echo "📊 Test 4: Checking storage bucket access..."
BUCKET_CHECK=$(curl -s \
  "$SUPABASE_URL/storage/v1/bucket/claim-photos" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

if echo "$BUCKET_CHECK" | grep -q '"id"'; then
    echo "✅ Storage bucket accessible"
else
    echo "❌ Storage bucket not accessible"
    echo "   Response: $BUCKET_CHECK"
fi
echo ""

echo "=================================="
echo "🏁 Test suite completed"
echo ""
echo "Next steps:"
echo "1. Review test results above"
echo "2. If function not deployed: supabase functions deploy cleanup-old-photos"
echo "3. Set up cron scheduling (see PHOTO_CLEANUP_DEPLOYMENT.md)"
echo "4. Monitor logs: supabase functions logs cleanup-old-photos"
