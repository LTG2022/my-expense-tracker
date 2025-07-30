// 全局变量
let records = [];
let siteTags = [];
let platformTags = [];
let currentEditId = null;
let deleteRecordId = null;

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    loadData();
    initializeCurrentDateTime();
    initializeEventListeners();
    initializeDefaultTags();
    renderRecords();
    renderTags();
    updateFilterOptions();
    updateSummary();
    
    // 设置默认日期为当前年月
    const now = new Date();
    document.getElementById('summaryMonth').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('summaryYear').value = now.getFullYear();
}

// 加载数据
function loadData() {
    try {
        const savedRecords = localStorage.getItem('expenseRecords');
        const savedSiteTags = localStorage.getItem('siteTags');
        const savedPlatformTags = localStorage.getItem('platformTags');
        
        records = savedRecords ? JSON.parse(savedRecords) : [];
        siteTags = savedSiteTags ? JSON.parse(savedSiteTags) : [];
        platformTags = savedPlatformTags ? JSON.parse(savedPlatformTags) : [];
    } catch (error) {
        console.error('加载数据失败:', error);
        records = [];
        siteTags = [];
        platformTags = [];
    }
}

// 保存数据
function saveData() {
    try {
        localStorage.setItem('expenseRecords', JSON.stringify(records));
        localStorage.setItem('siteTags', JSON.stringify(siteTags));
        localStorage.setItem('platformTags', JSON.stringify(platformTags));
    } catch (error) {
        console.error('保存数据失败:', error);
        showMessage('保存数据失败，请检查浏览器存储空间', 'error');
    }
}

// 初始化当前日期时间
function initializeCurrentDateTime() {
    const now = new Date();
    const date = now.getFullYear() + '-' + 
                 String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + ':' + 
                 String(now.getMinutes()).padStart(2, '0');
    
    document.getElementById('recordDate').value = date;
    document.getElementById('recordTime').value = time;
}

// 初始化事件监听器
function initializeEventListeners() {
    // 标签页切换
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 表单提交
    document.getElementById('recordForm').addEventListener('submit', handleFormSubmit);

    // 筛选输入框监听
    ['dateFrom', 'dateTo', 'amountFrom', 'amountTo', 'keyword', 'siteFilter', 'platformFilter'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debounce(filterRecords, 500));
        }
    });

    // 标签输入框回车事件
    document.getElementById('newSiteTag').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTag('site');
    });
    
    document.getElementById('newPlatformTag').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTag('platform');
    });

    // 点击模态框背景关闭
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('deleteModal')) {
            closeDeleteModal();
        }
    });
}

