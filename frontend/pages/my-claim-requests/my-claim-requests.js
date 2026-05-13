const { ensureLogin } = require('../../utils/auth');
const { request } = require('../../utils/api');

const STATUS_META = {
  pending: {
    label: '处理中',
    badgeClass: 'claim-card__status--pending',
  },
  approved: {
    label: '已通过',
    badgeClass: 'claim-card__status--success',
  },
  rejected: {
    label: '未通过',
    badgeClass: 'claim-card__status--rejected',
  },
};

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '时间未知';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function buildLocationText(item) {
  return [item.clinicCity, item.clinicDistrict, item.clinicAddress]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ');
}

function buildClaimViewModel(item) {
  const statusMeta = STATUS_META[item.status] || {
    label: item.status,
    badgeClass: '',
  };

  return {
    ...item,
    statusLabel: statusMeta.label,
    statusBadgeClass: statusMeta.badgeClass,
    locationText: buildLocationText(item) || '地址待补充',
    createdAtText: formatDateTime(item.createdAt),
    reviewedAtText: item.reviewedAt ? formatDateTime(item.reviewedAt) : '',
    reviewNoteText: item.reviewNote && item.reviewNote.trim() ? item.reviewNote.trim() : '',
  };
}

Page({
  data: {
    claimRequests: [],
    total: 0,
    loading: true,
  },

  onShow() {
    this.fetchClaimRequests();
  },

  async onPullDownRefresh() {
    await this.fetchClaimRequests();
    wx.stopPullDownRefresh();
  },

  async fetchClaimRequests() {
    this.setData({
      loading: true,
    });

    try {
      await ensureLogin();
      const result = await request({
        url: '/clinic-claim-requests/my',
        method: 'GET',
      });

      this.setData({
        claimRequests: (result.list || []).map(buildClaimViewModel),
        total: result.total || 0,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载认领申请失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  openClaimDetail(event) {
    const { id } = event.currentTarget.dataset;

    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/claim-request-detail/claim-request-detail?id=${id}`,
    });
  },
});
