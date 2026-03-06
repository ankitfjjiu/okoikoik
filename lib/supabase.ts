import { createClient } from '@supabase/supabase-js';

// Sabhi 7 Projects ki details ek array mein
const projects = [
  { url: 'https://myuqhthjcmuamiftwxyb.supabase.co', key: 'sb_publishable_YcrVKkzLUCi8auCHswcfqw_Vid0GWuF' }, // 1
  { url: 'https://ohyszjcmnnoqpaegozxq.supabase.co', key: 'sb_publishable_GPeydA56Zvp3IgAxHlzy9g_c51IzpTG' }, // 2
  { url: 'https://ptpwbxqvxdyzmgthvstj.supabase.co', key: 'sb_publishable_b3uo7jjjEyLGiJ4prGXV7A_fp8Kd7lJ' }, // 3
  { url: 'https://dmbgokkudhmtthfisbop.supabase.co', key: 'sb_publishable_U0yEQrTn0kCleNvBbBce6A_R6gr7qk6' }, // 4
  { url: 'https://qpszmpuulfjaczzmqfpn.supabase.co', key: 'sb_publishable_NymaC6i9FhTHueDxSpBcGw_Mc5IR5yA' }, // 5
  { url: 'https://ajkqczrgcjsikcwjjxgy.supabase.co', key: 'sb_publishable_xM3qDr_jtNsuOecnxuM6pQ_H3Xp_0X6' }, // 6
  { url: 'https://ahchpedtmdvuexvaixas.supabase.co', key: 'sb_publishable_Og8xZsKtq28C4mLiP012KQ_DfdOMckq' }  // 7
];

// Sabhi clients ko initialize kar rahe hain
const clients = projects.map(p => createClient(p.url, p.key));

export const STORAGE_BUCKET = 'images';

/**
 * Yeh function har baar call hone par agla Supabase client return karega
 */
export const getSupabase = () => {
  if (typeof window === 'undefined') return clients[0]; // Server side safety

  // LocalStorage se current index nikalna
  let currentIndex = parseInt(localStorage.getItem('supabase_project_index') || '0');

  // Client select karna
  const selectedClient = clients[currentIndex];

  // Agli baar ke liye index update karna (0 se 6 ke beech)
  let nextIndex = (currentIndex + 1) % projects.length;
  localStorage.setItem('supabase_project_index', nextIndex.toString());

  console.log(`Using Supabase Project No: ${currentIndex + 1}`);
  return selectedClient;
};

// Default export (optional, safe side ke liye)
export const supabase = clients[0];
