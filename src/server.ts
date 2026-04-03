import { env } from './config/env.js';
import { app } from './app.js';

const PORT = env.PORT;
const HOSTNAME = env.HOSTNAME;

app.listen(PORT, HOSTNAME, () => {
  console.log(`Server is running on http://${HOSTNAME}:${PORT}/`);
});
