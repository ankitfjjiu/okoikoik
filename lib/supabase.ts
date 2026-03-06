
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ohyszjcmnnoqpaegozxq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GPeydA56Zvp3IgAxHlzy9g_c51IzpTG';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Bucket name constant - Ensure this bucket exists in your Supabase Storage
export const STORAGE_BUCKET = 'images';
