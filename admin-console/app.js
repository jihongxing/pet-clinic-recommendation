const STORAGE_KEYS = {
  apiBase: 'petmed_admin_api_base',
  token: 'petmed_admin_token',
};

const STATUS_LABELS = {
  pending_review: '待审核',
  need_info: '待补充',
  approved_new: '已新建',
  merged: '已合并',
  rejected: '已驳回',
};

const CLAIM_STATUS_LABELS = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

const ACTION_LABELS = {
  approved_new: '通过并新建',
  merged: '合并到已有诊所',
  need_info: '要求补充',
  rejected: '驳回',
};

const state = {
  apiBase: resolveInitialApiBase(),
  token: localStorage.getItem(STORAGE_KEYS.token) || '',
  admin: null,
  activeView: 'submissions',
  queue: [],
  selectedSubmissionId: null,
  currentDetail: null,
  currentLogs: [],
  claimQueue: [],
  selectedClaimRequestId: null,
  currentClaimDetail: null,
};

const refs = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheRefs();
  bindEvents();
  refs.apiBaseInput.value = state.apiBase;

  if (state.token) {
    bootstrapWithToken();
  } else {
    renderAuthState();
  }
});

function cacheRefs() {
  refs.apiBaseInput = document.getElementById('apiBaseInput');
  refs.saveApiBaseButton = document.getElementById('saveApiBaseButton');
  refs.logoutButton = document.getElementById('logoutButton');
  refs.dashboardPanel = document.getElementById('dashboardPanel');
  refs.submissionsDashboard = document.getElementById('submissionsDashboard');
  refs.claimsDashboard = document.getElementById('claimsDashboard');
  refs.submissionsViewButton = document.getElementById('submissionsViewButton');
  refs.claimsViewButton = document.getElementById('claimsViewButton');
  refs.loginForm = document.getElementById('loginForm');
  refs.devTokenForm = document.getElementById('devTokenForm');
  refs.sessionSummary = document.getElementById('sessionSummary');
  refs.filterForm = document.getElementById('filterForm');
  refs.resetFiltersButton = document.getElementById('resetFiltersButton');
  refs.queueList = document.getElementById('queueList');
  refs.queueMeta = document.getElementById('queueMeta');
  refs.detailContent = document.getElementById('detailContent');
  refs.detailMeta = document.getElementById('detailMeta');
  refs.logsList = document.getElementById('logsList');
  refs.logsMeta = document.getElementById('logsMeta');
  refs.reviewForm = document.getElementById('reviewForm');
  refs.reviewActionInput = document.getElementById('reviewActionInput');
  refs.matchedClinicField = document.getElementById('matchedClinicField');
  refs.matchedClinicIdInput = document.getElementById('matchedClinicIdInput');
  refs.reviewNoteInput = document.getElementById('reviewNoteInput');
  refs.submitReviewButton = document.getElementById('submitReviewButton');
  refs.claimFilterForm = document.getElementById('claimFilterForm');
  refs.resetClaimFiltersButton = document.getElementById('resetClaimFiltersButton');
  refs.claimStatusFilter = document.getElementById('claimStatusFilter');
  refs.claimQueueList = document.getElementById('claimQueueList');
  refs.claimQueueMeta = document.getElementById('claimQueueMeta');
  refs.claimDetailContent = document.getElementById('claimDetailContent');
  refs.claimDetailMeta = document.getElementById('claimDetailMeta');
  refs.claimReviewForm = document.getElementById('claimReviewForm');
  refs.claimReviewActionInput = document.getElementById('claimReviewActionInput');
  refs.claimReviewNoteInput = document.getElementById('claimReviewNoteInput');
  refs.submitClaimReviewButton = document.getElementById('submitClaimReviewButton');
  refs.toast = document.getElementById('toast');
}

