
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iugrqgfkylyhakbhhnis.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TfG1sxZZ35KCiA2nE_A6GA_IlvBgxem';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Bucket name constant - Ensure this bucket exists in your Supabase Storage
export const STORAGE_BUCKET = 'images';
