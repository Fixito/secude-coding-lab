/**
 * Démonstration d'une attaque par force brute sur le endpoint POST /api/v1/auth/login.
 *
 * Usage : node brute-force-demo.mjs
 *
 * Prérequis : le serveur starter doit tourner sur http://localhost:5000
 */

const URL = 'http://localhost:5000/api/v1/auth/login';
const ATTEMPTS = 10;

console.log(`Envoi de ${ATTEMPTS} tentatives de connexion vers ${URL}\n`);

for (let i = 1; i <= ATTEMPTS; i++) {
  const response = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@a.com', password: 'wrongpassword' }),
  });

  const label = response.status === 429 ? '← bloqué (rate limit)' : '';
  console.log(`Tentative ${String(i).padStart(2, ' ')} → HTTP ${response.status} ${label}`);
}
