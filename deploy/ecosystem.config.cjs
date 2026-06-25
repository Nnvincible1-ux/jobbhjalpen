// CV-piloten – PM2-konfiguration
// Håller Node-processen igång och startar om den automatiskt vid omstart av servern.
// Starta: pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: "cvpiloten",
      script: "dist/index.js",
      cwd: __dirname + "/..",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      // .env läses av appen själv (dotenv). PM2 behöver inte injicera den.
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
