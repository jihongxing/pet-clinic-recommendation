/* global getCurrentPages, setTimeout */
const { request, uploadFile } = require('../../utils/api');
const { ensureLogin } = require('../../utils/auth');
const { formatDistance } = require('../../utils/util');

const SOURCE_COPY = {
  'index-empty': {
    title: '推荐附近诊所',
    hint: '当前列表没有匹配结果，你可以先把这家诊所推荐进来。',
    badge: '从附近结果带来的信息',
  },
  'search-empty': {
    title: '推荐搜索结果外的诊所',
    hint: '如果你知道目标诊所，可以先把基本信息提交给我们。',
    badge: '从搜索结果带来的信息',
  },
  'clinic-detail': {
    title: '补充或纠正诊所信息',
    hint: '你可以补充电话、营业时间，或纠正当前不准确的信息。',
    badge: '从详情页带来的信息',
  },
  profile: {
    title: '推荐一家诊所',
    hint: '把你熟悉的诊所告诉我们，我们会尽快核实处理。',
    badge: '你已填写的信息',
  },
};

const SUBMISSION_TYPE_OPTIONS = [
  {
    value: 'new',
    label: '推荐新诊所',
    helper: '用于列表里没有这家诊所的情况。',
  },
  {
    value: 'supplement',
    label: '补充已有信息',
    helper: '补电话、营业时间、地址等缺失信息。',
  },
  {
    value: 'correction',
    label: '纠正错误信息',
    helper: '修正错误地址、电话或其他不准确信息。',
  },
];

const CAPABILITY_GROUP_CONFIG = [
  { key: 'services', title: '服务项目' },
  { key: 'specialties', title: '擅长领域' },
  { key: 'equipment', title: '设备能力' },
  { key: 'facilities', title: '设施能力' },
  { key: 'speciesSupported', title: '接诊宠物类型' },
];

function getDefaultSubmissionType(source) {
  if (source === 'clinic-detail') {
    return 'supplement';
  }

  return 'new';
}

function buildMatchCheckKey({ form, submissionType, clinicDraft }) {
  return JSON.stringify({
    submissionType,
    clinicId:
      clinicDraft && clinicDraft.clinicId && submissionType !== 'new'
        ? clinicDraft.clinicId
        : null,
    name: (form.name || '').trim(),
    address: (form.address || '').trim(),
    city: (form.city || '').trim(),
    district: (form.district || '').trim(),
    phone: (form.phone || '').trim(),
  });
}

function buildMatchViewModel(match) {
  const locationText = [match.city, match.district, match.address]
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .join(' · ');

  return {
    ...match,
    distanceText:
      typeof match.distance === 'number' ? formatDistance(match.distance) : '距离待获取',
    locationText: locationText || match.address || '地址待补充',
    reasonText: Array.isArray(match.matchReasons) ? match.matchReasons.join(' / ') : '',
  };
}

