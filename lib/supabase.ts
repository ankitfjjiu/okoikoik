
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://libqgqvmjkwzrzsntqos.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2GrnGLULuGzWbBtKKIn7qQ_EZJZqwC5';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Bucket name constant - Ensure this bucket exists in your Supabase Storage
export const STORAGE_BUCKET = 'images';