// 初始化默认标签
function initializeDefaultTags() {
    if (siteTags.length === 0) {
        siteTags = ['淘宝', '京东', '天猫', '拼多多', '美团', '饿了么', '滴滴出行', '12306', '其他'];
        saveData();
    }
    
    if (platformTags.length === 0) {
        platformTags = ['支付宝', '微信支付', '银行卡', '现金', '花呗', '信用卡', '其他'];
        saveData();
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 标签页切换
function switchTab(tabName) {
    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 显示对应标签页
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // 切换到添加页面时重置表单
    if (tabName === 'add') {
        resetForm();
    }
    
    // 切换到汇总页面时更新数据
    if (tabName === 'summary') {
        updateTimeSummary();
        showCategorySummary('site');
    }
}

// 处理表单提交
function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        id: currentEditId || generateId(),
        date: document.getElementById('recordDate').value,
        time: document.getElementById('recordTime').value,
        amount: parseFloat(document.getElementById('amount').value),
        description: document.getElementById('description').value.trim(),
        paymentSite: document.getElementById('paymentSite').value.trim(),
        paymentPlatform: document.getElementById('paymentPlatform').value.trim(),
        category: document.getElementById('category').value,
        note: document.getElementById('note').value.trim(),
        createdAt: currentEditId ? records.find(r => r.id === currentEditId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // 验证必填字段
    if (!formData.date || !formData.time || !formData.amount || !formData.description) {
        showMessage('请填写所有必填字段', 'error');
        return;
    }

    if (formData.amount <= 0) {
        showMessage('金额必须大于0', 'error');
        return;
    }

    try {
        if (currentEditId) {
            // 编辑记录
            const index = records.findIndex(r => r.id === currentEditId);
            if (index !== -1) {
                records[index] = formData;
                showMessage('记录更新成功', 'success');
            }
        } else {
            // 添加新记录
            records.unshift(formData);
            showMessage('记录添加成功', 'success');
        }

        // 自动添加新标签
        if (formData.paymentSite && !siteTags.includes(formData.paymentSite)) {
            siteTags.push(formData.paymentSite);
        }
        if (formData.paymentPlatform && !platformTags.includes(formData.paymentPlatform)) {
            platformTags.push(formData.paymentPlatform);
        }

        saveData();
        renderRecords();
        renderTags();
        updateFilterOptions();
        resetForm();
        
        // 切换到记录页面
        setTimeout(() => {
            switchTab('records');
        }, 1000);
        
    } catch (error) {
        console.error('保存记录失败:', error);
        showMessage('保存失败，请重试', 'error');
    }
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 重置表单
function resetForm() {
    document.getElementById('recordForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').textContent = '添加新记录';
    document.getElementById('submitBtnText').textContent = '保存记录';
    document.getElementById('cancelEdit').style.display = 'none';
    currentEditId = null;
    initializeCurrentDateTime();
}

// 渲染记录列表
function renderRecords(filteredRecords = null) {
    const recordsList = document.getElementById('recordsList');
    const displayRecords = filteredRecords || records;
    
    if (displayRecords.length === 0) {
        recordsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>暂无记录</h3>
                <p>点击"添加记录"开始记账吧！</p>
            </div>
        `;
        updateStats(displayRecords);
        return;
    }

    recordsList.innerHTML = displayRecords.map(record => `
        <div class="record-item" data-id="${record.id}">
            <div class="record-date" data-label="日期时间：">
                ${record.date}<br>
                <small>${record.time}</small>
            </div>
            <div class="record-amount" data-label="金额：">¥${record.amount.toFixed(2)}</div>
            <div class="record-description" data-label="描述：">
                ${record.description}
                ${record.category ? `<br><small class="category">分类：${record.category}</small>` : ''}
                ${record.note ? `<br><small class="note">备注：${record.note}</small>` : ''}
            </div>
            <div class="record-site" data-label="支付网站：">${record.paymentSite || '-'}</div>
            <div class="record-platform" data-label="支付平台：">${record.paymentPlatform || '-'}</div>
            <div class="record-actions">
                <button class="action-btn edit-btn" onclick="editRecord('${record.id}')" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteRecord('${record.id}')" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    updateStats(displayRecords);
}

// 更新统计信息
function updateStats(displayRecords) {
    const totalRecords = displayRecords.length;
    const totalAmount = displayRecords.reduce((sum, record) => sum + record.amount, 0);
    const avgAmount = totalRecords > 0 ? totalAmount / totalRecords : 0;

    document.getElementById('totalRecords').textContent = totalRecords;
    document.getElementById('totalAmount').textContent = `¥${totalAmount.toFixed(2)}`;
    document.getElementById('avgAmount').textContent = `¥${avgAmount.toFixed(2)}`;
}

// 编辑记录
function editRecord(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;

    currentEditId = id;
    
    // 填充表单
    document.getElementById('editId').value = id;
    document.getElementById('recordDate').value = record.date;
    document.getElementById('recordTime').value = record.time;
    document.getElementById('amount').value = record.amount;
    document.getElementById('description').value = record.description;
    document.getElementById('paymentSite').value = record.paymentSite || '';
    document.getElementById('paymentPlatform').value = record.paymentPlatform || '';
    document.getElementById('category').value = record.category || '';
    document.getElementById('note').value = record.note || '';

    // 更新表单标题和按钮
    document.getElementById('formTitle').textContent = '编辑记录';
    document.getElementById('submitBtnText').textContent = '更新记录';
    document.getElementById('cancelEdit').style.display = 'inline-flex';

    // 切换到编辑页面
    switchTab('add');
}

// 取消编辑
function cancelEdit() {
    resetForm();
    switchTab('records');
}

// 删除记录
function deleteRecord(id) {
    deleteRecordId = id;
    document.getElementById('deleteModal').style.display = 'block';
}

// 确认删除
function confirmDelete() {
    if (deleteRecordId) {
        records = records.filter(r => r.id !== deleteRecordId);
        saveData();
        renderRecords();
        updateFilterOptions();
        showMessage('记录删除成功', 'success');
        closeDeleteModal();
    }
}

// 关闭删除模态框
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deleteRecordId = null;
}

// 筛选记录
function filterRecords() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const amountFrom = parseFloat(document.getElementById('amountFrom').value) || 0;
    const amountTo = parseFloat(document.getElementById('amountTo').value) || Infinity;
    const keyword = document.getElementById('keyword').value.toLowerCase().trim();
    const siteFilter = document.getElementById('siteFilter').value;
    const platformFilter = document.getElementById('platformFilter').value;

    const filteredRecords = records.filter(record => {
        // 日期筛选
        if (dateFrom && record.date < dateFrom) return false;
        if (dateTo && record.date > dateTo) return false;
        
        // 金额筛选
        if (record.amount < amountFrom || record.amount > amountTo) return false;
        
        // 关键词筛选
        if (keyword && !record.description.toLowerCase().includes(keyword) &&
            !record.paymentSite?.toLowerCase().includes(keyword) &&
            !record.paymentPlatform?.toLowerCase().includes(keyword) &&
            !record.note?.toLowerCase().includes(keyword)) return false;
        
        // 网站筛选
        if (siteFilter && record.paymentSite !== siteFilter) return false;
        
        // 平台筛选
        if (platformFilter && record.paymentPlatform !== platformFilter) return false;
        
        return true;
    });

    renderRecords(filteredRecords);
}

// 清除筛选
function clearFilters() {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('amountFrom').value = '';
    document.getElementById('amountTo').value = '';
    document.getElementById('keyword').value = '';
    document.getElementById('siteFilter').value = '';
    document.getElementById('platformFilter').value = '';
    
    renderRecords();
}

// 更新筛选选项
function updateFilterOptions() {
    const siteFilter = document.getElementById('siteFilter');
    const platformFilter = document.getElementById('platformFilter');
    
    // 更新网站筛选选项
    const usedSites = [...new Set(records.map(r => r.paymentSite).filter(Boolean))];
    siteFilter.innerHTML = '<option value="">全部</option>' + 
        usedSites.map(site => `<option value="${site}">${site}</option>`).join('');
    
    // 更新平台筛选选项
    const usedPlatforms = [...new Set(records.map(r => r.paymentPlatform).filter(Boolean))];
    platformFilter.innerHTML = '<option value="">全部</option>' + 
        usedPlatforms.map(platform => `<option value="${platform}">${platform}</option>`).join('');
    
    // 更新下拉列表
    updateDataLists();
}

// 更新下拉列表
function updateDataLists() {
    const siteList = document.getElementById('siteList');
    const platformList = document.getElementById('platformList');
    
    siteList.innerHTML = siteTags.map(tag => `<option value="${tag}">`).join('');
    platformList.innerHTML = platformTags.map(tag => `<option value="${tag}">`).join('');
}

// 添加标签
function addTag(type) {
    const inputId = type === 'site' ? 'newSiteTag' : 'newPlatformTag';
    const input = document.getElementById(inputId);
    const tagName = input.value.trim();
    
    if (!tagName) {
        showMessage('请输入标签名称', 'error');
        return;
    }
    
    const tags = type === 'site' ? siteTags : platformTags;
    
    if (tags.includes(tagName)) {
        showMessage('标签已存在', 'error');
        return;
    }
    
    tags.push(tagName);
    saveData();
    renderTags();
    updateFilterOptions();
    input.value = '';
    showMessage('标签添加成功', 'success');
}

// 添加新标签（在表单中）
function addNewTag(type) {
    const tagName = prompt(`请输入新的${type === 'site' ? '支付网站' : '支付平台'}标签：`);
    if (!tagName) return;
    
    const trimmedName = tagName.trim();
    if (!trimmedName) return;
    
    const tags = type === 'site' ? siteTags : platformTags;
    
    if (tags.includes(trimmedName)) {
        showMessage('标签已存在', 'error');
        return;
    }
    
    tags.push(trimmedName);
    saveData();
    renderTags();
    updateFilterOptions();
    
    // 自动填入到对应输入框
    const inputId = type === 'site' ? 'paymentSite' : 'paymentPlatform';
    document.getElementById(inputId).value = trimmedName;
    
    showMessage('标签添加成功', 'success');
}

// 删除标签
function removeTag(type, tagName) {
    if (!confirm(`确定要删除标签"${tagName}"吗？`)) return;
    
    const tags = type === 'site' ? siteTags : platformTags;
    const index = tags.indexOf(tagName);
    
    if (index !== -1) {
        tags.splice(index, 1);
        saveData();
        renderTags();
        updateFilterOptions();
        showMessage('标签删除成功', 'success');
    }
}

// 渲染标签
function renderTags() {
    const siteTagsList = document.getElementById('siteTagsList');
    const platformTagsList = document.getElementById('platformTagsList');
    
    siteTagsList.innerHTML = siteTags.map(tag => `
        <div class="tag-item">
            <span>${tag}</span>
            <button class="tag-delete" onclick="removeTag('site', '${tag}')" title="删除">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    platformTagsList.innerHTML = platformTags.map(tag => `
        <div class="tag-item">
            <span>${tag}</span>
            <button class="tag-delete" onclick="removeTag('platform', '${tag}')" title="删除">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// 时间维度汇总
function updateTimeSummary() {
    const dimension = document.getElementById('timeDimension').value;
    const month = document.getElementById('summaryMonth').value;
    const year = parseInt(document.getElementById('summaryYear').value);
    const resultDiv = document.getElementById('timeSummaryResult');
    
    let summaryData = {};
    let totalAmount = 0;
    
    records.forEach(record => {
        const recordDate = new Date(record.date);
        let key;
        
        switch(dimension) {
            case 'daily':
                if (month && recordDate.getFullYear() + '-' + String(recordDate.getMonth() + 1).padStart(2, '0') === month) {
                    key = record.date;
                }
                break;
            case 'monthly':
                if (year && recordDate.getFullYear() === year) {
                    key = recordDate.getFullYear() + '-' + String(recordDate.getMonth() + 1).padStart(2, '0');
                }
                break;
            case 'yearly':
                key = recordDate.getFullYear().toString();
                break;
        }
        
        if (key) {
            summaryData[key] = (summaryData[key] || 0) + record.amount;
            totalAmount += record.amount;
        }
    });
    
    if (Object.keys(summaryData).length === 0) {
        resultDiv.innerHTML = '<p>暂无数据</p>';
        return;
    }
    
    const sortedData = Object.entries(summaryData).sort((a, b) => b[0].localeCompare(a[0]));
    
    resultDiv.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">总计</span>
            <span class="summary-amount">¥${totalAmount.toFixed(2)}</span>
        </div>
        <hr>
        ${sortedData.map(([key, amount]) => `
            <div class="summary-item">
                <span class="summary-label">${formatSummaryKey(key, dimension)}</span>
                <span class="summary-amount">¥${amount.toFixed(2)}</span>
            </div>
        `).join('')}
    `;
}

// 格式化汇总键值
function formatSummaryKey(key, dimension) {
    switch(dimension) {
        case 'daily':
            return new Date(key).toLocaleDateString('zh-CN');
        case 'monthly':
            const [year, month] = key.split('-');
            return `${year}年${month}月`;
        case 'yearly':
            return `${key}年`;
        default:
            return key;
    }
}

// 分类汇总
function showCategorySummary(type) {
    // 更新标签页状态
    document.querySelectorAll('.summary-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const resultDiv = document.getElementById('categorySummaryResult');
    let summaryData = {};
    let totalAmount = 0;
    
    records.forEach(record => {
        let key;
        switch(type) {
            case 'site':
                key = record.paymentSite || '未分类';
                break;
            case 'platform':
                key = record.paymentPlatform || '未分类';
                break;
            case 'category':
                key = record.category || '未分类';
                break;
        }
        
        summaryData[key] = (summaryData[key] || 0) + record.amount;
        totalAmount += record.amount;
    });
    
    if (Object.keys(summaryData).length === 0) {
        resultDiv.innerHTML = '<p>暂无数据</p>';
        return;
    }
    
    const sortedData = Object.entries(summaryData).sort((a, b) => b[1] - a[1]);
    
    resultDiv.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">总计</span>
            <span class="summary-amount">¥${totalAmount.toFixed(2)}</span>
        </div>
        <hr>
        ${sortedData.map(([key, amount]) => {
            const percentage = totalAmount > 0 ? (amount / totalAmount * 100).toFixed(1) : 0;
            return `
                <div class="summary-item">
                    <span class="summary-label">${key} (${percentage}%)</span>
                    <span class="summary-amount">¥${amount.toFixed(2)}</span>
                </div>
            `;
        }).join('')}
    `;
    
    // 更新图表
    updateChart(sortedData, type);
}

// 更新图表
function updateChart(data, type) {
    const canvas = document.getElementById('summaryChart');
    const ctx = canvas.getContext('2d');
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data.length === 0) return;
    
    const maxAmount = Math.max(...data.map(([, amount]) => amount));
    const barWidth = Math.min(50, (canvas.width - 100) / data.length);
    const maxBarHeight = canvas.height - 80;
    
    // 绘制柱状图
    data.forEach(([label, amount], index) => {
        const barHeight = (amount / maxAmount) * maxBarHeight;
        const x = 50 + index * (barWidth + 10);
        const y = canvas.height - 40 - barHeight;
        
        // 绘制柱子
        ctx.fillStyle = `hsl(${index * 30}, 70%, 60%)`;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // 绘制标签
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label.length > 6 ? label.substring(0, 6) + '...' : label, x + barWidth/2, canvas.height - 20);
        
        // 绘制数值
        ctx.fillText('¥' + amount.toFixed(0), x + barWidth/2, y - 5);
    });
}

// 导出到Excel格式
function exportToExcel() {
    if (records.length === 0) {
        showMessage('暂无数据可导出', 'error');
        return;
    }
    
    try {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 准备数据
        const excelData = prepareExcelData();
        
        // 创建工作表
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        // 设置列宽
        const colWidths = [
            { wch: 12 }, // 日期
            { wch: 8 },  // 时间
            { wch: 10 }, // 金额
            { wch: 30 }, // 描述
            { wch: 15 }, // 支付网站
            { wch: 15 }, // 支付平台
            { wch: 12 }, // 消费类别
            { wch: 25 }  // 备注
        ];
        ws['!cols'] = colWidths;
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '支出记录');
        
        // 添加统计汇总表
        addSummarySheet(wb);
        
        // 生成文件名（包含当前日期）
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
        const filename = `记账数据_${dateStr}.xlsx`;
        
        // 下载文件
        XLSX.writeFile(wb, filename);
        showMessage('Excel文件导出成功', 'success');
        
    } catch (error) {
        console.error('Excel导出失败:', error);
        showMessage('Excel导出失败，请重试', 'error');
    }
}

// 导出到CSV格式
function exportToCSV() {
    if (records.length === 0) {
        showMessage('暂无数据可导出', 'error');
        return;
    }
    
    const csvContent = generateCSV();
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
                   String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(now.getDate()).padStart(2, '0');
    const filename = `记账数据_${dateStr}.csv`;
    
    downloadCSV(csvContent, filename);
    showMessage('CSV文件导出成功', 'success');
}

// 准备Excel数据
function prepareExcelData() {
    // 表头
    const headers = ['日期', '时间', '金额', '描述', '支付网站', '支付平台', '消费类别', '备注'];
    const data = [headers];
    
    // 数据行
    records.forEach(record => {
        const row = [
            record.date,
            record.time,
            record.amount,
            record.description,
            record.paymentSite || '',
            record.paymentPlatform || '',
            record.category || '',
            record.note || ''
        ];
        data.push(row);
    });
    
    return data;
}

// 添加统计汇总工作表
function addSummarySheet(workbook) {
    try {
        // 基础统计
        const totalRecords = records.length;
        const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);
        const avgAmount = totalRecords > 0 ? totalAmount / totalRecords : 0;
        
        // 按支付网站汇总
        const siteStats = {};
        const platformStats = {};
        const categoryStats = {};
        
        records.forEach(record => {
            const site = record.paymentSite || '未分类';
            const platform = record.paymentPlatform || '未分类';
            const category = record.category || '未分类';
            
            siteStats[site] = (siteStats[site] || 0) + record.amount;
            platformStats[platform] = (platformStats[platform] || 0) + record.amount;
            categoryStats[category] = (categoryStats[category] || 0) + record.amount;
        });
        
        // 创建汇总数据
        const summaryData = [
            ['统计项目', '数值'],
            ['记录总数', totalRecords],
            ['总金额', totalAmount.toFixed(2)],
            ['平均金额', avgAmount.toFixed(2)],
            [''],
            ['按支付网站汇总', ''],
            ['网站名称', '金额'],
            ...Object.entries(siteStats).sort((a, b) => b[1] - a[1]).map(([site, amount]) => [site, amount.toFixed(2)]),
            [''],
            ['按支付平台汇总', ''],
            ['平台名称', '金额'],
            ...Object.entries(platformStats).sort((a, b) => b[1] - a[1]).map(([platform, amount]) => [platform, amount.toFixed(2)]),
            [''],
            ['按消费类别汇总', ''],
            ['类别名称', '金额'],
            ...Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).map(([category, amount]) => [category, amount.toFixed(2)])
        ];
        
        // 创建工作表
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        
        // 设置列宽
        summaryWs['!cols'] = [
            { wch: 20 }, // 项目名称
            { wch: 15 }  // 数值
        ];
        
        // 添加到工作簿
        XLSX.utils.book_append_sheet(workbook, summaryWs, '统计汇总');
        
    } catch (error) {
        console.error('创建汇总表失败:', error);
    }
}

