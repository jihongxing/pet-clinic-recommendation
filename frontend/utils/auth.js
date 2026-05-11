function getSafeApp() {
  try {
    return getApp();
  } catch (error) {
    return null;
  }
}

function syncGlobalSession(session) {
  const app = getSafeApp();

  if (!app || !app.globalData) {
    return;
  }

  app.globalData.token = session.token || '';
  app.globalData.user = session.user || null;
}

function getAppBaseUrl() {
  const app = getApp();
  return app.globalData.apiBaseUrl;
}

function saveLoginSession(token, user) {
  const session = {
    token: token || '',
    user: user || null,
  };

  wx.setStorageSync('token', session.token);
  wx.setStorageSync('user', session.user);
  syncGlobalSession(session);

  return session;
}

function getLoginSession() {
  return {
    token: wx.getStorageSync('token') || '',
    user: wx.getStorageSync('user') || null,
  };
}

function loadLoginSession() {
  const session = getLoginSession();
  syncGlobalSession(session);

  return session;
}

function clearLoginSession() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('user');
  syncGlobalSession({
    token: '',
    user: null,
  });
}

function loginByWechatCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          reject(new Error('未获取到微信登录 code'));
          return;
        }

        wx.request({
          url: `${getAppBaseUrl()}/auth/login`,
          method: 'POST',
          data: {
            code: loginRes.code,
          },
          header: {
            'Content-Type': 'application/json',
          },
          success: (res) => {
            const responseBody =
              res.data && typeof res.data === 'object' ? res.data : {};

            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(responseBody.message || '登录失败'));
              return;
            }

            const payload = responseBody.data;

            if (!payload || !payload.token) {
              reject(new Error('登录响应缺少 token'));
              return;
            }

            saveLoginSession(payload.token, payload.user || null);
            resolve(payload);
          },
          fail: (error) => reject(error),
        });
      },
      fail: () => reject(new Error('微信登录失败，请稍后重试')),
    });
  });
}

async function ensureLogin(force = false) {
  const session = getLoginSession();

  if (!force && session.token) {
    syncGlobalSession(session);
    return session;
  }

  return loginByWechatCode();
}

module.exports = {
  saveLoginSession,
  getLoginSession,
  loadLoginSession,
  clearLoginSession,
  loginByWechatCode,
  ensureLogin,
};
