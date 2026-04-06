import { z } from 'zod';

export const loginSchema = z.object({
  //! VULNERABLE — A03 : Validation trop permissive
  // z.string() accepte n'importe quelle valeur, y compris des charges SQL.
  // z.email() aurait rejeté "' OR '1'='1' --" avant la requête —
  // mais la validation du format ne remplace pas les requêtes paramétrées.
  email: z.string(),
  password: z.string().min(6),
});
