"""
AI 引擎模組
使用 PyTorch 和 torchvision 進行圖像特徵提取
"""
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# 全域變數：模型和轉換器（只載入一次以提高效率）
_model = None
_transform = None
_device = None

def get_device():
    """取得可用的計算裝置（GPU 或 CPU）"""
    global _device
    if _device is None:
        _device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"使用裝置: {_device}")
    return _device

def load_model():
    """
    載入預訓練的 ResNet50 模型
    移除最後的分類層，只保留特徵提取部分
    """
    global _model, _transform, _device
    
    if _model is not None:
        return _model, _transform
    
    device = get_device()
    
    # 載入預訓練的 ResNet50 模型
    model = models.resnet50(pretrained=True)
    
    # 移除最後的分類層（fc），只保留特徵提取器
    model = nn.Sequential(*list(model.children())[:-1])
    model.eval()  # 設定為評估模式
    model = model.to(device)
    
    # 定義圖像預處理轉換（與 ImageNet 預訓練模型相同）
    transform = transforms.Compose([
        transforms.Resize((224, 224)),  # ResNet 輸入尺寸
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],  # ImageNet 平均值
            std=[0.229, 0.224, 0.225]   # ImageNet 標準差
        )
    ])
    
    _model = model
    _transform = transform
    
    print("ResNet50 模型載入完成！")
    return model, transform

def extract_features(image_path):
    """
    從圖像路徑提取特徵向量
    
    Args:
        image_path (str): 圖像檔案路徑
        
    Returns:
        numpy.ndarray: 特徵向量（一維陣列）
    """
    model, transform = load_model()
    device = get_device()
    
    try:
        # 載入並預處理圖像
        image = Image.open(image_path).convert('RGB')
        image_tensor = transform(image).unsqueeze(0)  # 增加 batch 維度
        image_tensor = image_tensor.to(device)
        
        # 提取特徵
        with torch.no_grad():  # 不需要計算梯度
            features = model(image_tensor)
            # 移除 batch 維度並展平
            features = features.squeeze().cpu().numpy().flatten()
        
        # L2 正規化（可選，有助於餘弦相似度計算）
        features = features / (np.linalg.norm(features) + 1e-8)
        
        return features
        
    except Exception as e:
        print(f"特徵提取錯誤: {str(e)}")
        raise

def calculate_similarity(vec_a, vec_b):
    """
    計算兩個特徵向量之間的餘弦相似度
    
    Args:
        vec_a (numpy.ndarray or list): 第一個特徵向量
        vec_b (numpy.ndarray or list): 第二個特徵向量
        
    Returns:
        float: 餘弦相似度分數（0 到 1 之間，1 表示完全相同）
    """
    # 確保是 numpy 陣列
    vec_a = np.array(vec_a).reshape(1, -1)
    vec_b = np.array(vec_b).reshape(1, -1)
    
    # 計算餘弦相似度
    similarity = cosine_similarity(vec_a, vec_b)[0][0]
    
    # 確保結果在 [0, 1] 範圍內（餘弦相似度通常在 [-1, 1]，但正規化後應在 [0, 1]）
    similarity = max(0.0, min(1.0, similarity))
    
    return float(similarity)

def find_most_similar(query_vector, database_vectors):
    """
    在資料庫中找出與查詢向量最相似的向量
    
    Args:
        query_vector (numpy.ndarray): 查詢圖像的特徵向量
        database_vectors (list): 包含 (image_id, vector) 元組的列表
        
    Returns:
        tuple: (image_id, similarity_score) 最相似的圖像 ID 和相似度分數
    """
    if not database_vectors:
        return None, 0.0
    
    best_match_id = None
    best_similarity = -1.0
    
    for image_id, db_vector in database_vectors:
        similarity = calculate_similarity(query_vector, db_vector)
        if similarity > best_similarity:
            best_similarity = similarity
            best_match_id = image_id
    
    return best_match_id, best_similarity

