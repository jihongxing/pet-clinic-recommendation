const { clearLoginSession } = require('./auth');

function getAppBaseUrl() {
  const app = getApp();
  return app.globalData.apiBaseUrl;
}

function isLocalApiBaseUrl(url) {
  return typeof url === 'string' && /https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url);
}

function normalizeRequestFailure(err) {
  const baseUrl = getAppBaseUrl();
  const message = err && err.errMsg ? String(err.errMsg) : '';

  if (
    isLocalApiBaseUrl(baseUrl) &&
    (message.includes('ERR_CONNECTION_REFUSED') ||
      message.includes('timeout') ||
      message.includes('request:fail'))
  ) {
    const error = new Error(`无法连接本地后端，请确认 ${baseUrl} 已启动`);
    error.originalError = err;
    return error;
  }

  const error = new Error(message || '网络异常，请稍后重试');
  error.originalError = err;
  return error;
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
      fail: (err) => reject(normalizeRequestFailure(err)),
    });
  });
}

function parseUploadResponseData(rawData) {
  if (typeof rawData === 'string') {
    try {
      return JSON.parse(rawData);
    } catch (error) {
      return {
        message: '上传响应解析失败',
      };
    }
  }

  if (rawData && typeof rawData === 'object') {
    return rawData;
  }

  return {
    data: rawData,
  };
}

function uploadFile(options) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');

    wx.uploadFile({
      ...options,
      url: `${getAppBaseUrl()}${options.url}`,
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success: (res) => {
        const normalizedResponse = {
          ...res,
          data: parseUploadResponseData(res.data),
        };

        try {
          const data = normalizeResponse(normalizedResponse);
          resolve(data);
        } catch (error) {
          if (res.statusCode === 401) {
            clearLoginSession();
          }

          reject(error);
        }
      },
      fail: (error) => reject(normalizeRequestFailure(error)),
    });
  });
}

module.exports = {
  request,
  uploadFile,
};
