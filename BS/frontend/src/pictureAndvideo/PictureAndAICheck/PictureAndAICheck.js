import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Pagination,
  styled
} from '@mui/material';
import {
  Close,
  CheckCircle,
  Cancel,
  Visibility
} from '@mui/icons-material';
import Sidebar from '../SidebarVideo/SidebarVideo';
import { useThemeContext } from '../../ThemeContext/ThemeContext';

// 添加样式组件
const MainContent = styled(Box)(({ theme }) => ({
  marginLeft: 20,
  padding: theme.spacing(3),
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  width: 'calc(70% - 60px)',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  borderRadius: '12px',
  margin: theme.spacing(2),
}));

const SectionContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
  borderRadius: '16px',
  border: `1px solid ${theme.palette.divider}`,
}));

const ImageCard = styled(Card)(({ theme }) => ({
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.15)',
  },
  // 限制卡片最大宽度
  maxWidth: 300,
  margin: '0 auto', // 居中显示
}));

// 图片容器样式 - 固定高度，宽度适应卡片
const StyledCardMedia = styled(CardMedia)(({ theme }) => ({
  height: '180px', // 适当减小高度
  width: '100%',   // 宽度适应卡片
  objectFit: 'cover',
}));

const PictureAndAICheck = () => {
  const { theme } = useThemeContext();
  const [validImages, setValidImages] = useState([]);
  const [invalidImages, setInvalidImages] = useState([]);
  const [validImagePage, setValidImagePage] = useState(1);
  const [invalidImagePage, setInvalidImagePage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewMedia, setPreviewMedia] = useState({
    url: '',
    type: ''
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 增加每页显示数量，因为卡片变小了
  const itemsPerPage = 6;

  // 格式化日期显示
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // 加载检查正确图片
  const loadValidImages = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('http://localhost:5000/api/oss/files?directory=check_1/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '获取正确图片失败');
      }

      let validList = await res.json();
      validList.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      const validImages = validList.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
      });
      setValidImages(validImages);

    } catch (err) {
      console.error('加载正确图片失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载检查错误图片
  const loadInvalidImages = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('http://localhost:5000/api/oss/files?directory=check_2/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '获取错误图片失败');
      }

      let invalidList = await res.json();
      invalidList.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      const invalidImages = invalidList.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
      });
      setInvalidImages(invalidImages);

    } catch (err) {
      console.error('加载错误图片失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载图片
  useEffect(() => {
    loadValidImages();
    loadInvalidImages();
  }, []);

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
  const totalValidImagePages = Math.ceil(validImages.length / itemsPerPage);
  const totalInvalidImagePages = Math.ceil(invalidImages.length / itemsPerPage);

  // 打开媒体预览
const openMediaPreview = (url, type) => {
  setPreviewMedia({ url, type });
  setIsPreviewOpen(true);
  // 同时禁用html和body的滚动
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
};

  // 关闭媒体预览
const closeMediaPreview = () => {
  setIsPreviewOpen(false);
  setPreviewMedia({ url: '', type: '' });
  // 同时恢复html和body的滚动
  document.documentElement.style.overflow = 'auto';
  document.body.style.overflow = 'auto';
};

  // 渲染图片区域
  const renderImageSection = (title, images, page, totalPages, setPage, isValid = true) => {
    const currentImages = isValid ? getCurrentPageValidImages() : getCurrentPageInvalidImages();

    return (
      <SectionContainer elevation={3}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          {isValid ? (
            <CheckCircle color="success" sx={{ mr: 1, fontSize: 32 }} />
          ) : (
            <Cancel color="error" sx={{ mr: 1, fontSize: 32 }} />
          )}
          <Typography variant="h5" component="h2">
            {title}
          </Typography>
          <Chip
            label={`共 ${images.length} 张`}
            color={isValid ? "success" : "error"}
            variant="outlined"
            sx={{ ml: 2 }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={200}>
            <CircularProgress />
          </Box>
        ) : currentImages.length === 0 ? (
          <Typography variant="body1" sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            没有{isValid ? '正确' : '错误'}图片
          </Typography>
        ) : (
          <>
            {/* 调整网格布局，让卡片在不同屏幕尺寸下排列更紧凑 */}
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              {currentImages.map((file, index) => (
                // 调整网格项的尺寸，使卡片更小
                <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
                  <ImageCard>
                    <StyledCardMedia
                      component="img"
                      image={file.url}
                      alt={file.name}
                      onClick={() => openMediaPreview(file.url, 'image')}
                      sx={{ cursor: 'pointer' }}
                    />
                    <CardContent sx={{ p: 1.5 }}> {/* 减小内边距 */}
                      <Typography variant="caption" color="text.secondary"> {/* 使用更小的文字 */}
                        拍摄时间: {formatDate(file.lastModified)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        文件名: {file.name}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 1, justifyContent: 'center' }}>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => openMediaPreview(file.url, 'image')}
                        sx={{ fontSize: 12 }}
                      >
                        查看大图
                      </Button>
                    </CardActions>
                  </ImageCard>
                </Grid>
              ))}
            </Grid>

            {/* 分页 */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(event, value) => setPage(value)}
                  color={isValid ? "success" : "error"}
                />
              </Box>
            )}
          </>
        )}
      </SectionContainer>
    );
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <MainContent component="main">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          AI检测结果
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 检查正确图片区域 */}
        {renderImageSection(
          "检查正确",
          validImages,
          validImagePage,
          totalValidImagePages,
          setValidImagePage,
          true
        )}

        {/* 检查错误图片区域 */}
        {renderImageSection(
          "检查错误",
          invalidImages,
          invalidImagePage,
          totalInvalidImagePages,
          setInvalidImagePage,
          false
        )}

        {/* 媒体预览模态框 */}
        <Dialog
          open={isPreviewOpen}
          onClose={closeMediaPreview}
          maxWidth="lg"
          fullWidth
        >
          <DialogContent sx={{ position: 'relative', p: 0 }}>
            <IconButton
              aria-label="close"
              onClick={closeMediaPreview}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                zIndex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <Close />
            </IconButton>
            {previewMedia.type === 'image' && (
              <img
                src={previewMedia.url}
                alt="预览图"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            )}
          </DialogContent>
        </Dialog>
      </MainContent>
    </Box>
  );
};

export default PictureAndAICheck;