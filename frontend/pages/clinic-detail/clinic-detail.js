const { request } = require('../../utils/api');
const { ensureLogin } = require('../../utils/auth');
const { formatDistance } = require('../../utils/util');

const TAG_GROUPS = [
  { key: 'trust', title: '信任印象', badgeClass: 'tag-group__badge--trust' },
  { key: 'value', title: '性价比印象', badgeClass: 'tag-group__badge--value' },
  {
    key: 'experience',
    title: '体验印象',
    badgeClass: 'tag-group__badge--experience',
  },
  { key: 'social', title: '大家常提到', badgeClass: 'tag-group__badge--social' },
];

const CAPABILITY_GROUPS = [
  { key: 'services', title: '服务项目' },
  { key: 'specialties', title: '擅长领域' },
  { key: 'equipment', title: '诊断设备' },
  { key: 'facilities', title: '设施能力' },
  { key: 'speciesSupported', title: '接诊类型' },
];

function formatScore(score) {
  return Number(score || 0).toFixed(1);
}

function buildTagGroups(tags) {
  return TAG_GROUPS.map((group) => ({
    ...group,
    items: Array.isArray(tags[group.key]) ? tags[group.key] : [],
  })).filter((group) => group.items.length > 0);
}

function buildClinicViewModel(clinic) {
  const tags = clinic.tags || {};
  const capabilities = clinic.capabilities || {};

  return {
    ...clinic,
    distanceText:
      typeof clinic.distance === 'number' ? formatDistance(clinic.distance) : '距离待获取',
    locationText: [clinic.city, clinic.district].filter(Boolean).join(' · ') || '城市信息待补充',
    scoreCards: [
      {
        key: 'reputation',
        label: '综合口碑',
        value: formatScore(clinic.scores && clinic.scores.reputation),
        accentClass: 'score-card__value--high',
      },
      {
        key: 'price',
        label: '性价比',
        value: formatScore(clinic.scores && clinic.scores.price),
        accentClass: '',
      },
      {
        key: 'confidenceFactor',
        label: '信息可靠性',
        value: `${Math.round(Number((clinic.scores && clinic.scores.confidenceFactor) || 0) * 100)}%`,
        accentClass: '',
      },
    ],
    tagGroups: buildTagGroups(tags),
    capabilityGroups: CAPABILITY_GROUPS.map((group) => ({
      ...group,
      items: Array.isArray(capabilities[group.key]) ? capabilities[group.key] : [],
    })).filter((group) => group.items.length > 0),
    capabilityHighlights: Array.isArray(capabilities.highlights)
      ? capabilities.highlights
      : [],
  };
}

function buildRecommendClinicUrl(params = {}) {
  const query = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${key}=${encodeURIComponent(String(params[key]))}`)
    .join('&');

  return `/pages/recommend-clinic/recommend-clinic${query ? `?${query}` : ''}`;
}

function buildClaimClinicUrl(params = {}) {
  const query = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${key}=${encodeURIComponent(String(params[key]))}`)
    .join('&');

  return `/pages/claim-clinic/claim-clinic${query ? `?${query}` : ''}`;
}

Page({
  data: {
    clinic: null,
    loading: true,
    clinicId: null,
    actionLoadingType: '',
  },

  onLoad(options) {
    const clinicId = Number(options.id);

    if (!clinicId) {
      this.setData({
        loading: false,
      });
      wx.showToast({
        title: '缺少诊所 ID',
        icon: 'none',
      });
      return;
    }

    this.setData({
      clinicId,
    });

    this.detailQuery = {
      lat: options.lat ? Number(options.lat) : null,
      lng: options.lng ? Number(options.lng) : null,
    };
    this.fetchClinicDetail();
  },

  async fetchClinicDetail() {
    if (!this.data.clinicId) {
      return;
    }

    this.setData({
      loading: true,
    });

    try {
      const clinic = await request({
        url: `/clinics/${this.data.clinicId}`,
        method: 'GET',
        data: {
          ...(typeof this.detailQuery.lat === 'number' ? { lat: this.detailQuery.lat } : {}),
          ...(typeof this.detailQuery.lng === 'number' ? { lng: this.detailQuery.lng } : {}),
        },
      });

      const viewModel = buildClinicViewModel(clinic);

      this.setData({
        clinic: viewModel,
      });

      wx.setNavigationBarTitle({
        title: viewModel.name,
      });
    } catch (error) {
      this.setData({
        clinic: null,
      });
      wx.showToast({
        title: error.message || '加载详情失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  async createOrder(contactType) {
    if (!this.data.clinicId) {
      throw new Error('缺少诊所 ID');
    }

    await ensureLogin();

    return request({
      url: '/orders',
      method: 'POST',
      data: {
        clinicId: this.data.clinicId,
        contactType,
      },
    });
  },

  async makePhoneCall() {
    if (!this.data.clinic || !this.data.clinic.phone) {
      wx.showToast({
        title: '暂无联系电话',
        icon: 'none',
      });
      return;
    }

    if (this.data.actionLoadingType) {
      return;
    }

    this.setData({
      actionLoadingType: 'phone',
    });

    try {
      const order = await this.createOrder('phone');

      await new Promise((resolve, reject) => {
        wx.makePhoneCall({
          phoneNumber: order.contactInfo,
          success: resolve,
          fail: reject,
        });
      });
    } catch (error) {
      if (error && error.errMsg && error.errMsg.includes('cancel')) {
        this.setData({
          actionLoadingType: '',
        });
        return;
      }

      wx.showToast({
        title: error.message || '预约失败，请稍后重试',
        icon: 'none',
      });
    } finally {
      this.setData({
        actionLoadingType: '',
      });
    }
  },

  async copyWechat() {
    if (!this.data.clinic || !this.data.clinic.wechat) {
      wx.showToast({
        title: '暂无微信号',
        icon: 'none',
      });
      return;
    }

    if (this.data.actionLoadingType) {
      return;
    }

    this.setData({
      actionLoadingType: 'wechat',
    });

    try {
      const order = await this.createOrder('wechat');

      await new Promise((resolve, reject) => {
        wx.setClipboardData({
          data: order.contactInfo,
          success: resolve,
          fail: reject,
        });
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '预约失败，请稍后重试',
        icon: 'none',
      });
    } finally {
      this.setData({
        actionLoadingType: '',
      });
    }
  },

  goToTagSelection() {
    if (!this.data.clinicId || !this.data.clinic) {
      return;
    }

    const clinicName = encodeURIComponent(this.data.clinic.name || '');

    wx.navigateTo({
      url: `/pages/tag-selection/tag-selection?clinicId=${this.data.clinicId}&clinicName=${clinicName}&source=normal`,
    });
  },

  openRecommendClinic() {
    if (!this.data.clinic) {
      return;
    }

    wx.navigateTo({
      url: buildRecommendClinicUrl({
        source: 'clinic-detail',
        clinicId: this.data.clinicId,
        name: this.data.clinic.name,
        address: this.data.clinic.address,
        city: this.data.clinic.city,
        district: this.data.clinic.district,
        phone: this.data.clinic.phone,
        businessHours: this.data.clinic.businessHours,
      }),
    });
  },

  openClaimClinic() {
    if (!this.data.clinic || this.data.clinic.isClaimed) {
      return;
    }

    wx.navigateTo({
      url: buildClaimClinicUrl({
        clinicId: this.data.clinicId,
        name: this.data.clinic.name,
        address: this.data.clinic.address,
        city: this.data.clinic.city,
        district: this.data.clinic.district,
        phone: this.data.clinic.phone,
      }),
    });
  },
});
