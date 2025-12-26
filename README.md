# 圖像相似度搜尋系統

一個基於 Web 的圖像相似度搜尋系統，使用 Flask、PyTorch 和 ResNet50 模型實現。

## 功能特色

- **管理員端**：上傳圖像到資料庫，系統自動提取特徵向量
- **用戶端**：上傳圖像進行搜尋，系統返回最相似的圖像
- **AI 驅動**：使用預訓練的 ResNet50 模型進行特徵提取
- **相似度計算**：使用餘弦相似度算法找出最佳匹配

## 技術棧

- **後端**：Flask (Python)
- **資料庫**：SQLite (SQLAlchemy ORM)
- **AI/ML**：PyTorch, torchvision (ResNet50)
- **前端**：HTML5, CSS3, Vanilla JavaScript
- **相似度計算**：scikit-learn (cosine similarity)

## 專案結構

```
.
├── app.py                 # Flask 應用程式主檔案
├── models.py              # 資料庫模型定義
├── ai_engine.py           # AI 特徵提取和相似度計算
├── requirements.txt       # Python 依賴套件
├── README.md             # 專案說明文件
├── image_search.db       # SQLite 資料庫（自動生成）
├── static/
│   ├── uploads/          # 上傳的圖像儲存目錄
│   ├── css/
│   │   └── style.css     # 樣式表
│   └── js/
│       └── main.js       # 前端 JavaScript
└── templates/
    ├── index.html        # 用戶搜尋頁面
    └── admin.html        # 管理員上傳頁面
```

## 安裝步驟

### 1. 安裝 Python 依賴

```bash
pip install -r requirements.txt
```

### 2. 初始化資料庫

資料庫會在首次運行 `app.py` 時自動創建。

### 3. 啟動應用程式

```bash
py app.py
```

### 4. 訪問應用程式

- **用戶搜尋頁面**：http://127.0.0.1:5000/
- **管理員上傳頁面**：http://127.0.0.1:5000/admin

## 使用說明

### 管理員端

1. 訪問 `/admin` 頁面
2. 點擊或拖放圖像到上傳區域
3. （可選）輸入圖像描述資訊
4. 點擊「上傳圖像」按鈕
5. 系統會自動：
   - 儲存圖像到 `static/uploads/` 目錄（使用 UUID 命名）
   - 提取圖像特徵向量（使用 ResNet50）
   - 儲存圖像資訊和特徵向量到資料庫

### 用戶端

1. 訪問首頁 `/`
2. 點擊或拖放要搜尋的圖像
3. 點擊「開始搜尋」按鈕
4. 系統會：
   - 提取查詢圖像的特徵向量
   - 與資料庫中所有圖像進行相似度比較
   - 返回最相似的圖像和相似度分數

## API 端點

### POST /api/upload
管理員上傳圖像

**請求**：
- `file`: 圖像檔案
- `info`: 圖像描述（可選）

**回應**：
```json
{
  "success": true,
  "message": "圖像上傳成功",
  "data": {
    "id": 1,
    "uuid": "f47ac10b-...",
    "filename": "example.jpg",
    "info": "圖像描述"
  }
}
```

### POST /api/search
用戶搜尋相似圖像

**請求**：
- `file`: 要搜尋的圖像檔案

**回應**：
```json
{
  "success": true,
  "message": "搜尋完成",
  "data": {
    "image": {
      "id": 1,
      "uuid": "f47ac10b-...",
      "filename": "example.jpg",
      "info": "圖像描述",
      "created_at": "2024-01-01T00:00:00"
    },
    "image_url": "/static/uploads/f47ac10b-....jpg",
    "similarity": 0.9234
  }
}
```

### GET /api/images
取得所有圖像列表

**回應**：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "f47ac10b-...",
      "filename": "example.jpg",
      "info": "圖像描述",
      "created_at": "2024-01-01T00:00:00"
    }
  ]
}
```

## 資料庫結構

### images 表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | Integer | 主鍵，自動遞增 |
| uuid | String(36) | 唯一識別碼 |
| filename | String(255) | 原始檔名 |
| feature_vector | Text | 特徵向量（JSON 格式） |
| info | String(500) | 圖像描述 |
| created_at | DateTime | 建立時間 |

## 注意事項

1. **首次運行**：系統會自動下載 ResNet50 預訓練模型（約 100MB），需要網路連線
2. **GPU 支援**：如果系統有 CUDA 支援的 GPU，會自動使用 GPU 加速
3. **檔案大小限制**：預設最大上傳檔案大小為 16MB
4. **支援格式**：PNG, JPG, JPEG, GIF, BMP, WEBP

## 開發說明

### 修改模型

如果要使用其他模型（如 ResNet18），修改 `ai_engine.py` 中的 `load_model()` 函數：

```python
model = models.resnet18(pretrained=True)  # 改為 ResNet18
```

### 調整相似度閾值

可以在 `app.py` 的 `search_image()` 函數中添加相似度閾值過濾：

```python
if similarity_score < 0.5:  # 只返回相似度大於 0.5 的結果
    return jsonify({'message': '未找到相似圖像'})
```