function bindEvents() {
  refs.saveApiBaseButton.addEventListener('click', saveApiBase);
  refs.logoutButton.addEventListener('click', logout);
  refs.loginForm.addEventListener('submit', handlePasswordLogin);
  refs.devTokenForm.addEventListener('submit', handleDevTokenLogin);
  refs.filterForm.addEventListener('submit', handleFilterSubmit);
  refs.resetFiltersButton.addEventListener('click', resetFilters);
  refs.reviewForm.addEventListener('submit', handleReviewSubmit);
  refs.reviewActionInput.addEventListener('change', syncReviewActionState);
  refs.claimFilterForm.addEventListener('submit', handleClaimFilterSubmit);
  refs.resetClaimFiltersButton.addEventListener('click', resetClaimFilters);
  refs.claimReviewForm.addEventListener('submit', handleClaimReviewSubmit);
  refs.submissionsViewButton.addEventListener('click', () => switchView('submissions'));
  refs.claimsViewButton.addEventListener('click', () => switchView('claims'));
}

function resolveInitialApiBase() {
  const cached = localStorage.getItem(STORAGE_KEYS.apiBase);

  if (cached) {
    return cached;
  }

  if (window.location.protocol.startsWith('http')) {
    return `${window.location.origin}/api/v1`;
  }

  return 'http://localhost:3000/api/v1';
}

function saveApiBase() {
  state.apiBase = refs.apiBaseInput.value.trim().replace(/\/$/, '');
  localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
  showToast('API 地址已保存');
}

async function bootstrapWithToken() {
  try {
    const admin = await request('/admin/session');
    state.admin = admin;
    renderAuthState();
    await loadInitialDashboardData();
  } catch (error) {
    logout(false);
    showToast(error.message || '登录态已失效，请重新登录', true);
  }
}

async function handlePasswordLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const result = await request('/admin/login', {
      method: 'POST',
      body: {
        username: String(formData.get('username') || '').trim(),
        password: String(formData.get('password') || '').trim(),
      },
      skipAuth: true,
    });

    persistSession(result.token, result.admin);
    showToast(`欢迎回来，${result.admin.displayName || result.admin.username}`);
    await loadInitialDashboardData();
  } catch (error) {
    showToast(error.message || '登录失败', true);
  }
}

async function handleDevTokenLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const result = await request('/auth/dev-token', {
      method: 'POST',
      body: {
        actorType: 'admin',
        username: String(formData.get('username') || '').trim(),
        displayName: String(formData.get('displayName') || '').trim(),
        password: String(formData.get('password') || '').trim(),
      },
      skipAuth: true,
    });

    persistSession(result.token, result.actor);
    showToast(`已签发开发令牌，当前身份：${result.actor.displayName || result.actor.username}`);
    await loadInitialDashboardData();
  } catch (error) {
    showToast(error.message || '开发令牌登录失败', true);
  }
}

function persistSession(token, admin) {
  state.token = token;
  state.admin = admin;
  localStorage.setItem(STORAGE_KEYS.token, token);
  renderAuthState();
}

