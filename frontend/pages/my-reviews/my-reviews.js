const { request } = require('../../utils/api');
const { ensureLogin } = require('../../utils/auth');

const EMOTION_META = {
  satisfied: {
    label: '很满意',
    badgeClass: 'review-card__emotion--satisfied',
  },
  neutral: {
    label: '一般',
    badgeClass: 'review-card__emotion--neutral',
  },
  unsatisfied: {
    label: '不满意',
    badgeClass: 'review-card__emotion--unsatisfied',
  },
};

function formatSubmittedAt(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '提交时间未知';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function buildReviewViewModel(review) {
  const emotionMeta = EMOTION_META[review.emotion] || {
    label: review.emotion,
    badgeClass: '',
  };

  return {
    ...review,
    submittedAtText: formatSubmittedAt(review.submittedAt),
    emotionLabel: emotionMeta.label,
    emotionBadgeClass: emotionMeta.badgeClass,
    tags: Array.isArray(review.tags) ? review.tags : [],
    extraTags: Array.isArray(review.extraTags) ? review.extraTags : [],
    reviewText: review.reviewText || '',
  };
}

Page({
  data: {
    reviews: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: true,
    refreshing: false,
  },

  onShow() {
    this.fetchReviews({ reset: true });
  },

  async onPullDownRefresh() {
    await this.fetchReviews({ reset: true, refresh: true });
    wx.stopPullDownRefresh();
  },

  async fetchReviews(options = {}) {
    const { reset = false, refresh = false } = options;

    if (this.data.loading && !refresh) {
      return;
    }

    const page = reset ? 1 : this.data.page;

    this.setData({
      loading: !refresh,
      refreshing: refresh,
    });

    try {
      await ensureLogin();
      const response = await request({
        url: '/tags/my',
        method: 'GET',
        data: {
          page,
          pageSize: this.data.pageSize,
        },
      });

      this.setData({
        reviews: (response.list || []).map(buildReviewViewModel),
        total: response.total || 0,
        page: response.page || page,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载评价失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
        refreshing: false,
      });
    }
  },

  goToClinicDetail(event) {
    const clinicId = Number(event.currentTarget.dataset.clinicId);

    if (!clinicId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/clinic-detail/clinic-detail?id=${clinicId}`,
    });
  },
});
