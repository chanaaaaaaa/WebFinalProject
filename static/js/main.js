/**
 * 前端主要 JavaScript 邏輯
 * 處理圖像上傳、搜尋和 UI 互動
 */

// ==================== 通用功能 ====================

/**
 * 顯示錯誤訊息
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    console.error(message);
}

/**
 * 顯示成功訊息
 */
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

/**
 * 顯示/隱藏載入動畫
 */
function setLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

/**
 * 預覽圖像
 */
function previewImage(file, previewId) {
    const reader = new FileReader();
    const previewImg = document.getElementById(previewId);
    
    reader.onload = function(e) {
        previewImg.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// ==================== 用戶搜尋頁面邏輯 ====================

if (document.getElementById('searchBtn')) {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const previewSection = document.getElementById('previewSection');
    const resultSection = document.getElementById('resultSection');
    const searchBtn = document.getElementById('searchBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    let selectedFile = null;

    // 點擊上傳區域
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // 拖放功能
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // 檔案選擇
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    /**
     * 處理檔案選擇
     */
    function handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            showError('請選擇圖像檔案');
            return;
        }

        selectedFile = file;
        previewImage(file, 'previewImage');
        uploadArea.style.display = 'none';
        previewSection.style.display = 'block';
    }

    // 取消按鈕
    cancelBtn.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        uploadArea.style.display = 'block';
        previewSection.style.display = 'none';
        resultSection.style.display = 'none';
    });

    // 搜尋按鈕
    searchBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            showError('請先選擇圖像');
            return;
        }

        await searchImage(selectedFile);
    });

    /**
     * 搜尋相似圖像
     */
    async function searchImage(file) {
        setLoading(true);
        resultSection.style.display = 'none';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '搜尋失敗');
            }

            if (!data.success) {
                throw new Error(data.message || '搜尋失敗');
            }

            if (!data.data || !data.data.image) {
                showError('資料庫中沒有找到相似的圖像');
                setLoading(false);
                return;
            }

            // 顯示結果
            displaySearchResult(data.data);
            setLoading(false);

        } catch (error) {
            showError(error.message);
            setLoading(false);
        }
    }

    /**
     * 顯示搜尋結果
     */
    function displaySearchResult(result) {
        const similarity = (result.similarity * 100).toFixed(2);
        document.getElementById('similarityScore').textContent = `${similarity}%`;
        document.getElementById('matchedImage').src = result.image_url;
        document.getElementById('matchedFilename').textContent = result.image.filename;
        document.getElementById('matchedInfo').textContent = result.image.info || '無描述';
        
        if (result.image.created_at) {
            const date = new Date(result.image.created_at);
            document.getElementById('matchedDate').textContent = date.toLocaleString('zh-TW');
        }

        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ==================== 管理員頁面邏輯 ====================

if (document.getElementById('uploadBtn')) {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const imageInfo = document.getElementById('imageInfo');
    const previewSection = document.getElementById('previewSection');
    const uploadBtn = document.getElementById('uploadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    let selectedFile = null;

    // 點擊上傳區域
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // 拖放功能
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // 檔案選擇
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    /**
     * 處理檔案選擇
     */
    function handleFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            showError('請選擇圖像檔案');
            return;
        }

        selectedFile = file;
        previewImage(file, 'previewImage');
        uploadArea.style.display = 'none';
        previewSection.style.display = 'block';
    }

    // 取消按鈕
    cancelBtn.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        imageInfo.value = '';
        uploadArea.style.display = 'block';
        previewSection.style.display = 'none';
    });

    // 上傳按鈕
    uploadBtn.addEventListener('click', async () => {
        if (!selectedFile) {
            showError('請先選擇圖像');
            return;
        }

        await uploadImage(selectedFile, imageInfo.value);
    });

    // 重新整理按鈕
    refreshBtn.addEventListener('click', () => {
        loadImagesList();
    });

    /**
     * 上傳圖像
     */
    async function uploadImage(file, info) {
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('info', info);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '上傳失敗');
            }

            if (!data.success) {
                throw new Error(data.message || '上傳失敗');
            }

            showSuccess('圖像上傳成功！');
            
            // 重置表單
            selectedFile = null;
            fileInput.value = '';
            imageInfo.value = '';
            uploadArea.style.display = 'block';
            previewSection.style.display = 'none';

            // 重新載入圖像列表
            loadImagesList();
            setLoading(false);

        } catch (error) {
            showError(error.message);
            setLoading(false);
        }
    }

    /**
     * 載入圖像列表
     */
    async function loadImagesList() {
        const imagesGrid = document.getElementById('imagesGrid');
        if (!imagesGrid) return;

        try {
            const response = await fetch('/api/images');
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error('載入圖像列表失敗');
            }

            imagesGrid.innerHTML = '';

            if (data.data.length === 0) {
                imagesGrid.innerHTML = '<p class="empty-message">尚無上傳的圖像</p>';
                return;
            }

            data.data.forEach(image => {
                const imageCard = createImageCard(image);
                imagesGrid.appendChild(imageCard);
            });

        } catch (error) {
            showError(error.message);
        }
    }

    /**
     * 創建圖像卡片
     */
    function createImageCard(image) {
        const card = document.createElement('div');
        card.className = 'image-card';

        const fileExt = image.filename.split('.').pop().toLowerCase();
        const imageUrl = `/static/uploads/${image.uuid}.${fileExt}`;

        card.innerHTML = `
            <div class="card-image">
                <img src="${imageUrl}" alt="${image.filename}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E🖼️%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="card-info">
                <p class="card-filename">${image.filename}</p>
                <p class="card-info-text">${image.info || '無描述'}</p>
                <p class="card-date">${new Date(image.created_at).toLocaleString('zh-TW')}</p>
            </div>
        `;

        return card;
    }

    // 頁面載入時自動載入圖像列表
    window.addEventListener('DOMContentLoaded', () => {
        loadImagesList();
    });
}