function renderAuthState() {
  const loggedIn = Boolean(state.admin && state.token);
  refs.logoutButton.classList.toggle('hidden', !loggedIn);
  refs.dashboardPanel.classList.toggle('hidden', !loggedIn);
  refs.sessionSummary.classList.toggle('hidden', !loggedIn);
  renderActiveView();

  if (loggedIn) {
    refs.sessionSummary.innerHTML = `
      当前管理员：<strong>${escapeHtml(
        state.admin.displayName || state.admin.username || `#${state.admin.adminUserId}`,
      )}</strong>
      <span class="mini-chip">ID ${escapeHtml(String(state.admin.adminUserId || ''))}</span>
      <span class="mini-chip">${escapeHtml(state.admin.username || '')}</span>
    `;
  } else {
    refs.sessionSummary.innerHTML = '';
  }
}

function logout(showFeedback = true) {
  state.token = '';
  state.admin = null;
  state.activeView = 'submissions';
  state.queue = [];
  state.selectedSubmissionId = null;
  state.currentDetail = null;
  state.currentLogs = [];
  state.claimQueue = [];
  state.selectedClaimRequestId = null;
  state.currentClaimDetail = null;
  localStorage.removeItem(STORAGE_KEYS.token);
  renderAuthState();
  renderQueue();
  renderDetail();
  renderLogs();
  renderClaimQueue();
  renderClaimDetail();

  if (showFeedback) {
    showToast('已退出后台');
  }
}

async function handleFilterSubmit(event) {
  event.preventDefault();
  await loadQueue();
}

async function handleClaimFilterSubmit(event) {
  event.preventDefault();
  await loadClaimQueue();
}

async function loadInitialDashboardData() {
  renderActiveView();

  if (state.activeView === 'claims') {
    await loadClaimQueue();
    return;
  }

  await loadQueue();
}

function switchView(view) {
  if (!state.admin || view === state.activeView) {
    return;
  }

  state.activeView = view;
  renderActiveView();

  if (view === 'claims') {
    loadClaimQueue();
    return;
  }

  loadQueue();
}

function renderActiveView() {
  const isSubmissionsView = state.activeView === 'submissions';

  refs.submissionsDashboard.classList.toggle('hidden', !isSubmissionsView);
  refs.claimsDashboard.classList.toggle('hidden', isSubmissionsView);
  refs.submissionsViewButton.classList.toggle(
    'view-switch__button--active',
    isSubmissionsView,
  );
  refs.claimsViewButton.classList.toggle(
    'view-switch__button--active',
    !isSubmissionsView,
  );
}

async function loadQueue(preferredSelectionId) {
  refs.queueMeta.textContent = '加载中...';
  const query = new URLSearchParams();
  const status = document.getElementById('statusFilter').value.trim();
  const city = document.getElementById('cityFilter').value.trim();
  const createdFrom = document.getElementById('createdFromFilter').value;
  const createdTo = document.getElementById('createdToFilter').value;

  if (status) query.set('status', status);
  if (city) query.set('city', city);
  if (createdFrom) query.set('createdFrom', createdFrom);
  if (createdTo) query.set('createdTo', createdTo);
  query.set('page', '1');
  query.set('pageSize', '20');

  try {
    const result = await request(`/admin/clinic-submissions?${query.toString()}`);
    state.queue = Array.isArray(result.list) ? result.list : [];
    refs.queueMeta.textContent = `共 ${result.total || 0} 条`;
    renderQueue();

    const candidateSelectionId = preferredSelectionId || state.selectedSubmissionId;
    const nextSelectionId = state.queue.some(
      (item) => item.id === candidateSelectionId,
    )
      ? candidateSelectionId
      : state.queue[0]
        ? state.queue[0].id
        : null;

    if (nextSelectionId) {
      await loadSubmission(nextSelectionId);
    } else {
      state.selectedSubmissionId = null;
      state.currentDetail = null;
      state.currentLogs = [];
      renderDetail();
      renderLogs();
    }
  } catch (error) {
    refs.queueMeta.textContent = '加载失败';
    refs.queueList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || '队列加载失败')}</div>`;
    showToast(error.message || '队列加载失败', true);
  }
}

