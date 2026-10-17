const { expo } = require('./app.json');

module.exports = {
  ...expo,
  android: {
    ...expo.android,
    usesCleartextTraffic: true,
  },
};
