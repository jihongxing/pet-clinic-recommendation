const { clearLoginSession } = require('./auth');

function getAppBaseUrl() {
  const app = getApp();
  return app.globalData.apiBaseUrl;
}

function buildRequestError(message, res) {
  const error = new Error(message || '请求失败');
  error.response = res;
  error.statusCode = res.statusCode;
  error.code = res.data && typeof res.data.code === 'number' ? res.data.code : null;

  return error;
}

function normalizeResponse(res) {
  const responseBody =
    res.data && typeof res.data === 'object' ? res.data : { data: res.data };

  if (res.statusCode >= 200 && res.statusCode < 300) {
    if (typeof responseBody.code === 'number' && responseBody.code !== 0) {
      throw buildRequestError(responseBody.message, res);
    }

    return responseBody.data;
  }

  throw buildRequestError(responseBody.message, res);
}

function request(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');

    wx.request({
      ...options,
      url: `${getAppBaseUrl()}${options.url}`,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success: (res) => {
        try {
          const data = normalizeResponse(res);
          resolve(data);
        } catch (error) {
          if (res.statusCode === 401) {
            clearLoginSession();
          }

          reject(error);
        }
      },
      fail: (err) => reject(err),
    });
  });
}

module.exports = {
  request,
};
