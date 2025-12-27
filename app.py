"""
Flask 應用程式主檔案
提供圖像上傳和搜尋的 API 端點
"""
from flask import Flask, request, jsonify, render_template, send_from_directory, abort
from werkzeug.utils import secure_filename
from functools import wraps
import os
import uuid
from datetime import datetime
from models import init_db, get_db, Image
from ai_engine import extract_features, find_most_similar
import json

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 限制上傳檔案大小為 16MB
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
app.config['ADMIN_ALLOWED_IP'] = '127.0.0.1'  # 管理員介面只允許本地訪問

# 確保上傳目錄存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


def allowed_file(filename):
    """檢查檔案副檔名是否允許"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower(
           ) in app.config['ALLOWED_EXTENSIONS']


def get_client_ip():
    """取得客戶端 IP 地址"""
    # 檢查是否有代理轉發的 IP
    if request.headers.get('X-Forwarded-For'):
        ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        ip = request.headers.get('X-Real-IP')
    else:
        ip = request.remote_addr
    return ip


def admin_only(f):
    """裝飾器：只允許 127.0.0.1 訪問管理員功能"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_ip = get_client_ip()
        if client_ip != app.config['ADMIN_ALLOWED_IP']:
            # 如果不是本地 IP，返回 403 禁止訪問
            abort(403)
        return f(*args, **kwargs)
    return decorated_function


@app.route('/')
def index():
    """用戶搜尋頁面"""
    return render_template('index.html')


@app.route('/admin')
@admin_only
def admin():
    """管理員上傳頁面（僅限本地訪問）"""
    return render_template('admin.html')


@app.route('/api/upload', methods=['POST'])
@admin_only
def upload_image():
    """
    管理員上傳圖像 API（僅限本地訪問）
    接收圖像檔案，儲存到磁碟，提取特徵向量，儲存到資料庫
    """
    try:
        # 檢查是否有檔案
        if 'file' not in request.files:
            return jsonify({'error': '沒有上傳檔案'}), 400

        file = request.files['file']
        info = request.form.get('info', '')  # 圖像描述資訊（可選）

        if file.filename == '':
            return jsonify({'error': '未選擇檔案'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': '不支援的檔案格式'}), 400

        # 生成唯一 UUID 和檔名
        file_uuid = str(uuid.uuid4())
        original_filename = secure_filename(file.filename)
        file_ext = original_filename.rsplit('.', 1)[1].lower()
        new_filename = f"{file_uuid}.{file_ext}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)

        # 儲存檔案
        file.save(file_path)

        # 提取特徵向量
        try:
            feature_vector = extract_features(file_path)
        except Exception as e:
            # 如果特徵提取失敗，刪除已儲存的檔案
            os.remove(file_path)
            return jsonify({'error': f'特徵提取失敗: {str(e)}'}), 500

        # 儲存到資料庫
        db = next(get_db())
        try:
            image_record = Image(
                uuid=file_uuid,
                filename=original_filename,
                info=info,
                created_at=datetime.utcnow()
            )
            image_record.set_feature_vector(feature_vector)

            db.add(image_record)
            db.commit()
            db.refresh(image_record)

            return jsonify({
                'success': True,
                'message': '圖像上傳成功',
                'data': {
                    'id': image_record.id,
                    'uuid': image_record.uuid,
                    'filename': image_record.filename,
                    'info': image_record.info
                }
            }), 200

        except Exception as e:
            db.rollback()
            os.remove(file_path)  # 刪除已儲存的檔案
            return jsonify({'error': f'資料庫儲存失敗: {str(e)}'}), 500
        finally:
            db.close()

    except Exception as e:
        return jsonify({'error': f'上傳失敗: {str(e)}'}), 500


@app.route('/api/search', methods=['POST'])
def search_image():
    """
    用戶搜尋圖像 API
    接收圖像檔案，提取特徵向量，與資料庫中所有向量比較，返回最相似的圖像
    """
    try:
        # 檢查是否有檔案
        if 'file' not in request.files:
            return jsonify({'error': '沒有上傳檔案'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': '未選擇檔案'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': '不支援的檔案格式'}), 400

        # 儲存臨時檔案
        temp_filename = f"temp_{uuid.uuid4()}.{file.filename.rsplit('.', 1)[1].lower()}"
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], temp_filename)
        file.save(temp_path)

        try:
            # 提取查詢圖像的特徵向量
            query_vector = extract_features(temp_path)
        except Exception as e:
            os.remove(temp_path)
            return jsonify({'error': f'特徵提取失敗: {str(e)}'}), 500
        finally:
            # 刪除臨時檔案
            if os.path.exists(temp_path):
                os.remove(temp_path)

        # 從資料庫讀取所有圖像和特徵向量
        db = next(get_db())
        try:
            all_images = db.query(Image).all()

            if not all_images:
                return jsonify({
                    'success': True,
                    'message': '資料庫中沒有圖像',
                    'data': None
                }), 200

            # 準備資料庫向量列表
            database_vectors = []
            for img in all_images:
                db_vector = img.get_feature_vector()
                database_vectors.append((img.id, db_vector))

            # 找出最相似的圖像
            best_match_id, similarity_score = find_most_similar(
                query_vector, database_vectors)

            if best_match_id is None:
                return jsonify({
                    'success': True,
                    'message': '未找到相似圖像',
                    'data': None
                }), 200

            # 取得最相似圖像的詳細資訊
            best_match = db.query(Image).filter(
                Image.id == best_match_id).first()

            return jsonify({
                'success': True,
                'message': '搜尋完成',
                'data': {
                    'image': best_match.to_dict(),
                    'image_url': f"/static/uploads/{best_match.uuid}.{best_match.filename.rsplit('.', 1)[1].lower()}",
                    'similarity': round(similarity_score, 4)  # 保留 4 位小數
                }
            }), 200

        except Exception as e:
            return jsonify({'error': f'搜尋失敗: {str(e)}'}), 500
        finally:
            db.close()

    except Exception as e:
        return jsonify({'error': f'搜尋失敗: {str(e)}'}), 500


