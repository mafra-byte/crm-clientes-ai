module.exports = {
  apps: [
    {
      name: "protheus",
      cwd: "/var/www/protheus",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010 -H 127.0.0.1",
      env: {
        NODE_ENV: "production",
        PORT: "3010",
        APP_URL: "https://protheus.ccskf.net",
      },
    },
  ],
};
