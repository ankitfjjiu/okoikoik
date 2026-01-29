
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://myuqhthjcmuamiftwxyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YcrVKkzLUCi8auCHswcfqw_Vid0GWuF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Bucket name constant - Ensure this bucket exists in your Supabase Storage
export const STORAGE_BUCKET = 'images';
