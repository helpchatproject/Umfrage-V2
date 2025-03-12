module.exports = {
  apps: [{
    name: 'typeform-webhook',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgres://typeform_user:9Gv$kW7!aQp&Zr2h@localhost:5432/typeform_webhook',
      PGUSER: 'typeform_user',
      PGHOST: 'localhost',
      PGDATABASE: 'typeform_webhook',
      PGPORT: 5432,
      PGPASSWORD: '9Gv$kW7!aQp&Zr2h',
      SESSION_SECRET: 'S0m3Sup3rS3cret!',
      TYPEFORM_ACCESS_TOKEN: process.env.TYPEFORM_ACCESS_TOKEN || 'your-typeform-api-token'
    }
  }]
};