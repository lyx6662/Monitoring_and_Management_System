import { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import '../css/all.css';
import axios from 'axios';

const PictureAndAICheck = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState({
    images: [],
    videos: []
  });
  // 新增状态管理
  const [checkImages, setCheckImages] = useState([]); // 待检查图片
  const [validImages, setValidImages] = useState([]); // 检查正确图片 (check_1)
  const [invalidImages, setInvalidImages] = useState([]); // 检查错误图片 (check_2)
  const [checkImagePage, setCheckImagePage] = useState(1);
  const [validImagePage, setValidImagePage] = useState(1);
  const [invalidImagePage, setInvalidImagePage] = useState(1);
  const [aiChecking, setAiChecking] = useState({}); // 记录正在检查的图片
  const [batchChecking, setBatchChecking] = useState(false); // 批量检查状态
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 分页相关状态
  const [imagePage, setImagePage] = useState(1);
  const [videoPage, setVideoPage] = useState(1);
  const itemsPerPage = 6; // 每页显示的项目数量
  
  // 预览相关状态
  const [previewMedia, setPreviewMedia] = useState({
    url: '',
    type: '' // 'image' 或 'video'
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 加载OSS中的文件列表
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('http://116.62.54.160.140:5000/api/oss/files', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '获取文件列表失败');
      }
      
      let fileList = await res.json();
      
      // 按拍摄时间排序（最新的在前）
      fileList.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      
      // 分类文件（图片和视频）
      const images = [];
      const videos = [];
      
      fileList.forEach(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        
        // 常见图片格式
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
          images.push(file);
        } 
        // 常见视频格式
        else if (['mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'webm'].includes(ext)) {
          videos.push(file);
        }
      });
      
      setFiles({ images, videos });
      // 重置分页到第一页
      setImagePage(1);
      setVideoPage(1);
    } catch (err) {
      console.error('加载文件失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载所有分类图片
  const loadAllCheckImages = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 加载待检查图片
      const checkRes = await fetch('http://116.62.54.160.140:5000/api/oss/files?directory=check/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!checkRes.ok) {
        const errorData = await checkRes.json();
        throw new Error(errorData.error || '获取check目录文件失败');
      }
      
      let checkList = await checkRes.json();
      checkList.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      const checkImages = checkList.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
      });
      setCheckImages(checkImages);
      
      // 加载检查正确图片
      const validRes = await fetch('http://116.62.54.160.140:5000/api/oss/files?directory=check_1/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (validRes.ok) {
        let validList = await validRes.json();
        validList.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        const validImages = validList.filter(file => {
          const ext = file.name.split('.').pop().toLowerCase();
          return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
        });
        setValidImages(validImages);
      }
      
      // 加载检查错误图片
      const invalidRes = await fetch('http://116.62.54.160.140:5000/api/oss/files?directory=check_2/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (invalidRes.ok) {
        let invalidList = await invalidRes.json();
        invalidList.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        const invalidImages = invalidList.filter(file => {
          const ext = file.name.split('.').pop().toLowerCase();
          return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
        });
        setInvalidImages(invalidImages);
      }
      
      // 重置分页到第一页
      setCheckImagePage(1);
      setValidImagePage(1);
      setInvalidImagePage(1);
    } catch (err) {
      console.error('加载分类图片失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载文件列表
  useEffect(() => {
    loadFiles();
    loadAllCheckImages();
  }, []);

  // 获取当前页的图片
  const getCurrentPageImages = () => {
    const startIndex = (imagePage - 1) * itemsPerPage;
    return files.images.slice(startIndex, startIndex + itemsPerPage);
  };

  // 获取当前页的视频
  const getCurrentPageVideos = () => {
    const startIndex = (videoPage - 1) * itemsPerPage;
    return files.videos.slice(startIndex, startIndex + itemsPerPage);
  };

  // 获取当前页的待检查图片
  const getCurrentPageCheckImages = () => {
    const startIndex = (checkImagePage - 1) * itemsPerPage;
    return checkImages.slice(startIndex, startIndex + itemsPerPage);
  };

  // 获取当前页的正确图片
  const getCurrentPageValidImages = () => {
    const startIndex = (validImagePage - 1) * itemsPerPage;
    return validImages.slice(startIndex, startIndex + itemsPerPage);
  };

  // 获取当前页的错误图片
  const getCurrentPageInvalidImages = () => {
    const startIndex = (invalidImagePage - 1) * itemsPerPage;
    return invalidImages.slice(startIndex, startIndex + itemsPerPage);
  };

  // 计算总页数
  const totalImagePages = Math.ceil(files.images.length / itemsPerPage);
  const totalVideoPages = Math.ceil(files.videos.length / itemsPerPage);
  const totalCheckImagePages = Math.ceil(checkImages.length / itemsPerPage);
  const totalValidImagePages = Math.ceil(validImages.length / itemsPerPage);
  const totalInvalidImagePages = Math.ceil(invalidImages.length / itemsPerPage);

  // 格式化日期显示
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // 打开媒体预览
  const openMediaPreview = (url, type) => {
    setPreviewMedia({ url, type });
    setIsPreviewOpen(true);
    // 防止页面滚动
    document.body.style.overflow = 'hidden';
  };

  // 关闭媒体预览
  const closeMediaPreview = () => {
    setIsPreviewOpen(false);
    setPreviewMedia({ url: '', type: '' });
    // 恢复页面滚动
    document.body.style.overflow = 'auto';
  };

  // 单张图片AI检查
  const checkWithAI = async (imageUrl, fileName) => {
    try {
      setAiChecking(prev => ({ ...prev, [fileName]: true }));
      
      // 调用后端API
      const response = await axios.post(
        'http://116.62.54.160.140:5000/api/ai-vision-check',
        { imageUrls: [imageUrl] }, // 包装成数组
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // 获取第一个结果（因为我们只传了一张图片）
      const result = response.data.results[0];
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // 重新加载所有分类图片
      await loadAllCheckImages();
      
      return result.isAlarmValid;
    } catch (err) {
      console.error('AI图像识别失败:', err);
      setError('AI图像识别失败: ' + (err.response?.data?.error || err.message));
      return false;
    } finally {
      setAiChecking(prev => {
        const newState = { ...prev };
        delete newState[fileName];
        return newState;
      });
    }
  };

  // 批量AI检查当前页所有图片
  const batchCheckWithAI = async () => {
    try {
      setBatchChecking(true);
      
      // 获取当前页的所有图片
      const currentCheckImages = getCurrentPageCheckImages();
      
      if (currentCheckImages.length === 0) {
        setError('当前页没有待检查的图片');
        return;
      }
      
      // 准备数据
      const imageUrls = currentCheckImages.map(img => img.url);
      const fileNames = currentCheckImages.map(img => img.name);
      
      // 设置所有图片为检查中状态
      const checkingState = {};
      fileNames.forEach(name => {
        checkingState[name] = true;
      });
      setAiChecking(prev => ({ ...prev, ...checkingState }));
      
      // 调用后端API进行批量检查
      await axios.post(
        'http://116.62.54.160.140:5000/api/ai-vision-check',
        { imageUrls },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // 重新加载所有分类图片
      await loadAllCheckImages();
      
    } catch (err) {
      console.error('批量AI图像识别失败:', err);
      setError('批量AI图像识别失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setBatchChecking(false);
      // 清除当前页图片的检查状态
      setAiChecking(prev => {
        const newState = { ...prev };
        getCurrentPageCheckImages().forEach(img => {
          delete newState[img.name];
        });
        return newState;
      });
    }
  };

  // 渲染图片分区
  const renderImageSection = (title, images, page, setPage, totalPages, showCheckButton = false) => {
    return (
      <div className="files-section">
        <h2>{title}</h2>
        {images.length === 0 ? (
          <p>没有图片</p>
        ) : (
          <>
            <div className="files-horizontal">
              {images.map((file, index) => (
                <div 
                  key={index} 
                  className="file-card image-card"
                >
                  <img 
                    src={file.url} 
                    alt={file.name} 
                    className="file-thumbnail"
                    onClick={() => openMediaPreview(file.url, 'image')}
                    style={{ cursor: 'pointer' }}
                  />
                  <div className="file-info">
                    <div className="file-meta">
                      <span>拍摄时间: {formatDate(file.lastModified)}</span>
                    </div>
                    {showCheckButton && (
                      <button 
                        className="ai-check-btn"
                        onClick={() => checkWithAI(file.url, file.name)}
                        disabled={aiChecking[file.name] || batchChecking}
                      >
                        {aiChecking[file.name] ? '检查中...' : 'AI图像复查'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* 分页按钮 */}
            {totalPages > 1 && (
              <div className="pagination">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={page === i + 1 ? "active-page" : ""}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <h1>线路管理</h1>
        
        <div className="upload-section">
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-bar">
              <div 
                className="progress" 
                style={{width: `${uploadProgress}%`}}
              ></div>
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}
          {uploadProgress === 100 && (
            <div className="success-message">上传完成!</div>
          )}
        </div>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        {/* 待检查报警图片区域 */}
        <div className="files-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>待检查报警图片</h2>
            {checkImages.length > 0 && (
              <button 
                className="batch-check-btn"
                onClick={batchCheckWithAI}
                disabled={batchChecking}
              >
                {batchChecking ? '批量检查中...' : '批量AI复查'}
              </button>
            )}
          </div>
          
          {checkImages.length === 0 ? (
            <p>没有待检查的报警图片</p>
          ) : (
            <>
              <div className="files-horizontal">
                {getCurrentPageCheckImages().map((file, index) => (
                  <div 
                    key={index} 
                    className="file-card image-card"
                  >
                    <img 
                      src={file.url} 
                      alt={file.name} 
                      className="file-thumbnail"
                      onClick={() => openMediaPreview(file.url, 'image')}
                      style={{ cursor: 'pointer' }}
                    />
                    <div className="file-info">
                      <div className="file-meta">
                        <span>拍摄时间: {formatDate(file.lastModified)}</span>
                      </div>
                      <button 
                        className="ai-check-btn"
                        onClick={() => checkWithAI(file.url, file.name)}
                        disabled={aiChecking[file.name] || batchChecking}
                      >
                        {aiChecking[file.name] ? '检查中...' : 'AI图像复查'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* check图片分页按钮 */}
              {totalCheckImagePages > 1 && (
                <div className="pagination">
                  {[...Array(totalCheckImagePages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCheckImagePage(i + 1)}
                      className={checkImagePage === i + 1 ? "active-page" : ""}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* 检查正确图片区域 */}
        {renderImageSection(
          "检查正确", 
          getCurrentPageValidImages(), 
          validImagePage, 
          setValidImagePage,
          totalValidImagePages
        )}
        
        {/* 检查错误图片区域 */}
        {renderImageSection(
          "检查错误", 
          getCurrentPageInvalidImages(), 
          invalidImagePage, 
          setInvalidImagePage,
          totalInvalidImagePages
        )}
        
        {loading ? (
          <div className="loading">加载文件中...</div>
        ) : (
          <>
            <div className="files-section">
              <h2>图片文件</h2>
              {files.images.length === 0 ? (
                <p>没有图片文件</p>
              ) : (
                <>
                  <div className="files-horizontal">
                    {getCurrentPageImages().map((file, index) => (
                      <div key={index} className="file-card image-card">
                        <img 
                          src={file.url} 
                          alt={file.name} 
                          className="file-thumbnail"
                          onClick={() => openMediaPreview(file.url, 'image')}
                          style={{ cursor: 'pointer' }}
                        />
                        <div className="file-info">
                          <div className="file-meta">
                            <span>拍摄时间: {formatDate(file.lastModified)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 图片分页按钮 */}
                  {totalImagePages > 1 && (
                    <div className="pagination">
                      {[...Array(totalImagePages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImagePage(i + 1)}
                          className={imagePage === i + 1 ? "active-page" : ""}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="files-section">
              <h2>视频文件</h2>
              {files.videos.length === 0 ? (
                <p>没有视频文件</p>
              ) : (
                <>
                  <div className="files-horizontal">
                    {getCurrentPageVideos().map((file, index) => (
                      <div key={index} className="file-card video-card">
                        <video 
                          src={file.url} 
                          className="file-thumbnail"
                          controls
                          preload="metadata"
                          onClick={() => openMediaPreview(file.url, 'video')}
                          style={{ cursor: 'pointer' }}
                        />
                        <div className="file-info">
                          <div className="file-meta">
                            <span>拍摄时间: {formatDate(file.lastModified)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 视频分页按钮 */}
                  {totalVideoPages > 1 && (
                    <div className="pagination">
                      {[...Array(totalVideoPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setVideoPage(i + 1)}
                          className={videoPage === i + 1 ? "active-page" : ""}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* 媒体预览模态框 */}
      {isPreviewOpen && (
        <div className="media-preview-modal" onClick={closeMediaPreview}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-preview" onClick={closeMediaPreview}>×</button>
            
            {/* 根据类型显示图片或视频 */}
            {previewMedia.type === 'image' && (
              <img 
                src={previewMedia.url} 
                alt="预览图" 
                className="preview-media" 
              />
            )}
            
            {previewMedia.type === 'video' && (
              <video 
                src={previewMedia.url} 
                className="preview-media"
                controls
                autoPlay
                playsInline
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PictureAndAICheck;