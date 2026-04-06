import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

export function createTransferRouter() {
  const router = Router();

  router.post('/', (_req, res) => {
    //! VULNERABLE — A01 : CSRF (Cross-Site Request Forgery)
    // Sans vérification, n'importe quel site tiers peut soumettre ce formulaire
    // au nom d'un utilisateur authentifié. Un simple lien malveillant suffit :
    // <img src="http://bank.com/api/v1/transfers?to=attacker&amount=1000" />
    // console.log(req.cookies);

    return res.status(StatusCodes.OK).json({ data: { message: 'Transfer done.' } });
  });

  return router;
}

export const transferRouter = createTransferRouter();
