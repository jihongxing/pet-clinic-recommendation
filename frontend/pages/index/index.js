const { request } = require('../../utils/api');
const { formatDistance } = require('../../utils/util');

const DEFAULT_LOCATION = {
  lat: 39.9219,
  lng: 116.4436,
  city: '北京',
  label: '北京·朝阳区',
  hint: '暂时先为你展示北京附近的诊所',
};

const RADIUS_OPTIONS = [
  { label: '3km', value: 3000 },
  { label: '10km', value: 10000 },
  { label: '20km', value: 20000 },
];

const CAPABILITY_FILTER_OPTIONS = [
  { key: 'all', label: '全部能力', request: {} },
  { key: 'cat', label: '猫专科', request: { specialtyCodes: ['sp_cat'] } },
  { key: 'emergency', label: '急诊能力', request: { serviceCodes: ['srv_emergency'] } },
  { key: 'ultrasound', label: '有B超', request: { equipmentCodes: ['eq_ultrasound'] } },
  { key: 'inpatient', label: '可住院', request: { facilityCodes: ['fc_inpatient'] } },
];

function isBeijingCoordinate(lat, lng) {
  return lat >= 39 && lat <= 41 && lng >= 115.7 && lng <= 117.4;
}

function formatScore(score) {
  return Number(score || 0).toFixed(1);
}

function normalizeFilterTags(layerTags) {
  const tags = Object.keys(layerTags || {}).reduce((accumulator, category) => {
    const categoryTags = Array.isArray(layerTags[category]) ? layerTags[category] : [];
    return accumulator.concat(categoryTags);
  }, []);

  return tags.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.id - right.id;
  });
}

function buildClinicViewModel(clinic, selectedTagId) {
  const normalizedSelectedTagId =
    selectedTagId === 'all' || selectedTagId === null ? null : Number(selectedTagId);

  return {
    ...clinic,
    distanceText: formatDistance(clinic.distance),
    reputationScoreText: formatScore(clinic.reputationScore),
    priceScoreText: formatScore(clinic.priceScore),
    confidenceText: `${Math.round(Number(clinic.confidenceFactor || 0) * 100)}%`,
    capabilityHighlights: Array.isArray(clinic.capabilityHighlights)
      ? clinic.capabilityHighlights
      : [],
    topTags: (clinic.topTags || []).map((tag) => ({
      ...tag,
      isActive:
        normalizedSelectedTagId !== null && Number(tag.id) === normalizedSelectedTagId,
    })),
  };
}

