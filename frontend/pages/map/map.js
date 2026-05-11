const { request } = require('../../utils/api');
const { formatDistance } = require('../../utils/util');

const DEFAULT_LOCATION = {
  lat: 39.9219,
  lng: 116.4436,
  city: '北京',
  label: '北京·朝阳区',
  hint: '已使用北京开发坐标展示地图',
};

function isBeijingCoordinate(lat, lng) {
  return lat >= 39 && lat <= 41 && lng >= 115.7 && lng <= 117.4;
}

function formatScore(score) {
  return Number(score || 0).toFixed(1);
}

function buildMarker(clinic) {
  return {
    id: clinic.id,
    latitude: clinic.lat,
    longitude: clinic.lng,
    title: clinic.name,
    width: 28,
    height: 28,
    callout: {
      content: clinic.name,
      color: '#2f2925',
      fontSize: 12,
      borderRadius: 12,
      bgColor: '#fffdfb',
      padding: 8,
      display: 'BYCLICK',
      borderWidth: 1,
      borderColor: clinic.isClaimed ? '#2f8e63' : '#f0dfd4',
      textAlign: 'center',
    },
  };
}

function buildClinicViewModel(clinic) {
  return {
    ...clinic,
    distanceText: formatDistance(clinic.distance),
    reputationScoreText: formatScore(clinic.reputationScore),
    priceScoreText: formatScore(clinic.priceScore),
    confidenceText: `${Math.round(Number(clinic.confidenceFactor || 0) * 100)}%`,
  };
}

Page({
  data: {
    latitude: DEFAULT_LOCATION.lat,
    longitude: DEFAULT_LOCATION.lng,
    scale: 13,
    cityLabel: DEFAULT_LOCATION.label,
    locationHint: DEFAULT_LOCATION.hint,
    markers: [],
    clinics: [],
    selectedClinic: null,
    loading: true,
  },

  onLoad() {
    this.bootstrap();
  },

  onPullDownRefresh() {
    this.bootstrap({ refreshLocation: true });
  },

  async bootstrap(options = {}) {
    this.setData({
      loading: true,
    });

    try {
      if (options.refreshLocation || !this.locationState) {
        this.locationState = await this.resolveLocation();
      }

      this.setData({
        latitude: this.locationState.lat,
        longitude: this.locationState.lng,
        cityLabel: this.locationState.label,
        locationHint: this.locationState.hint,
      });

      await this.fetchNearbyClinics();
    } finally {
      this.setData({
        loading: false,
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
              hint: '已按当前位置展示附近诊所',
            });
            return;
          }

          resolve({
            ...DEFAULT_LOCATION,
            hint: '开发种子数据当前仅覆盖北京，已切换到北京默认坐标',
          });
        },
        fail: () => {
          resolve({
            ...DEFAULT_LOCATION,
            hint: '定位未开启，已使用北京默认坐标',
          });
        },
      });
    });
  },

  async fetchNearbyClinics() {
    try {
      const response = await request({
        url: '/clinics/nearby',
        method: 'GET',
        data: {
          lat: this.locationState.lat,
          lng: this.locationState.lng,
          city: this.locationState.city,
          radius: 10000,
          sortType: 'reputation',
          page: 1,
          pageSize: 30,
        },
      });

      const clinics = (response.list || []).map(buildClinicViewModel);
      const markers = clinics.map(buildMarker);

      this.setData({
        clinics,
        markers,
        selectedClinic: clinics[0] || null,
      });
    } catch (error) {
      this.setData({
        clinics: [],
        markers: [],
        selectedClinic: null,
      });
      wx.showToast({
        title: error.message || '加载地图失败',
        icon: 'none',
      });
    }
  },

  onMarkerTap(event) {
    const { markerId } = event.detail;
    const selectedClinic =
      this.data.clinics.find((clinic) => clinic.id === markerId) || null;

    this.setData({
      selectedClinic,
    });
  },

  refreshMap() {
    this.bootstrap({ refreshLocation: true });
  },

  goToDetail() {
    if (!this.data.selectedClinic) {
      return;
    }

    wx.navigateTo({
      url:
        `/pages/clinic-detail/clinic-detail?id=${this.data.selectedClinic.id}` +
        `&lat=${this.locationState.lat}&lng=${this.locationState.lng}`,
    });
  },
});
