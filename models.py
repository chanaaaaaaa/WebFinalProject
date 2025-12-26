"""
資料庫模型定義
使用 SQLAlchemy 管理 SQLite 資料庫
"""
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json

Base = declarative_base()

class Image(Base):
    """圖像資料表模型"""
    __tablename__ = 'images'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(String(36), unique=True, nullable=False)  # UUID 字串
    filename = Column(String(255), nullable=False)  # 原始檔名
    feature_vector = Column(Text, nullable=False)  # 特徵向量（JSON 字串）
    info = Column(String(500), nullable=True)  # 圖像描述資訊
    created_at = Column(DateTime, default=datetime.utcnow)  # 建立時間
    
    def to_dict(self):
        """將模型轉換為字典格式"""
        return {
            'id': self.id,
            'uuid': self.uuid,
            'filename': self.filename,
            'info': self.info,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def get_feature_vector(self):
        """從 JSON 字串解析特徵向量"""
        return json.loads(self.feature_vector)
    
    def set_feature_vector(self, vector):
        """將特徵向量轉換為 JSON 字串儲存"""
        self.feature_vector = json.dumps(vector.tolist() if hasattr(vector, 'tolist') else list(vector))


# 資料庫初始化
DATABASE_URL = 'sqlite:///image_search.db'
engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """初始化資料庫，建立所有資料表"""
    Base.metadata.create_all(bind=engine)
    print("資料庫初始化完成！")

def get_db():
    """取得資料庫 session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

