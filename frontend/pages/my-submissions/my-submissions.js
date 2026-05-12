const { request } = require('../../utils/api');
const { ensureLogin } = require('../../utils/auth');

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending_review', label: '待审核' },
  { value: 'need_info', label: '待补充' },
  { value: 'approved_new', label: '已收录' },
  { value: 'merged', label: '已合并' },
  { value: 'rejected', label: '未通过' },
];

const STATUS_META = {
  pending_review: {
    label: '待审核',
    badgeClass: 'submission-card__status--pending',
  },
  need_info: {
    label: '待补充',
    badgeClass: 'submission-card__status--warning',
  },
  approved_new: {
    label: '已收录',
    badgeClass: 'submission-card__status--success',
  },
  merged: {
    label: '已合并',
    badgeClass: 'submission-card__status--success',
  },
  rejected: {
    label: '未通过',
    badgeClass: 'submission-card__status--rejected',
  },
};

const SUBMISSION_TYPE_LABELS = {
  new: '新诊所推荐',
  supplement: '信息补充',
  correction: '信息纠错',
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

function buildLocationText(submission) {
  const parts = [submission.city, submission.district, submission.address]
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim());

  if (parts.length > 0) {
    return parts.join(' ');
  }

  if (submission.phone) {
    return `联系电话：${submission.phone}`;
  }

  return '暂未补充地址信息';
}

function buildSubmissionViewModel(submission) {
  const statusMeta = STATUS_META[submission.status] || {
    label: submission.status,
    badgeClass: '',
  };

  return {
    ...submission,
    submissionTypeLabel:
      SUBMISSION_TYPE_LABELS[submission.submissionType] || submission.submissionType,
    statusLabel: statusMeta.label,
    statusBadgeClass: statusMeta.badgeClass,
    createdAtText: formatSubmittedAt(submission.createdAt),
    locationText: buildLocationText(submission),
    reviewNoteText:
      submission.reviewNote && submission.reviewNote.trim()
        ? submission.reviewNote.trim()
        : '',
  };
}

Page({
  data: {
    statusOptions: STATUS_OPTIONS,
    activeStatus: '',
    submissions: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: true,
    refreshing: false,
  },

  onShow() {
    this.fetchSubmissions({ reset: true });
  },

  async onPullDownRefresh() {
    await this.fetchSubmissions({ reset: true, refresh: true });
    wx.stopPullDownRefresh();
  },

  onStatusChange(event) {
    const { value } = event.currentTarget.dataset;

    if (value === undefined || value === this.data.activeStatus) {
      return;
    }

    this.setData({
      activeStatus: value,
    });

    this.fetchSubmissions({ reset: true });
  },

  async fetchSubmissions(options = {}) {
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
        url: '/clinic-submissions/my',
        method: 'GET',
        data: {
          page,
          pageSize: this.data.pageSize,
          status: this.data.activeStatus || undefined,
        },
      });

      this.setData({
        submissions: (response.list || []).map(buildSubmissionViewModel),
        total: response.total || 0,
        page: response.page || page,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载推荐记录失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
        refreshing: false,
      });
    }
  },

  createSubmission() {
    wx.navigateTo({
      url: '/pages/recommend-clinic/recommend-clinic?source=profile',
    });
  },
});
