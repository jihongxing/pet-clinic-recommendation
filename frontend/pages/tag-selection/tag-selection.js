const { request } = require('../../utils/api');
const { ensureLogin } = require('../../utils/auth');

const DEVICE_ID_STORAGE_KEY = 'review_device_id';

const EMOTIONS = [
  {
    label: '很满意',
    value: 'satisfied',
    icon: '👍',
    description: '这次体验超出预期',
  },
  {
    label: '一般',
    value: 'neutral',
    icon: '😐',
    description: '整体还行，但有提升空间',
  },
  {
    label: '不满意',
    value: 'unsatisfied',
    icon: '👎',
    description: '这次体验没有达到预期',
  },
];

const DEFAULT_LIMITS = {
  minSelect: 1,
  maxSelect: 3,
  maxExtra: 2,
};

const REVIEW_TEXT_LIMIT = 500;

function decodeQueryValue(value) {
  if (!value) {
    return '';
  }

  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function getOrCreateDeviceId() {
  const cachedDeviceId = wx.getStorageSync(DEVICE_ID_STORAGE_KEY);

  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const nextDeviceId = `mini-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  wx.setStorageSync(DEVICE_ID_STORAGE_KEY, nextDeviceId);

  return nextDeviceId;
}

function markOptionsSelected(options, selectedIds) {
  return (Array.isArray(options) ? options : []).map((option) => ({
    ...option,
    selected: selectedIds.includes(option.id),
  }));
}

Page({
  data: {
    clinicId: null,
    clinicName: '',
    source: 'normal',
    emotions: EMOTIONS,
    step: 1,
    emotion: '',
    title: '',
    reasonOptions: [],
    selectedReasonOptions: [],
    extraOptions: [],
    selectedTagIds: [],
    selectedExtraTagIds: [],
    reviewText: '',
    reviewTextLimit: REVIEW_TEXT_LIMIT,
    limits: DEFAULT_LIMITS,
    configLoading: false,
    submitting: false,
  },

  async onLoad(options) {
    const clinicId = Number(options.clinicId || options.id);
    const source = options.source === 'order' ? 'order' : 'normal';
    const clinicName = decodeQueryValue(options.clinicName);

    if (!clinicId) {
      wx.showToast({
        title: '缺少诊所 ID',
        icon: 'none',
      });
      return;
    }

    this.setData({
      clinicId,
      clinicName,
      source,
    });

    if (clinicName) {
      wx.setNavigationBarTitle({
        title: `评价${clinicName}`,
      });
    }

    try {
      await ensureLogin();
    } catch (error) {
      wx.showToast({
        title: error.message || '登录失败，请稍后重试',
        icon: 'none',
      });
    }
  },

  async chooseEmotion(event) {
    const emotion = event.currentTarget.dataset.value;

    if (!emotion || this.data.configLoading || this.data.submitting) {
      return;
    }

    await this.loadSelectionConfig(emotion);
  },

  async loadSelectionConfig(emotion) {
    this.setData({
      configLoading: true,
      step: 2,
      emotion,
      title: '',
      reasonOptions: [],
      selectedReasonOptions: [],
      extraOptions: [],
      selectedTagIds: [],
      selectedExtraTagIds: [],
      reviewText: '',
    });

    try {
      const config = await request({
        url: '/tags/selection-config',
        method: 'GET',
        data: {
          emotion,
        },
      });

      this.setData({
        title: config.title || '请选择原因',
        reasonOptions: markOptionsSelected(config.tags, []),
        selectedReasonOptions: [],
        extraOptions: markOptionsSelected(config.extraTags, []),
        limits: {
          ...DEFAULT_LIMITS,
          ...(config.limits || {}),
        },
      });
    } catch (error) {
      this.setData({
        step: 1,
        emotion: '',
        title: '',
        selectedReasonOptions: [],
      });
      wx.showToast({
        title: error.message || '加载标签配置失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        configLoading: false,
      });
    }
  },

  toggleReason(event) {
    const tagId = Number(event.currentTarget.dataset.id);

    if (!tagId || this.data.submitting) {
      return;
    }

    const selectedTagIds = [...this.data.selectedTagIds];
    const tagIndex = selectedTagIds.indexOf(tagId);

    if (tagIndex >= 0) {
      selectedTagIds.splice(tagIndex, 1);
    } else {
      if (selectedTagIds.length >= this.data.limits.maxSelect) {
        wx.showToast({
          title: `最多选择${this.data.limits.maxSelect}个原因`,
          icon: 'none',
        });
        return;
      }

      selectedTagIds.push(tagId);
    }

    this.setData({
      selectedTagIds,
      reasonOptions: markOptionsSelected(this.data.reasonOptions, selectedTagIds),
      selectedReasonOptions: this.data.reasonOptions.filter((option) =>
        selectedTagIds.includes(option.id),
      ),
    });
  },

  continueToExtras() {
    if (this.data.selectedTagIds.length < this.data.limits.minSelect) {
      wx.showToast({
        title: `请至少选择${this.data.limits.minSelect}个原因`,
        icon: 'none',
      });
      return;
    }

    this.setData({
      step: 3,
    });
  },

  backToEmotion() {
    if (this.data.submitting) {
      return;
    }

    this.setData({
      step: 1,
    });
  },

  backToReasons() {
    if (this.data.submitting) {
      return;
    }

    this.setData({
      step: 2,
    });
  },

  toggleExtra(event) {
    const tagId = Number(event.currentTarget.dataset.id);

    if (!tagId || this.data.submitting) {
      return;
    }

    const selectedExtraTagIds = [...this.data.selectedExtraTagIds];
    const tagIndex = selectedExtraTagIds.indexOf(tagId);

    if (tagIndex >= 0) {
      selectedExtraTagIds.splice(tagIndex, 1);
    } else {
      if (selectedExtraTagIds.length >= this.data.limits.maxExtra) {
        wx.showToast({
          title: `最多补充${this.data.limits.maxExtra}个标签`,
          icon: 'none',
        });
        return;
      }

      selectedExtraTagIds.push(tagId);
    }

    this.setData({
      selectedExtraTagIds,
      extraOptions: markOptionsSelected(
        this.data.extraOptions,
        selectedExtraTagIds,
      ),
    });
  },

  handleReviewTextInput(event) {
    const nextValue =
      typeof event.detail.value === 'string' ? event.detail.value : '';

    this.setData({
      reviewText: nextValue.slice(0, REVIEW_TEXT_LIMIT),
    });
  },

  async submitReview() {
    if (this.data.submitting) {
      return;
    }

    if (this.data.selectedTagIds.length < this.data.limits.minSelect) {
      wx.showToast({
        title: `请至少选择${this.data.limits.minSelect}个原因`,
        icon: 'none',
      });
      return;
    }

    this.setData({
      submitting: true,
    });

    try {
      await ensureLogin();
      await request({
        url: '/tags/submit',
        method: 'POST',
        header: {
          'x-device-id': getOrCreateDeviceId(),
        },
        data: {
          clinicId: this.data.clinicId,
          emotion: this.data.emotion,
          tagIds: this.data.selectedTagIds,
          extraTagIds: this.data.selectedExtraTagIds,
          source: this.data.source,
          reviewText: this.data.reviewText.trim(),
        },
      });

      wx.showToast({
        title: '感谢您的反馈！',
        icon: 'success',
      });
      wx.navigateBack({
        fail: () => {
          wx.switchTab({
            url: '/pages/profile/profile',
          });
        },
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '提交失败，请稍后再试',
        icon: 'none',
      });
    } finally {
      this.setData({
        submitting: false,
      });
    }
  },
});
