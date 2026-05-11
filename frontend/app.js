const { getRuntimeConfig } = require('./config/index');
const { loadLoginSession } = require('./utils/auth');

const runtimeConfig = getRuntimeConfig();

App({
  globalData: {
    apiBaseUrl: runtimeConfig.apiBaseUrl,
    envVersion: runtimeConfig.envVersion,
    user: null,
    token: '',
  },

  onLaunch() {
    loadLoginSession();
  },
});
