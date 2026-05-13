const { ensureLogin } = require('../../utils/auth');
const { request } = require('../../utils/api');

const STATUS_META = {
  pending: { label: '处理中', badgeClass: 'detail-status--pending' },
  approved: { label: '已通过', badgeClass: 'detail-status--success' },
  rejected: { label: '未通过', badgeClass: 'detail-status--rejected' },
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

function buildLocationText(detail) {
  return [detail.clinicCity, detail.clinicDistrict, detail.clinicAddress]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ');
}

function buildDetailViewModel(detail) {
  const statusMeta = STATUS_META[detail.status] || {
    label: detail.status,
    badgeClass: '',
  };

  return {
    ...detail,
    statusLabel: statusMeta.label,
    statusBadgeClass: statusMeta.badgeClass,
    locationText: buildLocationText(detail) || '地址待补充',
    createdAtText: formatDateTime(detail.createdAt),
    reviewedAtText: detail.reviewedAt ? formatDateTime(detail.reviewedAt) : '处理中',
  };
}

Page({
  data: {
    id: null,
    detail: null,
    loading: true,
  },

  onLoad(options) {
    const id = Number(options.id);

    if (!id) {
      wx.showToast({
        title: '缺少申请 ID',
        icon: 'none',
      });
      return;
    }

    this.setData({
      id,
    });
  },

  onShow() {
    if (this.data.id) {
      this.fetchDetail();
    }
  },

  async fetchDetail() {
    this.setData({
      loading: true,
    });

    try {
      await ensureLogin();
      const detail = await request({
        url: `/clinic-claim-requests/${this.data.id}`,
        method: 'GET',
      });

      this.setData({
        detail: buildDetailViewModel(detail),
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载认领详情失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },
});
