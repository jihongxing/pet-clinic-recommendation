function loadLocalRuntimeConfig() {
  try {
    return require('./local');
  } catch (error) {
    return {};
  }
}

function normalizeRuntimeSection(section) {
  if (!section || typeof section !== 'object') {
    return {};
  }

  return section;
}

const LOCAL_RUNTIME_CONFIG = loadLocalRuntimeConfig();

const RUNTIME_CONFIG = {
  develop: {
    apiBaseUrl: 'http://localhost:3000/api/v1',
    ...normalizeRuntimeSection(LOCAL_RUNTIME_CONFIG.develop || LOCAL_RUNTIME_CONFIG),
  },
  trial: {
    apiBaseUrl: 'https://api-staging.petmed.example.com/api/v1',
    ...normalizeRuntimeSection(LOCAL_RUNTIME_CONFIG.trial),
  },
  release: {
    apiBaseUrl: 'https://api.petmed.example.com/api/v1',
    ...normalizeRuntimeSection(LOCAL_RUNTIME_CONFIG.release),
  },
};

function getMiniProgramEnvVersion() {
  try {
    const accountInfo = wx.getAccountInfoSync();
    return accountInfo.miniProgram.envVersion || 'develop';
  } catch (error) {
    return 'develop';
  }
}

function getRuntimeConfig() {
  const envVersion = getMiniProgramEnvVersion();

  return {
    envVersion,
    ...(RUNTIME_CONFIG[envVersion] || RUNTIME_CONFIG.develop),
  };
}

module.exports = {
  RUNTIME_CONFIG,
  getRuntimeConfig,
};
