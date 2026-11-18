const app = require('./app.json');

module.exports = () => {
  const production = String(process.env.EXPO_PUBLIC_APP_ENV || '').toLowerCase() === 'production';
  const expo = app.expo;
  return {
    expo: {
      ...expo,
      android: {
        ...expo.android,
        usesCleartextTraffic: !production,
      },
      ios: {
        ...expo.ios,
        infoPlist: {
          ...expo.ios.infoPlist,
          NSAppTransportSecurity: production
            ? { NSAllowsArbitraryLoads: false, NSAllowsLocalNetworking: false }
            : expo.ios.infoPlist.NSAppTransportSecurity,
        },
      },
    },
  };
};
