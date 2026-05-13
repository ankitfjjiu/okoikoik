import { createClient } from '@supabase/supabase-js';

const projects = [
  { id: 1, url: 'https://pzfvdryaqxwhrtfhpood.supabase.co', key: 'sb_publishable_R5cblIRgwcT0vnTTAY6_1Q_RzHM044n' },
  { id: 2, url: 'https://ohyszjcmnnoqpaegozxq.supabase.co', key: 'sb_publishable_GPeydA56Zvp3IgAxHlzy9g_c51IzpTG' },
  { id: 3, url: 'https://ptpwbxqvxdyzmgthvstj.supabase.co', key: 'sb_publishable_b3uo7jjjEyLGiJ4prGXV7A_fp8Kd7lJ' },
  { id: 4, url: 'https://dmbgokkudhmtthfisbop.supabase.co', key: 'sb_publishable_U0yEQrTn0kCleNvBbBce6A_R6gr7qk6' },
  { id: 5, url: 'https://qpszmpuulfjaczzmqfpn.supabase.co', key: 'sb_publishable_NymaC6i9FhTHueDxSpBcGw_Mc5IR5yA' },
  { id: 6, url: 'https://ajkqczrgcjsikcwjjxgy.supabase.co', key: 'sb_publishable_xM3qDr_jtNsuOecnxuM6pQ_H3Xp_0X6' },
  { id: 7, url: 'https://ahchpedtmdvuexvaixas.supabase.co', key: 'sb_publishable_Og8xZsKtq28C4mLiP012KQ_DfdOMckq' }
];

export const STORAGE_BUCKET = 'images';

const getStoredIndex = (): number => {
  if (typeof window === 'undefined') return 0;
  const saved = localStorage.getItem('supabase_project_index');
  return saved ? parseInt(saved) : 0;
};

export const getSupabaseClient = () => {
  const index = getStoredIndex();
  const project = projects[index] || projects[0];
  return {
    client: createClient(project.url, project.key),
    index: index,
    projectId: project.id
  };
};

export const rotateProject = (): number => {
  const currentIndex = getStoredIndex();
  const nextIndex = (currentIndex + 1) % projects.length;
  localStorage.setItem('supabase_project_index', nextIndex.toString());
  return nextIndex;
};
