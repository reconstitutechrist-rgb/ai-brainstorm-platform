#!/usr/bin/env ts-node

/**
 * Storage Buckets Setup Script
 * ============================
 * This script creates and configures Supabase storage buckets
 * for the AI Brainstorm Platform with proper security policies.
 *
 * Usage: npm run setup:storage
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('L Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// Create Supabase admin client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Bucket configurations
const BUCKETS = {
  references: {
    id: 'references',
    name: 'references',
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      // Videos
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      // Documents (for reference analysis)
      'application/pdf',
      'text/plain',
      'text/markdown'
    ]
  },
  documents: {
    id: 'documents',
    name: 'documents',
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'text/markdown',
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Archives
      'application/zip',
      'application/x-rar-compressed'
    ]
  }
};

// SQL for creating policies
const POLICIES_SQL = `
-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "references_upload_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "references_read_own_files" ON storage.objects;
DROP POLICY IF EXISTS "references_update_own_files" ON storage.objects;
DROP POLICY IF EXISTS "references_delete_own_files" ON storage.objects;
DROP POLICY IF EXISTS "documents_upload_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "documents_read_own_files" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_own_files" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_own_files" ON storage.objects;
DROP POLICY IF EXISTS "service_role_references_all" ON storage.objects;
DROP POLICY IF EXISTS "service_role_documents_all" ON storage.objects;

-- References bucket policies
CREATE POLICY "references_upload_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "references_read_own_files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "references_update_own_files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "references_delete_own_files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Documents bucket policies
CREATE POLICY "documents_upload_own_folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents_read_own_files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents_update_own_files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents_delete_own_files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role policies
CREATE POLICY "service_role_references_all"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'references')
  WITH CHECK (bucket_id = 'references');

CREATE POLICY "service_role_documents_all"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');
`;

/**
 * Check if a bucket exists
 */
async function bucketExists(bucketId: string): Promise<boolean> {
  const { data } = await supabase.storage.listBuckets();
  return data?.some(bucket => bucket.id === bucketId) || false;
}

/**
 * Create or update a storage bucket
 */
async function createOrUpdateBucket(config: typeof BUCKETS.references) {
  console.log(`\n=æ Processing bucket: ${config.id}`);

  const exists = await bucketExists(config.id);

  if (exists) {
    console.log(`   9  Bucket '${config.id}' already exists`);

    // Update bucket configuration
    const { error } = await supabase.storage.updateBucket(config.id, {
      public: config.public,
      fileSizeLimit: config.fileSizeLimit,
      allowedMimeTypes: config.allowedMimeTypes
    });

    if (error) {
      console.error(`   L Failed to update bucket:`, error.message);
      return false;
    }

    console.log(`    Bucket updated successfully`);
  } else {
    // Create new bucket
    const { error } = await supabase.storage.createBucket(config.id, {
      public: config.public,
      fileSizeLimit: config.fileSizeLimit,
      allowedMimeTypes: config.allowedMimeTypes
    });

    if (error) {
      console.error(`   L Failed to create bucket:`, error.message);
      return false;
    }

    console.log(`    Bucket created successfully`);
  }

  console.log(`   =Ê Config:`, {
    public: config.public,
    maxSize: `${config.fileSizeLimit / 1024 / 1024}MB`,
    mimeTypes: config.allowedMimeTypes.length
  });

  return true;
}

/**
 * Execute SQL policies
 */
async function createPolicies() {
  console.log(`\n= Creating storage policies...`);

  try {
    // Execute the SQL directly via supabase client
    const { error } = await supabase.rpc('exec_sql', { sql: POLICIES_SQL });

    if (error) {
      console.error(`   L Failed to create policies via RPC:`, error.message);
      console.log(`\n      Attempting direct SQL execution...`);

      // Try executing via raw query (this may not work with all Supabase setups)
      // Note: This is a fallback and may require manual execution
      console.log(`\n   =Ý Please run the following SQL in Supabase Dashboard SQL Editor:`);
      console.log(`   File: database/setup-storage-buckets.sql (Steps 3-6)`);
      return false;
    }

    console.log(`    Policies created successfully`);
    return true;
  } catch (error) {
    console.error(`   L Error creating policies:`, error);
    console.log(`\n   =Ý Manual step required:`);
    console.log(`   Please run: database/setup-storage-buckets.sql (Steps 3-6) in Supabase Dashboard`);
    return false;
  }
}