function renderQueue() {
  if (!state.admin) {
    refs.queueList.innerHTML = '<div class="empty-state">登录后加载推荐审核队列。</div>';
    return;
  }

  if (!state.queue.length) {
    refs.queueList.innerHTML = '<div class="empty-state">当前筛选条件下没有推荐单。</div>';
    return;
  }

  refs.queueList.innerHTML = state.queue
    .map(
      (submission) => `
        <article class="queue-card ${
          submission.id === state.selectedSubmissionId ? 'active' : ''
        }" data-submission-id="${submission.id}">
          <div class="queue-card__meta">
            <span class="status-badge ${escapeHtml(submission.status)}">${escapeHtml(
              STATUS_LABELS[submission.status] || submission.status,
            )}</span>
            <span class="mini-chip">#${escapeHtml(String(submission.id))}</span>
          </div>
          <div class="queue-card__body">
            <h3>${escapeHtml(submission.name || '未命名诊所')}</h3>
            <p>${escapeHtml(submission.address || '未填写地址')}</p>
            <p>推荐人：${escapeHtml(
              submission.submitter && submission.submitter.nickname
                ? submission.submitter.nickname
                : `用户 #${submission.submitter ? submission.submitter.userId : '-'}`,
            )}</p>
            <p>城市：${escapeHtml(submission.city || '未填写')}</p>
            <p>候选重复：${escapeHtml(String((submission.potentialMatches || []).length))} 个</p>
            <p>提交时间：${escapeHtml(formatDateTime(submission.createdAt))}</p>
          </div>
        </article>
      `,
    )
    .join('');

  refs.queueList.querySelectorAll('[data-submission-id]').forEach((node) => {
    node.addEventListener('click', async () => {
      await loadSubmission(Number(node.getAttribute('data-submission-id')));
    });
  });
}

async function loadClaimQueue(preferredSelectionId) {
  refs.claimQueueMeta.textContent = '加载中...';
  const query = new URLSearchParams();
  const status = refs.claimStatusFilter.value.trim();

  if (status) {
    query.set('status', status);
  }

  query.set('page', '1');
  query.set('pageSize', '20');

  try {
    const result = await request(`/admin/claim-requests?${query.toString()}`);
    state.claimQueue = Array.isArray(result.list) ? result.list : [];
    refs.claimQueueMeta.textContent = `共 ${result.total || 0} 条`;
    renderClaimQueue();

    const candidateSelectionId =
      preferredSelectionId || state.selectedClaimRequestId;
    const nextSelectionId = state.claimQueue.some(
      (item) => item.id === candidateSelectionId,
    )
      ? candidateSelectionId
      : state.claimQueue[0]
        ? state.claimQueue[0].id
        : null;

    if (nextSelectionId) {
      loadClaimDetail(nextSelectionId);
      return;
    }

    state.selectedClaimRequestId = null;
    state.currentClaimDetail = null;
    renderClaimDetail();
  } catch (error) {
    refs.claimQueueMeta.textContent = '加载失败';
    refs.claimQueueList.innerHTML = `<div class="empty-state">${escapeHtml(error.message || '认领队列加载失败')}</div>`;
    showToast(error.message || '认领队列加载失败', true);
  }
}

function renderClaimQueue() {
  if (!state.admin) {
    refs.claimQueueList.innerHTML =
      '<div class="empty-state">登录后加载认领审核队列。</div>';
    return;
  }

  if (!state.claimQueue.length) {
    refs.claimQueueList.innerHTML =
      '<div class="empty-state">当前筛选条件下没有认领申请。</div>';
    return;
  }

  refs.claimQueueList.innerHTML = state.claimQueue
    .map(
      (claim) => `
        <article class="queue-card ${
          claim.id === state.selectedClaimRequestId ? 'active' : ''
        }" data-claim-request-id="${claim.id}">
          <div class="queue-card__meta">
            <span class="status-badge ${escapeHtml(claim.status)} claim-status-badge">${escapeHtml(
              CLAIM_STATUS_LABELS[claim.status] || claim.status,
            )}</span>
            <span class="mini-chip">#${escapeHtml(String(claim.id))}</span>
          </div>
          <div class="queue-card__body">
            <h3>${escapeHtml(claim.clinicName || '未知诊所')}</h3>
            <p>${escapeHtml([claim.clinicCity, claim.clinicDistrict, claim.clinicAddress].filter(Boolean).join(' ') || '地址待补充')}</p>
            <p>联系人：${escapeHtml(`${claim.applicantName || '-'} · ${claim.applicantPhone || '-'}`)}</p>
            <p>提交人：${escapeHtml(
              claim.submitter && claim.submitter.nickname
                ? `${claim.submitter.nickname} (#${claim.submitter.userId})`
                : claim.submitter && claim.submitter.userId
                  ? `用户 #${claim.submitter.userId}`
                  : '未知用户',
            )}</p>
            <p>提交时间：${escapeHtml(formatDateTime(claim.createdAt))}</p>
          </div>
        </article>
      `,
    )
    .join('');

  refs.claimQueueList
    .querySelectorAll('[data-claim-request-id]')
    .forEach((node) => {
      node.addEventListener('click', () => {
        loadClaimDetail(Number(node.getAttribute('data-claim-request-id')));
      });
    });
}

function loadClaimDetail(claimRequestId) {
  state.selectedClaimRequestId = claimRequestId;
  state.currentClaimDetail =
    state.claimQueue.find((item) => item.id === claimRequestId) || null;
  renderClaimQueue();
  renderClaimDetail();
}

function renderClaimDetail() {
  const detail = state.currentClaimDetail;

  if (!detail) {
    refs.claimDetailMeta.textContent = '未选择认领申请';
    refs.claimDetailContent.innerHTML =
      '<div class="empty-state">从左侧选择一条认领申请，查看联系人、证明材料和审核结果。</div>';
    refs.claimReviewForm.classList.add('hidden');
    return;
  }

  refs.claimDetailMeta.textContent = `认领申请 #${detail.id}`;
  refs.claimDetailContent.innerHTML = `
    <section class="detail-block full">
      <div class="detail-header">
        <div>
          <h3>${escapeHtml(detail.clinicName || '未知诊所')}</h3>
          <p>${escapeHtml([detail.clinicCity, detail.clinicDistrict, detail.clinicAddress].filter(Boolean).join(' ') || '地址待补充')}</p>
        </div>
        <div class="summary-badges">
          <span class="status-badge ${escapeHtml(detail.status)} claim-status-badge">${escapeHtml(
            CLAIM_STATUS_LABELS[detail.status] || detail.status,
          )}</span>
        </div>
      </div>
      <div class="fact-grid">
        ${renderFact('联系人', detail.applicantName || '-')}
        ${renderFact('联系电话', detail.applicantPhone || '-')}
        ${renderFact(
          '提交人',
          detail.submitter && detail.submitter.nickname
            ? `${detail.submitter.nickname} (#${detail.submitter.userId})`
            : detail.submitter && detail.submitter.userId
              ? `用户 #${detail.submitter.userId}`
              : '未知用户',
        )}
        ${renderFact('用户城市', (detail.submitter && detail.submitter.city) || '-')}
        ${renderFact('提交时间', formatDateTime(detail.createdAt))}
        ${renderFact('审核时间', detail.reviewedAt ? formatDateTime(detail.reviewedAt) : '未审核')}
      </div>
    </section>
    <section class="detail-grid">
      <article class="detail-block full">
        <h4>证明材料 / 补充说明</h4>
        <p>${escapeHtml(detail.proofMaterial || '未填写')}</p>
      </article>
      <article class="detail-block full">
        <h4>当前审核备注</h4>
        <p>${escapeHtml(detail.reviewNote || '暂无')}</p>
      </article>
    </section>
  `;

  const canReview = detail.status === 'pending';
  refs.claimReviewForm.classList.toggle('hidden', !canReview);
  refs.claimReviewNoteInput.value = detail.reviewNote || '';

  if (!canReview) {
    refs.claimReviewForm.classList.add('hidden');
    refs.claimDetailContent.insertAdjacentHTML(
      'beforeend',
      '<div class="detail-block full"><p class="empty-state">当前认领申请已经进入终态，后台仅保留查看信息，不再允许重复审核。</p></div>',
    );
  }
}

async function loadSubmission(submissionId) {
  state.selectedSubmissionId = submissionId;
  renderQueue();
  refs.detailMeta.textContent = `推荐单 #${submissionId} 加载中...`;
  refs.logsMeta.textContent = '加载中...';

  try {
    const [detail, logs] = await Promise.all([
      request(`/admin/clinic-submissions/${submissionId}`),
      request(`/admin/clinic-submissions/${submissionId}/review-logs`),
    ]);

    state.currentDetail = detail;
    state.currentLogs = Array.isArray(logs.list) ? logs.list : [];
    renderDetail();
    renderLogs();
  } catch (error) {
    showToast(error.message || '推荐单加载失败', true);
  }
}