function buildRecommendClinicUrl(params = {}) {
  const query = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${key}=${encodeURIComponent(String(params[key]))}`)
    .join('&');

  return `/pages/recommend-clinic/recommend-clinic${query ? `?${query}` : ''}`;
}

Page({
  data: {
    cityLabel: DEFAULT_LOCATION.label,
    locationHint: DEFAULT_LOCATION.hint,
    sortType: 'reputation',
    radius: 3000,
    radiusOptions: RADIUS_OPTIONS,
    quickActions: [
      { title: '去搜索', page: '/pages/search/search' },
      { title: '看地图', page: '/pages/map/map' },
      { title: '个人中心', page: '/pages/profile/profile' },
    ],
    filterTags: [{ id: 'all', name: '全部' }],
    selectedTagId: 'all',
    capabilityFilterOptions: CAPABILITY_FILTER_OPTIONS,
    selectedCapabilityFilterKey: 'all',
    clinics: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    loadingMore: false,
    bootstrapping: true,
  },

  onLoad() {
    this.bootstrap();
  },

  onPullDownRefresh() {
    this.bootstrap({ refreshLocation: true });
  },

  async bootstrap(options = {}) {
    this.setData({
      bootstrapping: true,
    });

    try {
      if (options.refreshLocation || !this.locationState) {
        this.locationState = await this.resolveLocation();
      }

      this.setData({
        cityLabel: this.locationState.label,
        locationHint: this.locationState.hint,
      });

      await Promise.all([this.fetchFilterTags(), this.fetchClinics({ reset: true })]);
    } finally {
      this.setData({
        bootstrapping: false,
      });
      wx.stopPullDownRefresh();
    }
  },

  resolveLocation() {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          const lat = Number(res.latitude.toFixed(6));
          const lng = Number(res.longitude.toFixed(6));

          if (isBeijingCoordinate(lat, lng)) {
            resolve({
              lat,
              lng,
              city: '北京',
              label: '北京·当前位置',
              hint: '已按当前位置推荐附近诊所',
            });
            return;
          }

          resolve({
            ...DEFAULT_LOCATION,
            hint: '当前先展示北京范围内的诊所',
          });
        },
        fail: () => {
          resolve({
            ...DEFAULT_LOCATION,
            hint: '定位未开启，先为你展示北京附近的诊所',
          });
        },
      });
    });
  },

  async fetchFilterTags() {
    try {
      const response = await request({
        url: '/tags',
        method: 'GET',
        data: {
          layer: 'L1',
          userSelectable: true,
        },
      });
      const tags = normalizeFilterTags(response.L1 || {}).map((tag) => ({
        ...tag,
        id: String(tag.id),
      }));

      this.setData({
        filterTags: [{ id: 'all', name: '全部' }].concat(tags),
      });
    } catch (error) {
      this.setData({
        filterTags: [{ id: 'all', name: '全部' }],
      });
    }
  },

  async fetchClinics({ reset = false } = {}) {
    if (!this.locationState) {
      return;
    }

    if (reset) {
      this.setData({ loading: true });
    } else {
      if (this.data.loadingMore || this.data.clinics.length >= this.data.total) {
        return;
      }

      this.setData({ loadingMore: true });
    }

    const nextPage = reset ? 1 : this.data.page + 1;
    const selectedTagId =
      this.data.selectedTagId === 'all' ? null : Number(this.data.selectedTagId);
    const selectedCapabilityFilter =
      CAPABILITY_FILTER_OPTIONS.find(
        (item) => item.key === this.data.selectedCapabilityFilterKey,
      ) || CAPABILITY_FILTER_OPTIONS[0];

    try {
      const response = await request({
        url: '/clinics/nearby',
        method: 'GET',
        data: {
          lat: this.locationState.lat,
          lng: this.locationState.lng,
          city: this.locationState.city,
          radius: this.data.radius,
          sortType: this.data.sortType,
          page: nextPage,
          pageSize: this.data.pageSize,
          ...(selectedTagId ? { tagIds: String(selectedTagId) } : {}),
          ...(selectedCapabilityFilter.request.serviceCodes
            ? { serviceCodes: selectedCapabilityFilter.request.serviceCodes.join(',') }
            : {}),
          ...(selectedCapabilityFilter.request.specialtyCodes
            ? { specialtyCodes: selectedCapabilityFilter.request.specialtyCodes.join(',') }
            : {}),
          ...(selectedCapabilityFilter.request.equipmentCodes
            ? { equipmentCodes: selectedCapabilityFilter.request.equipmentCodes.join(',') }
            : {}),
          ...(selectedCapabilityFilter.request.facilityCodes
            ? { facilityCodes: selectedCapabilityFilter.request.facilityCodes.join(',') }
            : {}),
        },
      });

      const incomingClinics = (response.list || []).map((clinic) =>
        buildClinicViewModel(clinic, this.data.selectedTagId),
      );
      const clinics = reset
        ? incomingClinics
        : this.data.clinics.concat(incomingClinics);

      this.setData({
        clinics,
        page: response.page,
        total: response.total,
      });
    } catch (error) {
      if (reset) {
        this.setData({
          clinics: [],
          total: 0,
          page: 1,
        });
      }

      wx.showToast({
        title: error.message || '加载诊所失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
        loadingMore: false,
      });
    }
  },

  onSortChange(event) {
    const { type } = event.currentTarget.dataset;

    if (!type || type === this.data.sortType) {
      return;
    }

    this.setData({
      sortType: type,
    });
    this.fetchClinics({ reset: true });
  },

  onRadiusChange(event) {
    const { value } = event.currentTarget.dataset;

    if (!value || Number(value) === this.data.radius) {
      return;
    }

    this.setData({
      radius: Number(value),
    });
    this.fetchClinics({ reset: true });
  },

  onTagChange(event) {
    const { id } = event.currentTarget.dataset;

    if (id === undefined || id === this.data.selectedTagId) {
      return;
    }

    this.setData({
      selectedTagId: id,
    });
    this.fetchClinics({ reset: true });
  },

  onCapabilityFilterChange(event) {
    const { key } = event.currentTarget.dataset;

    if (!key || key === this.data.selectedCapabilityFilterKey) {
      return;
    }

    this.setData({
      selectedCapabilityFilterKey: key,
    });
    this.fetchClinics({ reset: true });
  },

  refreshHome() {
    this.bootstrap({ refreshLocation: true });
  },

  loadMore() {
    this.fetchClinics();
  },

  goToDetail(event) {
    const { id } = event.currentTarget.dataset;
    const locationQuery = this.locationState
      ? `&lat=${this.locationState.lat}&lng=${this.locationState.lng}`
      : '';

    wx.navigateTo({
      url: `/pages/clinic-detail/clinic-detail?id=${id}${locationQuery}`,
    });
  },

  goToPage(event) {
    const { page } = event.currentTarget.dataset;
    if (!page) {
      return;
    }

    wx.switchTab({
      url: page,
    });
  },

  openRecommendClinic() {
    wx.navigateTo({
      url: buildRecommendClinicUrl({
        source: 'index-empty',
        city: this.locationState ? this.locationState.city : DEFAULT_LOCATION.city,
      }),
    });
  },
});
