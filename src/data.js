import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabase.js';

// Carica tutto e lo tiene allineato in tempo reale (Supabase Realtime).
export function useTeamData(session) {
  const [state, setState] = useState({ loading: true, error: null, members: [], posts: [], metrics: [], memberMetrics: [] });
  const [online, setOnline] = useState(false);
  const chRef = useRef(null);

  const load = useCallback(async () => {
    const [m, p, pm, mm] = await Promise.all([
      supabase.from('team_members').select('*').order('ordine'),
      supabase.from('posts').select('*').order('scheduled_at', { ascending: true }),
      supabase.from('post_metrics').select('*').order('captured_at', { ascending: false }),
      supabase.from('member_metrics').select('*').order('captured_on', { ascending: false }),
    ]);
    const err = m.error || p.error || pm.error || mm.error;
    setState({ loading: false, error: err ? err.message : null, members: m.data || [], posts: p.data || [], metrics: pm.data || [], memberMetrics: mm.data || [] });
  }, []);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    load().then(() => { if (!alive) return; });
    const map = { team_members: 'members', posts: 'posts', post_metrics: 'metrics', member_metrics: 'memberMetrics' };
    const ch = supabase.channel('team-live');
    for (const table of Object.keys(map)) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
        const k = map[table];
        setState(s => {
          let arr = s[k];
          if (payload.eventType === 'DELETE') arr = arr.filter(x => x.id !== payload.old.id);
          else {
            const row = payload.new;
            const i = arr.findIndex(x => x.id === row.id);
            // gli UPDATE in tempo reale non riportano i campi lunghi rimasti uguali (es. testo_generato): li tengo da quelli già caricati
            arr = i >= 0 ? arr.map(x => (x.id === row.id ? { ...x, ...row } : x)) : [...arr, row];
          }
          return { ...s, [k]: arr };
        });
      });
    }
    ch.subscribe(st => setOnline(st === 'SUBSCRIBED'));
    chRef.current = ch;
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [session, load]);

  // Applica subito in locale una riga salvata (l'evento realtime arriva comunque)
  const applica = useCallback((table, row) => {
    const k = { team_members: 'members', posts: 'posts', post_metrics: 'metrics', member_metrics: 'memberMetrics' }[table];
    setState(s => {
      const arr = s[k];
      const i = arr.findIndex(x => x.id === row.id);
      return { ...s, [k]: i >= 0 ? arr.map(x => (x.id === row.id ? row : x)) : [...arr, row] };
    });
  }, []);
  const rimuovi = useCallback((table, id) => {
    const k = { team_members: 'members', posts: 'posts', post_metrics: 'metrics', member_metrics: 'memberMetrics' }[table];
    setState(s => ({ ...s, [k]: s[k].filter(x => x.id !== id) }));
  }, []);

  return { ...state, online, reload: load, applica, rimuovi };
}