function renderDetail() {
  const detail = state.currentDetail;

  if (!detail) {
    refs.detailMeta.textContent = '未选择推荐单';
    refs.detailContent.innerHTML =
      '<div class="empty-state">从左侧选择一条推荐单，查看详情、候选重复和审核备注。</div>';
    refs.reviewForm.classList.add('hidden');
    return;
  }

  refs.detailMeta.textContent = `推荐单 #${detail.id}`;
  refs.detailContent.innerHTML = `
    <section class="detail-block full">
      <div class="detail-header">
        <div>
          <h3>${escapeHtml(detail.name || '未命名诊所')}</h3>
          <p>${escapeHtml(detail.address || '未填写地址')}</p>
        </div>
        <div class="summary-badges">
          <span class="status-badge ${escapeHtml(detail.status)}">${escapeHtml(
            STATUS_LABELS[detail.status] || detail.status,
          )}</span>
          <span class="tag">${escapeHtml(detail.submissionType || '-')}</span>
        </div>
      </div>
      <div class="fact-grid">
        ${renderFact('城市 / 区域', `${detail.city || '-'} / ${detail.district || '-'}`)}
        ${renderFact('联系电话', detail.phone || '-')}
        ${renderFact('营业时间', detail.businessHours || '-')}
        ${renderFact('提交时间', formatDateTime(detail.createdAt))}
        ${renderFact('审核时间', detail.reviewedAt ? formatDateTime(detail.reviewedAt) : '未审核')}
        ${renderFact(
          '当前审核员',
          detail.reviewer
            ? `${detail.reviewer.displayName || detail.reviewer.username} (#${detail.reviewer.adminUserId})`
            : '暂无',
        )}
      </div>
    </section>
    <section class="detail-grid">
      <article class="detail-block">
        <h4>推荐信息</h4>
        <p>${escapeHtml(detail.reason || '未填写推荐原因')}</p>
        <p>经纬度：${escapeHtml(
          detail.lat != null && detail.lng != null ? `${detail.lat}, ${detail.lng}` : '未提供',
        )}</p>
        <p>照片：${escapeHtml(String((detail.photos || []).length))} 张</p>
      </article>
      <article class="detail-block">
        <h4>提交人与审核备注</h4>
        <p>提交人：${escapeHtml(
          detail.submitter && detail.submitter.nickname
            ? `${detail.submitter.nickname} (#${detail.submitter.userId})`
            : `用户 #${detail.submitter ? detail.submitter.userId : '-'}`,
        )}</p>
        <p>用户城市：${escapeHtml((detail.submitter && detail.submitter.city) || '-')}</p>
        <p>审核备注：${escapeHtml(detail.reviewNote || '暂无')}</p>
      </article>
      <article class="detail-block">
        <h4>关联诊所</h4>
        ${renderClinicSummary(detail.linkedClinic, '当前关联诊所')}
        ${renderClinicSummary(detail.matchedClinic, '当前合并目标')}
      </article>
      <article class="detail-block">
        <h4>候选重复</h4>
        <div class="candidate-list">${renderPotentialMatches(detail.potentialMatches || [])}</div>
      </article>
      <article class="detail-block full">
        <h4>历史重复提交</h4>
        <div class="duplicate-list">${renderHistoricalDuplicates(detail.historicalDuplicates || [])}</div>
      </article>
    </section>
  `;

  const reviewableStatuses = ['pending_review', 'need_info'];
  const canReview = reviewableStatuses.includes(detail.status);

  refs.reviewForm.classList.toggle('hidden', !canReview);
  refs.reviewNoteInput.value = detail.reviewNote || '';
  syncReviewActionState();

  if (!canReview) {
    refs.reviewForm.classList.add('hidden');
    refs.detailContent.insertAdjacentHTML(
      'beforeend',
      '<div class="detail-block full"><p class="empty-state">当前推荐单已经进入终态，后台仅保留查看详情与审核日志，不再允许重复审核。</p></div>',
    );
  }

  refs.detailContent.querySelectorAll('[data-match-clinic-id]').forEach((button) => {
    button.addEventListener('click', () => {
      refs.reviewActionInput.value = 'merged';
      refs.matchedClinicIdInput.value = button.getAttribute('data-match-clinic-id');
      syncReviewActionState();
      refs.matchedClinicIdInput.focus();
    });
  });
}

function renderClinicSummary(clinic, label) {
  if (!clinic) {
    return `<p>${escapeHtml(label)}：暂无</p>`;
  }

  return `
    <p>${escapeHtml(label)}：${escapeHtml(clinic.name)} (#${escapeHtml(String(clinic.clinicId))})</p>
    <p>${escapeHtml(clinic.address || '-')}</p>
  `;
}

function renderPotentialMatches(matches) {
  if (!matches.length) {
    return '<p class="empty-state">没有候选重复诊所。</p>';
  }

  return matches
    .map(
      (match) => `
        <article class="match-card">
          <h4>${escapeHtml(match.name)} (#${escapeHtml(String(match.clinicId))})</h4>
          <p>${escapeHtml(match.address || '-')}</p>
          <p>匹配分：${escapeHtml(String(match.matchScore || 0))}</p>
          <p>命中原因：${escapeHtml((match.matchReasons || []).join(' / ') || '无')}</p>
          <button class="secondary-button" type="button" data-match-clinic-id="${match.clinicId}">
            用这个诊所做合并目标
          </button>
        </article>
      `,
    )
    .join('');
}

function renderHistoricalDuplicates(items) {
  if (!items.length) {
    return '<p class="empty-state">没有历史重复提交。</p>';
  }

  return items
    .map(
      (item) => `
        <article class="duplicate-card">
          <h4>#${escapeHtml(String(item.id))} ${escapeHtml(item.name || '未命名诊所')}</h4>
          <p>${escapeHtml(item.address || '未填写地址')}</p>
          <p>状态：${escapeHtml(STATUS_LABELS[item.status] || item.status)}</p>
          <p>推荐人：${escapeHtml(
            item.submitter && item.submitter.nickname
              ? item.submitter.nickname
              : `用户 #${item.submitter ? item.submitter.userId : '-'}`,
          )}</p>
          <p>重复原因：${escapeHtml((item.duplicateReasons || []).join(' / ') || '无')}</p>
        </article>
      `,
    )
    .join('');
}

function renderLogs() {
  if (!state.selectedSubmissionId) {
    refs.logsMeta.textContent = '未加载';
    refs.logsList.innerHTML =
      '<div class="empty-state">选中推荐单后，这里会展示每次审核动作、操作人和备注。</div>';
    return;
  }

  refs.logsMeta.textContent = `共 ${state.currentLogs.length} 条`;

  if (!state.currentLogs.length) {
    refs.logsList.innerHTML = '<div class="empty-state">当前推荐单还没有审核日志。</div>';
    return;
  }

  refs.logsList.innerHTML = state.currentLogs
    .map(
      (log) => `
        <article class="timeline-item">
          <div class="timeline-item__header">
            <h4>${escapeHtml(ACTION_LABELS[log.action] || log.action)}</h4>
            <span class="timeline-item__meta">${escapeHtml(formatDateTime(log.createdAt))}</span>
          </div>
          <p>状态流转：${escapeHtml(
            `${STATUS_LABELS[log.beforeStatus] || log.beforeStatus} → ${STATUS_LABELS[log.afterStatus] || log.afterStatus}`,
          )}</p>
          <p>操作人：${escapeHtml(
            log.reviewer
              ? `${log.reviewer.displayName || log.reviewer.username} (#${log.reviewer.adminUserId})`
              : '未知审核员',
          )}</p>
          <p>备注：${escapeHtml(log.note || '无')}</p>
        </article>
      `,
    )
    .join('');
}

function syncReviewActionState() {
  const needsMatchedClinic = refs.reviewActionInput.value === 'merged';
  refs.matchedClinicField.classList.toggle('hidden', !needsMatchedClinic);

  if (!needsMatchedClinic) {
    refs.matchedClinicIdInput.value = '';
  }
}

async function handleReviewSubmit(event) {
  event.preventDefault();

  if (!state.selectedSubmissionId) {
    showToast('请先选择推荐单', true);
    return;
  }

  const payload = {
    action: refs.reviewActionInput.value,
  };
  const note = refs.reviewNoteInput.value.trim();
  const matchedClinicId = refs.matchedClinicIdInput.value.trim();

  if (note) {
    payload.note = note;
  }

  if (payload.action === 'merged') {
    if (!matchedClinicId) {
      showToast('合并操作需要填写目标诊所 ID', true);
      return;
    }

    payload.matchedClinicId = Number(matchedClinicId);
  }

  refs.submitReviewButton.disabled = true;
  refs.submitReviewButton.textContent = '提交中...';

  try {
    await request(`/admin/clinic-submissions/${state.selectedSubmissionId}/review`, {
      method: 'POST',
      body: payload,
    });
    showToast('审核动作已提交');
    await loadQueue(state.selectedSubmissionId);
  } catch (error) {
    showToast(error.message || '审核提交失败', true);
  } finally {
    refs.submitReviewButton.disabled = false;
    refs.submitReviewButton.textContent = '提交审核动作';
  }
}

async function handleClaimReviewSubmit(event) {
  event.preventDefault();

  if (!state.selectedClaimRequestId) {
    showToast('请先选择认领申请', true);
    return;
  }

  const payload = {
    action: refs.claimReviewActionInput.value,
  };
  const note = refs.claimReviewNoteInput.value.trim();

  if (note) {
    payload.note = note;
  }

  refs.submitClaimReviewButton.disabled = true;
  refs.submitClaimReviewButton.textContent = '提交中...';

  try {
    const result = await request(
      `/admin/claim-requests/${state.selectedClaimRequestId}/review`,
      {
        method: 'POST',
        body: payload,
      },
    );
    showToast(
      result.clinicAccount && result.clinicAccount.username
        ? `审核完成，已生成账号 ${result.clinicAccount.username}`
        : '认领审核已提交',
    );
    await loadClaimQueue(state.selectedClaimRequestId);
  } catch (error) {
    showToast(error.message || '认领审核提交失败', true);
  } finally {
    refs.submitClaimReviewButton.disabled = false;
    refs.submitClaimReviewButton.textContent = '提交认领审核';
  }
}

function resetFilters() {
  refs.filterForm.reset();
  loadQueue();
}

function resetClaimFilters() {
  refs.claimFilterForm.reset();
  loadClaimQueue();
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (!options.skipAuth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${state.apiBase}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  const message =
    payload && typeof payload.message === 'string' ? payload.message : '请求失败';

  if (!response.ok || (typeof payload.code === 'number' && payload.code !== 0)) {
    if (response.status === 401) {
      logout(false);
    }

    throw new Error(message);
  }

  return payload.data;
}

function renderFact(label, value) {
  return `
    <div class="fact">
      <span class="fact-label">${escapeHtml(label)}</span>
      <span class="fact-value">${escapeHtml(value || '-')}</span>
    </div>
  `;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('zh-CN', { hour12: false });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, isError = false) {
  refs.toast.textContent = message;
  refs.toast.classList.remove('hidden', 'error');

  if (isError) {
    refs.toast.classList.add('error');
  }

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    refs.toast.classList.add('hidden');
  }, 2600);
}
