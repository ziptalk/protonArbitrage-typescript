module.exports = {
  apps: [
    {
      name: "newArbitrage",
      script: "npm",
      args: "run start:new",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};