// 生成CSV内容
function generateCSV() {
    const headers = ['日期', '时间', '金额', '描述', '支付网站', '支付平台', '消费类别', '备注'];
    const csvRows = [headers.join(',')];
    
    records.forEach(record => {
        const row = [
            record.date,
            record.time,
            record.amount,
            `"${record.description.replace(/"/g, '""')}"`,
            record.paymentSite || '',
            record.paymentPlatform || '',
            record.category || '',
            `"${(record.note || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
}

// 下载CSV文件
function downloadCSV(content, filename) {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 显示消息
function showMessage(message, type = 'success') {
    // 移除现有消息
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // 创建新消息
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    // 插入到当前激活的标签页顶部
    const activeTab = document.querySelector('.tab-content.active');
    activeTab.insertBefore(messageDiv, activeTab.firstChild);
    
    // 3秒后自动隐藏
    setTimeout(() => {
        messageDiv.style.display = 'none';
        messageDiv.remove();
    }, 3000);
}

// 更新汇总页面
function updateSummary() {
    updateTimeSummary();
    showCategorySummary('site');
}

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl+N 新增记录
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        switchTab('add');
    }
    
    // Esc 关闭模态框
    if (e.key === 'Escape') {
        closeDeleteModal();
    }
});

// 页面可见性变化时保存数据
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        saveData();
    }
});

// 导出所有数据（完整备份）
function exportAllData() {
    try {
        const allData = {
            records: records,
            siteTags: siteTags,
            platformTags: platformTags,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const jsonString = JSON.stringify(allData, null, 2);
        
        // 生成文件名
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0') + '_' +
                       String(now.getHours()).padStart(2, '0') + '-' +
                       String(now.getMinutes()).padStart(2, '0');
        const filename = `记账数据备份_${dateStr}.json`;
        
        // 下载文件
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('数据备份成功！文件已下载', 'success');
        
    } catch (error) {
        console.error('数据备份失败:', error);
        showMessage('数据备份失败，请重试', 'error');
    }
}

// 导入所有数据（完整恢复）
function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        showMessage('请选择有效的JSON文件', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // 验证数据格式
            if (!validateImportData(importData)) {
                showMessage('文件格式不正确，请选择有效的备份文件', 'error');
                return;
            }
            
            // 询问是否覆盖现有数据
            const hasExistingData = records.length > 0 || siteTags.length > 0 || platformTags.length > 0;
            if (hasExistingData) {
                const confirmMessage = '导入数据将覆盖当前所有数据，是否继续？\n\n' +
                                     `当前数据：${records.length}条记录\n` +
                                     `导入数据：${importData.records ? importData.records.length : 0}条记录\n\n` +
                                     '建议先备份当前数据！';
                
                if (!confirm(confirmMessage)) {
                    // 清除文件选择
                    event.target.value = '';
                    return;
                }
            }
            
            // 导入数据
            records = importData.records || [];
            siteTags = importData.siteTags || [];
            platformTags = importData.platformTags || [];
            
            // 保存到localStorage
            saveData();
            
            // 刷新界面
            renderRecords();
            renderTags();
            updateFilterOptions();
            updateSummary();
            
            // 清除文件选择
            event.target.value = '';
            
            showMessage(`数据恢复成功！已导入${records.length}条记录`, 'success');
            
        } catch (error) {
            console.error('数据导入失败:', error);
            showMessage('文件格式错误，无法导入数据', 'error');
            // 清除文件选择
            event.target.value = '';
        }
    };
    
    reader.readAsText(file, 'utf-8');
}

// 验证导入数据格式
function validateImportData(data) {
    try {
        // 检查基本结构
        if (!data || typeof data !== 'object') return false;
        
        // 检查记录数据
        if (data.records && !Array.isArray(data.records)) return false;
        
        // 检查标签数据
        if (data.siteTags && !Array.isArray(data.siteTags)) return false;
        if (data.platformTags && !Array.isArray(data.platformTags)) return false;
        
        // 检查记录格式
        if (data.records) {
            for (const record of data.records) {
                if (!record.id || !record.date || !record.amount || !record.description) {
                    return false;
                }
            }
        }
        
        return true;
        
    } catch (error) {
        return false;
    }
}

// 页面关闭前保存数据
window.addEventListener('beforeunload', function() {
    saveData();
});