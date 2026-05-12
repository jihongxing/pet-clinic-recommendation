const {
  clearLoginSession,
  ensureLogin,
  getLoginSession,
} = require('../../utils/auth');
const { request } = require('../../utils/api');

Page({
  data: {
    menus: [
      { key: 'reviews', label: '我的评价', page: '/pages/my-reviews/my-reviews' },
      {
        key: 'submissions',
        label: '我的推荐',
        page: '/pages/my-submissions/my-submissions',
      },
      {
        key: 'claims',
        label: '我的认领',
        page: '/pages/my-claim-requests/my-claim-requests',
      },
      {
        key: 'recommend',
        label: '推荐诊所',
        page: '/pages/recommend-clinic/recommend-clinic?source=profile',
      },
      { key: 'favorites', label: '我的收藏' },
      { key: 'orders', label: '我的预约' },
      { key: 'settings', label: '设置' },
    ],
    user: null,
    isLoggedIn: false,
    loading: false,
  },

  onShow() {
    this.syncSession();

    if (this.data.isLoggedIn) {
      this.fetchProfile();
    }
  },

  syncSession() {
    const session = getLoginSession();

    this.setData({
      user: session.user,
      isLoggedIn: Boolean(session.token),
    });
  },

  async handleLogin() {
    if (this.data.loading) {
      return;
    }

    this.setData({ loading: true });

    try {
      const payload = await ensureLogin();

      this.setData({
        user: payload.user || null,
        isLoggedIn: true,
      });

      await this.fetchProfile();
      wx.showToast({
        title: '登录成功',
        icon: 'success',
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async fetchProfile() {
    try {
      const profile = await request({
        url: '/user/profile',
        method: 'GET',
      });

      this.setData({
        user: profile,
        isLoggedIn: true,
      });
    } catch (error) {
      this.syncSession();
    }
  },

  handleLogout() {
    clearLoginSession();
    this.setData({
      user: null,
      isLoggedIn: false,
    });
    wx.showToast({
      title: '已退出登录',
      icon: 'none',
    });
  },

  async handleMenuTap(event) {
    const { key, page } = event.currentTarget.dataset;

    if (!key) {
      return;
    }

    if (page) {
      try {
        await ensureLogin();
        wx.navigateTo({
          url: page,
        });
      } catch (error) {
        wx.showToast({
          title: error.message || '登录失败',
          icon: 'none',
        });
      }

      return;
    }

    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },
});