@app.route('/api/images', methods=['GET'])
@admin_only
def list_images():
    """取得所有圖像列表（用於管理，僅限本地訪問）"""
    db = next(get_db())
    try:
        images = db.query(Image).order_by(Image.created_at.desc()).all()
        return jsonify({
            'success': True,
            'data': [img.to_dict() for img in images]
        }), 200
    except Exception as e:
        return jsonify({'error': f'取得列表失敗: {str(e)}'}), 500
    finally:
        db.close()


@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    """提供上傳的圖像檔案"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.errorhandler(403)
def forbidden(error):
    """403 錯誤處理：訪問被禁止"""
    return render_template('403.html'), 403

#


@app.route('/api/images/<int:image_id>', methods=['DELETE'])
@admin_only
def delete_image(image_id):
    """刪除圖像 API"""
    db = next(get_db())
    try:
        # 找尋圖片紀錄
        image = db.query(Image).filter(Image.id == image_id).first()
        if not image:
            return jsonify({'error': '找不到圖像'}), 404

        # 嘗試刪除實體檔案 (如果檔案還在的話)
        try:
            file_ext = image.filename.rsplit('.', 1)[1].lower()
            file_path = os.path.join(
                app.config['UPLOAD_FOLDER'], f"{image.uuid}.{file_ext}")
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"檔案刪除錯誤 (可能已不存在): {e}")

        # 刪除資料庫紀錄
        db.delete(image)
        db.commit()

        return jsonify({'success': True, 'message': '刪除成功'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


if __name__ == '__main__':
    # 初始化資料庫
    init_db()

    # 啟動 Flask 應用程式
    print("啟動 Flask 應用程式...")
    print("用戶搜尋頁面: http://127.0.0.1:5001/")
    print("管理員上傳頁面: http://127.0.0.1:5001/admin")
    app.run(debug=True, host='0.0.0.0', port=5001)
