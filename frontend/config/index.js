const RUNTIME_CONFIG = {
  develop: {
    apiBaseUrl: 'http://localhost:3000/api/v1',
  },
  trial: {
    apiBaseUrl: 'https://api-staging.petmed.example.com/api/v1',
  },
  release: {
    apiBaseUrl: 'https://api.petmed.example.com/api/v1',
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