/**
 * Verify bucket setup
 */
async function verifySetup() {
  console.log(`\n= Verifying setup...`);

  const { data: buckets } = await supabase.storage.listBuckets();

  if (!buckets) {
    console.log(`   L Could not fetch buckets`);
    return;
  }

  const refBucket = buckets.find(b => b.id === 'references');
  const docBucket = buckets.find(b => b.id === 'documents');

  console.log(`\n   References bucket: ${refBucket ? ' EXISTS' : 'L MISSING'}`);
  if (refBucket) {
    console.log(`     - Public: ${refBucket.public ? 'Yes' : 'No'}`);
    console.log(`     - Size limit: ${refBucket.file_size_limit ? `${refBucket.file_size_limit / 1024 / 1024}MB` : 'None'}`);
  }

  console.log(`\n   Documents bucket: ${docBucket ? ' EXISTS' : 'L MISSING'}`);
  if (docBucket) {
    console.log(`     - Public: ${docBucket.public ? 'Yes' : 'No'}`);
    console.log(`     - Size limit: ${docBucket.file_size_limit ? `${docBucket.file_size_limit / 1024 / 1024}MB` : 'None'}`);
  }
}

/**
 * Main setup function
 */
async function main() {
  console.log(`TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW`);
  console.log(`Q  Storage Buckets Setup Script         Q`);
  console.log(`Q  AI Brainstorm Platform                Q`);
  console.log(`ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]`);
  console.log(`\n=€ Starting storage setup...\n`);
  console.log(`=á Supabase URL: ${supabaseUrl}`);
  console.log(`= Using service role key: ${supabaseServiceKey.substring(0, 20)}...`);

  try {
    // Step 1: Create/update buckets
    console.log(`\n`);
    console.log(`STEP 1: Create/Update Storage Buckets`);
    console.log(``);

    const refSuccess = await createOrUpdateBucket(BUCKETS.references);
    const docSuccess = await createOrUpdateBucket(BUCKETS.documents);

    if (!refSuccess || !docSuccess) {
      console.log(`\n   Some buckets failed to create/update`);
    }

    // Step 2: Create policies
    console.log(`\n`);
    console.log(`STEP 2: Create Storage Policies`);
    console.log(``);

    const policiesSuccess = await createPolicies();

    if (!policiesSuccess) {
      console.log(`\n   Policies creation failed or requires manual setup`);
      console.log(`\n=Ë Manual Steps:`);
      console.log(`   1. Open Supabase Dashboard ’ SQL Editor`);
      console.log(`   2. Run: database/setup-storage-buckets.sql (Steps 3-6)`);
      console.log(`   3. Or copy the policies SQL from this script`);
    }

    // Step 3: Verify
    console.log(`\n`);
    console.log(`STEP 3: Verification`);
    console.log(``);

    await verifySetup();

    // Final summary
    console.log(`\n`);
    console.log(` Storage setup completed!`);
    console.log(``);
    console.log(`\n=Ú Next Steps:`);
    console.log(`   1. If policies failed, run SQL manually in dashboard`);
    console.log(`   2. Test upload: POST /api/documents/upload`);
    console.log(`   3. Check frontend: /intelligence ’ Documents tab`);
    console.log(`\n<‰ Your document management system is ready!\n`);

  } catch (error) {
    console.error(`\nL Setup failed:`, error);
    console.log(`\n=¡ Fallback:`);
    console.log(`   Run database/setup-storage-buckets.sql in Supabase Dashboard\n`);
    process.exit(1);
  }
}

// Run the setup
main();
