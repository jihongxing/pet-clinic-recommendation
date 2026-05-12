const { request } = require('../../utils/api');
const { ensureLogin, getLoginSession } = require('../../utils/auth');

Page({
  data: {
    clinicId: null,
    clinicDraft: {
      name: '',
      address: '',
      city: '',
      district: '',
      phone: '',
    },
    form: {
      applicantName: '',
      applicantPhone: '',
      proofMaterial: '',
    },
    submitting: false,
  },

  onLoad(options) {
    const clinicId = Number(options.clinicId);

    if (!clinicId) {
      wx.showToast({
        title: '缺少诊所 ID',
        icon: 'none',
      });
      return;
    }

    const session = getLoginSession();
    const user = session.user || null;

    this.setData({
      clinicId,
      clinicDraft: {
        name: options.name ? decodeURIComponent(options.name) : '',
        address: options.address ? decodeURIComponent(options.address) : '',
        city: options.city ? decodeURIComponent(options.city) : '',
        district: options.district ? decodeURIComponent(options.district) : '',
        phone: options.phone ? decodeURIComponent(options.phone) : '',
      },
      form: {
        applicantName: (user && user.nickname) || '',
        applicantPhone: '',
        proofMaterial: '',
      },
    });

    wx.setNavigationBarTitle({
      title: '申请认领诊所',
    });
  },

  onFieldInput(event) {
    const { field } = event.currentTarget.dataset;

    if (!field) {
      return;
    }

    this.setData({
      [`form.${field}`]: event.detail.value,
    });
  },

  validateForm() {
    const { applicantName, applicantPhone } = this.data.form;

    if (!applicantName.trim()) {
      return '请填写联系人姓名';
    }

    if (!/^1\d{10}$/.test(applicantPhone.trim())) {
      return '请填写正确的手机号';
    }

    return '';
  },

  async submitClaimRequest() {
    if (this.data.submitting || !this.data.clinicId) {
      return;
    }

    const validationError = this.validateForm();

    if (validationError) {
      wx.showToast({
        title: validationError,
        icon: 'none',
      });
      return;
    }

    this.setData({
      submitting: true,
    });

    try {
      await ensureLogin();

      const result = await request({
        url: `/clinics/${this.data.clinicId}/claim-requests`,
        method: 'POST',
        data: {
          applicantName: this.data.form.applicantName.trim(),
          applicantPhone: this.data.form.applicantPhone.trim(),
          proofMaterial: this.data.form.proofMaterial.trim(),
        },
      });

      wx.showModal({
        title: '认领申请已提交',
        content: `申请单 #${result.id} 已进入审核队列，我们会尽快处理。`,
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: '/pages/my-claim-requests/my-claim-requests',
          });
        },
      });
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