Page({
  data: {
    source: 'profile',
    sourceLabel: '你已填写的信息',
    pageTitle: '推荐一家诊所',
    pageHint: '把你熟悉的诊所告诉我们，我们会尽快核实处理。',
    submissionTypeOptions: SUBMISSION_TYPE_OPTIONS,
    submissionType: 'new',
    clinicDraft: null,
    form: {
      name: '',
      address: '',
      city: '',
      district: '',
      phone: '',
      businessHours: '',
      services: [],
      specialties: [],
      equipment: [],
      facilities: [],
      speciesSupported: [],
      capabilityNotes: '',
      reason: '',
      photos: [],
    },
    capabilityGroups: [],
    loadingCapabilities: false,
    checkingMatches: false,
    hasCheckedMatches: false,
    matchedClinics: [],
    lastMatchCheckKey: '',
    submitting: false,
    uploadingPhotos: false,
  },

  onLoad(options) {
    const source = options.source || 'profile';
    const sourceCopy = SOURCE_COPY[source] || SOURCE_COPY.profile;
    const clinicDraft = {
      clinicId: options.clinicId ? Number(options.clinicId) : null,
      name: options.name ? decodeURIComponent(options.name) : '',
      address: options.address ? decodeURIComponent(options.address) : '',
      city: options.city ? decodeURIComponent(options.city) : '',
      district: options.district ? decodeURIComponent(options.district) : '',
      phone: options.phone ? decodeURIComponent(options.phone) : '',
      businessHours: options.businessHours
        ? decodeURIComponent(options.businessHours)
        : '',
      keyword: options.keyword ? decodeURIComponent(options.keyword) : '',
    };
    const submissionType = getDefaultSubmissionType(source);

    this.setData({
      source,
      sourceLabel: sourceCopy.badge,
      pageTitle: sourceCopy.title,
      pageHint: sourceCopy.hint,
      submissionType,
      clinicDraft,
      form: {
        name: clinicDraft.name,
        address: clinicDraft.address,
        city: clinicDraft.city,
        district: clinicDraft.district,
        phone: clinicDraft.phone,
        businessHours: clinicDraft.businessHours,
        services: [],
        specialties: [],
        equipment: [],
        facilities: [],
        speciesSupported: [],
        capabilityNotes: '',
        reason:
          source === 'clinic-detail'
            ? '我想补充或纠正这家诊所的现有信息。'
            : '',
        photos: [],
      },
    });

    this.fetchCapabilityDefinitions();

    wx.setNavigationBarTitle({
      title: sourceCopy.title,
    });
  },

  async fetchCapabilityDefinitions() {
    this.setData({
      loadingCapabilities: true,
    });

    try {
      const response = await request({
        url: '/clinics/capability-definitions',
        method: 'GET',
      });

      this.capabilityDefinitions = response || {};
      this.syncCapabilityGroups();
    } catch (error) {
      wx.showToast({
        title: error.message || '加载可选服务信息失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loadingCapabilities: false,
      });
    }
  },

  onSubmissionTypeChange(event) {
    const { value } = event.currentTarget.dataset;

    if (!value || value === this.data.submissionType || this.data.submitting) {
      return;
    }

    this.setData({
      submissionType: value,
      hasCheckedMatches: false,
      matchedClinics: [],
      lastMatchCheckKey: '',
    });
  },

  onFieldInput(event) {
    const { field } = event.currentTarget.dataset;

    if (!field) {
      return;
    }

    this.setData({
      [`form.${field}`]: event.detail.value,
      hasCheckedMatches: false,
      matchedClinics: [],
      lastMatchCheckKey: '',
    });
  },

  onCapabilityToggle(event) {
    const { group, code } = event.currentTarget.dataset;

    if (!group || !code) {
      return;
    }

    const current = Array.isArray(this.data.form[group]) ? this.data.form[group] : [];
    const exists = current.includes(code);
    const next = exists
      ? current.filter((item) => item !== code)
      : current.concat(code);

    this.setData({
      [`form.${group}`]: next,
    });
    this.syncCapabilityGroups();
  },

  async choosePhotos() {
    if (this.data.uploadingPhotos || this.data.submitting) {
      return;
    }

    const remainCount = 3 - this.data.form.photos.length;

    if (remainCount <= 0) {
      wx.showToast({
        title: '最多上传 3 张图片',
        icon: 'none',
      });
      return;
    }

    try {
      const chooseResult = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: remainCount,
          mediaType: ['image'],
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        });
      });

      const tempFiles = Array.isArray(chooseResult.tempFiles)
        ? chooseResult.tempFiles
        : [];

      if (!tempFiles.length) {
        return;
      }

      await this.uploadSelectedPhotos(tempFiles);
    } catch (error) {
      if (error && typeof error.errMsg === 'string' && error.errMsg.includes('cancel')) {
        return;
      }

      wx.showToast({
        title: error.message || '选择图片失败',
        icon: 'none',
      });
    }
  },

  async uploadSelectedPhotos(tempFiles) {
    this.setData({
      uploadingPhotos: true,
    });

    wx.showLoading({
      title: '上传图片中',
      mask: true,
    });

    try {
      await ensureLogin();

      const uploadedPhotos = [];
      let failedCount = 0;

      for (const tempFile of tempFiles) {
        try {
          const uploadResult = await uploadFile({
            url: '/clinic-submissions/photos',
            filePath: tempFile.tempFilePath,
            name: 'file',
          });

          if (uploadResult && uploadResult.fileUrl) {
            uploadedPhotos.push(uploadResult.fileUrl);
          } else {
            failedCount += 1;
          }
        } catch (error) {
          failedCount += 1;
        }
      }

      if (uploadedPhotos.length > 0) {
        this.setData({
          'form.photos': this.data.form.photos.concat(uploadedPhotos),
        });
      }

      if (uploadedPhotos.length > 0 && failedCount === 0) {
        wx.showToast({
          title: `已上传 ${uploadedPhotos.length} 张`,
          icon: 'success',
        });
        return;
      }

      if (uploadedPhotos.length > 0) {
        wx.showToast({
          title: `成功 ${uploadedPhotos.length} 张，失败 ${failedCount} 张`,
          icon: 'none',
        });
        return;
      }

      wx.showToast({
        title: '图片上传失败，请重试',
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
      this.setData({
        uploadingPhotos: false,
      });
    }
  },

  previewPhoto(event) {
    const current = event.currentTarget.dataset.url;

    if (!current) {
      return;
    }

    wx.previewImage({
      current,
      urls: this.data.form.photos,
    });
  },

  removePhoto(event) {
    const { index } = event.currentTarget.dataset;

    if (index === undefined) {
      return;
    }

    const photos = this.data.form.photos.filter((_, photoIndex) => photoIndex !== index);
    this.setData({
      'form.photos': photos,
    });
  },

  validateForm() {
    const { form } = this.data;

    if (!form.name.trim()) {
      return '请填写诊所名称';
    }

    if (!form.reason.trim()) {
      return '请填写推荐或纠错说明';
    }

    return '';
  },

  buildPayload() {
    const { form, submissionType, clinicDraft } = this.data;

    const payload = {
      submissionType,
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      phone: form.phone.trim(),
      businessHours: form.businessHours.trim(),
      services: form.services,
      specialties: form.specialties,
      equipment: form.equipment,
      facilities: form.facilities,
      speciesSupported: form.speciesSupported,
      capabilityNotes: form.capabilityNotes.trim(),
      reason: form.reason.trim(),
      photos: form.photos,
    };

    if (clinicDraft.clinicId && submissionType !== 'new') {
      payload.clinicId = clinicDraft.clinicId;
    }

    return payload;
  },

  syncCapabilityGroups() {
    const groupedDefinitions = this.capabilityDefinitions || {};
    const capabilityGroups = CAPABILITY_GROUP_CONFIG.map((group) => {
      const options = Array.isArray(groupedDefinitions[group.key])
        ? groupedDefinitions[group.key]
        : [];
      const selectedCodes = new Set(this.data.form[group.key] || []);

      return {
        ...group,
        options: options.map((item) => ({
          ...item,
          selected: selectedCodes.has(item.code),
        })),
      };
    });

    this.setData({
      capabilityGroups,
    });
  },

  buildMatchQuery() {
    const { form } = this.data;

    return {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      phone: form.phone.trim(),
    };
  },

  shouldCheckMatches() {
    const { submissionType, clinicDraft } = this.data;

    return !(clinicDraft.clinicId && submissionType !== 'new');
  },

  async fetchSubmissionMatches() {
    if (this.data.checkingMatches) {
      return null;
    }

    const validationMessage = this.validateForm();

    if (validationMessage) {
      wx.showToast({
        title: validationMessage,
        icon: 'none',
      });
      return null;
    }

    this.setData({
      checkingMatches: true,
    });

    try {
      await ensureLogin();
      const response = await request({
        url: '/clinic-submissions/matches',
        method: 'GET',
        data: this.buildMatchQuery(),
      });
      const lastMatchCheckKey = buildMatchCheckKey(this.data);
      const matchedClinics = Array.isArray(response.matches)
        ? response.matches.map(buildMatchViewModel)
        : [];

      this.setData({
        hasCheckedMatches: true,
        matchedClinics,
        lastMatchCheckKey,
      });

      if (matchedClinics.length > 0) {
        wx.showToast({
          title: `发现 ${matchedClinics.length} 家相似诊所`,
          icon: 'none',
        });
      } else {
        wx.showToast({
        title: '暂时没发现重复',
          icon: 'success',
        });
      }

      return matchedClinics;
    } catch (error) {
      wx.showToast({
        title: error.message || '检查是否重复失败',
        icon: 'none',
      });
      return null;
    } finally {
      this.setData({
        checkingMatches: false,
      });
    }
  },

  async checkMatches() {
    await this.fetchSubmissionMatches();
  },

  viewMatchedClinic(event) {
    const clinicId = Number(event.currentTarget.dataset.clinicId);

    if (!clinicId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/clinic-detail/clinic-detail?id=${clinicId}`,
    });
  },

  async submitRecommendation() {
    if (this.data.submitting) {
      return;
    }

    if (this.data.uploadingPhotos) {
      wx.showToast({
        title: '请等待图片上传完成',
        icon: 'none',
      });
      return;
    }

    const validationMessage = this.validateForm();

    if (validationMessage) {
      wx.showToast({
        title: validationMessage,
        icon: 'none',
      });
      return;
    }

    if (this.shouldCheckMatches()) {
      const currentMatchCheckKey = buildMatchCheckKey(this.data);
      const hasFreshMatchCheck =
        this.data.hasCheckedMatches &&
        this.data.lastMatchCheckKey === currentMatchCheckKey;

      if (!hasFreshMatchCheck) {
        const matchedClinics = await this.fetchSubmissionMatches();

        if (matchedClinics === null) {
          return;
        }

        if (matchedClinics.length > 0) {
          wx.showModal({
            title: '先确认是否重复',
            content: '我们找到了几家可能是同一家的诊所，建议先看一下；如果确认不是同一家，再次点击提交即可继续。',
            showCancel: false,
          });
          return;
        }
      } else if (this.data.matchedClinics.length > 0) {
        wx.showModal({
          title: '发现相似诊所',
          content: '页面下方有几家相似诊所，请先确认，再决定是否继续提交。',
          confirmText: '继续提交',
          cancelText: '先查看',
          success: async (result) => {
            if (!result.confirm) {
              return;
            }

            await this.submitAfterMatchCheck();
          },
        });
        return;
      }
    }

    await this.submitAfterMatchCheck();
  },

  async submitAfterMatchCheck() {
    if (this.data.submitting) {
      return;
    }

    this.setData({
      submitting: true,
    });

    try {
      await ensureLogin();
      const result = await request({
        url: '/clinic-submissions',
        method: 'POST',
        data: this.buildPayload(),
      });

      wx.showToast({
        title: '提交成功',
        icon: 'success',
      });

      setTimeout(() => {
        wx.showModal({
          title: '已提交',
          content: `已收到你的提交，申请编号 #${result.id}。我们会尽快核实处理。`,
          showCancel: false,
          success: () => {
            const pages = getCurrentPages();

            if (pages.length > 1) {
              wx.navigateBack();
              return;
            }

            wx.switchTab({
              url: '/pages/profile/profile',
            });
          },
        });
      }, 400);
    } catch (error) {
      wx.showToast({
        title: error.message || '提交失败，请稍后重试',
        icon: 'none',
      });
    } finally {
      this.setData({
        submitting: false,
      });
    }
  },
});
