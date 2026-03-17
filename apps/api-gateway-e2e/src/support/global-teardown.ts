import { killPort } from '@nx/node/utils';

module.exports = async function () {
  // Put clean up logic here (e.g. stopping services, docker-compose, etc.).
  // Hint: `globalThis` is shared between setup and teardown.
  const port = process.env.API_GETWAY_PORT ? Number(process.env.API_GETWAY_PORT) : 8080;
  await killPort(port);
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
