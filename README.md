# 叭啦叭啦

Flask、PyTorch、ResNet50

## 結構

```
.
├── app.py                # Flask 主檔案
├── models.py             # 資料庫模型定義
├── ai_engine.py          # 特徵提取和相似度計算
├── requirements.txt      # Python 依賴 (pip)
├── README.md             # 讀我.媽的
├── image_search.db       # SQLite 資料庫
├── static/
│   ├── uploads/          # 上傳的圖像目錄
│   ├── css/
│   │   └── style.css     
│   └── js/
│       └── main.js       # 前端 Js
└── templates/
    ├── index.html        # UserInterFace
    └── admin.html        # Admin
```

## 環境

### Python 依賴

```bash
pip install -r requirements.txt
```

### 2. 初始化資料庫

資料庫在運行 `app.py` 時創建。

### 3. 啟動應用程式

```bash
python app.py
```
如果環境很髒的話用下面這個
```bash
py app.py
```

### 4. 訪問應用程式

- **用戶搜尋頁面**：http://127.0.0.1:5000/
- **管理員上傳頁面**：http://127.0.0.1:5000/admin

那當然是還沒有搞網域..

## 使用說明

### 管理員端

1. 訪問 `/admin` 頁面(要求127.0.0.1訪問)
2. 點擊或拖放圖像到上傳區域
3. （可選）輸入圖像描述資訊
4. 點擊「上傳圖像」按鈕
5. 系統會自動：
   - 儲存圖像到 `static/uploads/` 目錄（UUID 命名）
   - 提取圖像特徵向量（使用 ResNet50）(這可以換 沒差)
   - 儲存圖像資訊和特徵向量到資料庫

### 用戶端

1. 訪問首頁 `/`
2. 點擊或拖放要搜尋的圖像
3. 點擊「開始搜尋」按鈕
4. 系統會：
   - 提取查詢圖像的特徵向量
   - 與資料庫中所有圖像進行相似度比較
   - 返回最相似的圖像和相似度分數 (這可以調) (反正就是 很容易改 相似度那邊)

## API 端點

### POST /api/upload
管理員上傳圖像

**request**：
- `file`: 圖像檔案
- `info`: 圖像描述（可選）

**apply**：
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

**request**：
- `file`: 要搜尋的圖像檔案

**apply**：
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

**apply**：
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

## sql-structure

### images list

|   blank-name   |     type     |       describe       |
|----------------|--------------|----------------------|
| id             | Integer      | key-auto-increase    |
| uuid           | String(36)   | uuid-you-know-it     |
| filename       | String(255)  | Original-FileName    |
| feature_vector | Text         | Vector(JSON)         |
| info           | String(500)  | Describe             |
| created_at     | DateTime     | Build-time           |

## 注意事項

1. **首次運行**：系統會自動下載 ResNet50 預訓練模型（約 100MB） (ai_engine.py)
2. **GPU 支援**：如果系統有 CUDA 支援的 GPU，會自動使用 GPU 加速
3. **檔案大小限制**：預設最大上傳檔案大小為 16MB  (可調整 app.py : 16)
4. **支援格式**：PNG, JPG, JPEG, GIF, BMP, WEBP

## 說明

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
