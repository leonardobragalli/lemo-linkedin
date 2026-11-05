import { useState } from 'react';
import { supabase, DOMINIO } from '../supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [stato, setStato] = useState(null);
  const [busy, setBusy] = useState(false);

  async function invia(e) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em.endsWith(DOMINIO)) { setStato({ err: `Usa la tua email aziendale ${DOMINIO}` }); return; }
    setBusy(true); setStato(null);
    const { error } = await supabase.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + import.meta.env.BASE_URL, shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      const msg = /database error|non autorizzata/i.test(error.message)
        ? 'Questa email non è ancora abilitata nel team: chiedi a Leonardo di inviare l\'invito da Impostazioni.'
        : /rate limit|too many/i.test(error.message) ? 'Troppe richieste ravvicinate: attendi qualche minuto e riprova.' : error.message;
      setStato({ err: msg });
    } else setStato({ ok: `Link d'accesso inviato a ${em}. Apri la mail da questo dispositivo per entrare.` });
  }

  return (
    <div className="login">
      <form className="card" onSubmit={invia}>
        <div className="big">🍋</div>
        <h1>Regia LinkedIn</h1>
        <p className="muted" style={{ margin: '0 0 4px', fontSize: 13 }}>Lemons in the room · Piattaforma Editoriale &amp; Telemetria Corale</p>
        <input type="email" placeholder={`nome${DOMINIO}`} value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
        <button className="btn orange" disabled={busy}>{busy ? 'Invio del link in corso…' : 'Ricevi il link di accesso via email'}</button>
        <span className="small muted">Accesso senza password riservato ai 10 profili del team</span>
        {stato?.err && <p className="err">{stato.err}</p>}
        {stato?.ok && <p className="okmsg">{stato.ok}</p>}
      </form>
    </div>
  );
}
