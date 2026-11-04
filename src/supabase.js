import { createClient } from '@supabase/supabase-js';

// Chiave pubblicabile: non è un segreto (sta nel bundle). La protezione dei dati è nelle policy RLS.
export const supabaseUrl = 'https://qpufcekagamvpubosisj.supabase.co';
export const supabaseKey = 'sb_publishable_TA2hknW3eVbQZDKbueiruQ_wfnDkirV';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },   // il link funziona anche se aperto da un altro browser/dispositivo
});

export const DOMINIO = '@lemonsintheroom.com';
