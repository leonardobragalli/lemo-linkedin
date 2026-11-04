import { useState } from 'react';
import { supabase, DOMINIO } from '../supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [stato, setStato] = useState(null);
  const [busy, setBusy] = useState(false);

  async function invia(e) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em.endsWith(DOMINIO)) { setStato({ err: `Serve la mail aziendale ${DOMINIO}` }); return; }
    setBusy(true); setStato(null);
    const { error } = await supabase.auth.signInWithOtp({ email: em, options: { emailRedirectTo: location.origin + import.meta.env.BASE_URL, shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      const msg = /database error|non autorizzata/i.test(error.message)
        ? 'Questa email non è ancora nel team: chiedi a Leonardo di aggiungerla.'
        : /rate limit|too many/i.test(error.message) ? 'Troppe richieste: riprova tra qualche minuto.' : error.message;
      setStato({ err: msg });
    } else setStato({ ok: `Ti ho mandato un link d'accesso a ${em}. Aprilo da questo browser.` });
  }

  return (
    <div className="login">
      <form className="card" onSubmit={invia}>
        <div className="big">🍋</div>
        <h1>Regia LinkedIn</h1>
        <p className="muted">Lemons in the Room · accesso riservato al team</p>
        <input type="email" placeholder={`nome${DOMINIO}`} value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
        <button className="btn" disabled={busy}>{busy ? 'Invio…' : 'Mandami il link di accesso'}</button>
        {stato?.err && <p className="err">{stato.err}</p>}
        {stato?.ok && <p className="okmsg">{stato.ok}</p>}
      </form>
    </div>
  );
}
