/* global clearTimeout, setTimeout */
const { request } = require('../../utils/api');
const { formatDistance } = require('../../utils/util');

const SEARCH_HISTORY_KEY = 'clinicSearchHistories';
const SEARCH_HISTORY_LIMIT = 8;
const DEFAULT_LOCATION = {
  lat: 39.9219,
  lng: 116.4436,
  city: '北京',
  hint: '当前先展示北京范围内的搜索结果',
};

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

function buildSearchResultViewModel(clinic) {
  return {
    ...clinic,
    distanceText:
      typeof clinic.distance === 'number' ? formatDistance(clinic.distance) : '距离待获取',
    reputationScoreText: formatScore(clinic.reputationScore),
    priceScoreText: formatScore(clinic.priceScore),
    confidenceText: `${Math.round(Number(clinic.confidenceFactor || 0) * 100)}%`,
    capabilityHighlights: Array.isArray(clinic.capabilityHighlights)
      ? clinic.capabilityHighlights
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

Page({
  data: {
    keyword: '',
    histories: [],
    results: [],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: false,
    loadingMore: false,
    searchedKeyword: '',
    locationHint: DEFAULT_LOCATION.hint,
    capabilityFilterOptions: CAPABILITY_FILTER_OPTIONS,
    selectedCapabilityFilterKey: 'all',
  },

  onLoad() {
    this.loadHistories();
    this.resolveLocation().then((locationState) => {
      this.locationState = locationState;
      this.setData({
        locationHint: locationState.hint,
      });
    });
  },

  onUnload() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  },

  loadHistories() {
    const histories = wx.getStorageSync(SEARCH_HISTORY_KEY);

    this.setData({
      histories: Array.isArray(histories) ? histories : [],
    });
  },

  persistHistory(keyword) {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return;
    }

    const histories = [normalizedKeyword]
      .concat(this.data.histories.filter((item) => item !== normalizedKeyword))
      .slice(0, SEARCH_HISTORY_LIMIT);

    wx.setStorageSync(SEARCH_HISTORY_KEY, histories);
    this.setData({
      histories,
    });
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
              hint: '已按当前位置距离排序',
            });
            return;
          }

          resolve({
            ...DEFAULT_LOCATION,
            hint: '当前先展示北京范围内的搜索结果',
          });
        },
        fail: () => {
          resolve({
            ...DEFAULT_LOCATION,
            hint: '定位未开启，先为你展示北京范围内的结果',
          });
        },
      });
    });
  },

  onInput(event) {
    const keyword = event.detail.value;

    this.setData({
      keyword,
    });

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    if (!keyword.trim()) {
      this.setData({
        results: [],
        total: 0,
        page: 1,
        searchedKeyword: '',
      });
      return;
    }

    this.searchTimer = setTimeout(() => {
      this.searchClinics(keyword, { reset: true });
    }, 300);
  },

  onConfirm() {
    this.searchClinics(this.data.keyword, {
      reset: true,
      toastOnEmpty: true,
    });
  },

  async searchClinics(
    keyword,
    { reset = true, toastOnEmpty = false, fromHistory = false } = {},
  ) {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      if (toastOnEmpty) {
        wx.showToast({
          title: '请输入搜索关键词',
          icon: 'none',
        });
      }
      return;
    }

    if (reset) {
      this.setData({
        loading: true,
      });
    } else {
      if (this.data.loadingMore || this.data.results.length >= this.data.total) {
        return;
      }

      this.setData({
        loadingMore: true,
      });
    }

    const nextPage = reset ? 1 : this.data.page + 1;
    const selectedCapabilityFilter =
      CAPABILITY_FILTER_OPTIONS.find(
        (item) => item.key === this.data.selectedCapabilityFilterKey,
      ) || CAPABILITY_FILTER_OPTIONS[0];

    try {
      const response = await request({
        url: '/clinics/search',
        method: 'GET',
        data: {
          keyword: normalizedKeyword,
          city: this.locationState ? this.locationState.city : DEFAULT_LOCATION.city,
          lat: this.locationState ? this.locationState.lat : DEFAULT_LOCATION.lat,
          lng: this.locationState ? this.locationState.lng : DEFAULT_LOCATION.lng,
          page: nextPage,
          pageSize: this.data.pageSize,
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

      const incomingResults = (response.list || []).map(buildSearchResultViewModel);
      const results = reset
        ? incomingResults
        : this.data.results.concat(incomingResults);

      this.setData({
        keyword: normalizedKeyword,
        results,
        total: response.total,
        page: response.page,
        searchedKeyword: normalizedKeyword,
      });

      if (reset || fromHistory) {
        this.persistHistory(normalizedKeyword);
      }
    } catch (error) {
      if (reset) {
        this.setData({
          results: [],
          total: 0,
          page: 1,
          searchedKeyword: normalizedKeyword,
        });
      }

      wx.showToast({
        title: error.message || '搜索失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
        loadingMore: false,
      });
    }
  },

  onHistoryTap(event) {
    const { keyword } = event.currentTarget.dataset;

    if (!keyword) {
      return;
    }

    this.setData({
      keyword,
    });
    this.searchClinics(keyword, {
      reset: true,
      fromHistory: true,
    });
  },

  clearHistories() {
    wx.removeStorageSync(SEARCH_HISTORY_KEY);
    this.setData({
      histories: [],
    });
  },

  loadMore() {
    this.searchClinics(this.data.keyword || this.data.searchedKeyword, {
      reset: false,
    });
  },

  onCapabilityFilterChange(event) {
    const { key } = event.currentTarget.dataset;

    if (!key || key === this.data.selectedCapabilityFilterKey) {
      return;
    }

    this.setData({
      selectedCapabilityFilterKey: key,
    });

    if ((this.data.keyword || this.data.searchedKeyword).trim()) {
      this.searchClinics(this.data.keyword || this.data.searchedKeyword, {
        reset: true,
      });
    }
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

  openRecommendClinic() {
    wx.navigateTo({
      url: buildRecommendClinicUrl({
        source: 'search-empty',
        keyword: this.data.searchedKeyword || this.data.keyword,
        city: this.locationState ? this.locationState.city : DEFAULT_LOCATION.city,
      }),
    });
  },
});
