/**
 * Production process on sea0. SQLite is one-writer, so a single fork.
 * Secrets stay in .env (dotenv loads it from cwd). Do not put keys here.
 *
 * First time on the box:  pm2 start ecosystem.config.cjs && pm2 save
 * Later:                  pm2 startOrReload ecosystem.config.cjs --update-env
 */
module.exports = {
  apps: [
    {
      name: 'spellpath-api',
      cwd: '/home/angela/spellpath-extension',
      script: 'server.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
      },
    },
  ],
};
