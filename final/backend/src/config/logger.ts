import pino from 'pino';

// Instance Pino partagée dans toute l'application.
//
// Pino est recommandé pour les applications Node.js en production :
//   - Très performant (logs asynchrones, sérialisation rapide)
//   - Sortie JSON structurée → facilement ingérable par un SIEM ou ELK Stack
//   - En développement : pino-pretty formate les logs de façon lisible dans le terminal
//
// Le transport pino-pretty est activé uniquement en développement.
// En production, les logs sont émis en JSON brut sur stdout.
export const logger = pino({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  ...(process.env['NODE_ENV'] !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});
