
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createImagesBucket() {
  try {
    const { data, error } = await supabase.storage.createBucket('images', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('Bucket "images" already exists.');
      } else {
        console.error('Error creating bucket:', error);
      }
    } else {
      console.log('Bucket "images" created successfully:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createImagesBucket();
