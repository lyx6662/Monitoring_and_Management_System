const express = require('express');
const cors = require('cors');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const https = require('https');
const fs = require('fs');
const axios = require('axios');
const OSS = require('ali-oss');
const { log } = require('console');




require('dotenv').config();

// 创建OSS客户端（放在路由定义之前）
const ossClient = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
  secure: true // 强制HTTPS
});

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});



//获取ai聊天结果
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    // 验证输入消息长度
    const lastUserMessage = messages.find(m => m.role === 'user');
    if (lastUserMessage && lastUserMessage.content.length > 500) {
      return res.status(400).json({ error: '问题长度不能超过500字符' });
    }

    // 添加系统消息作为第一条消息（如果不存在）
    const formattedMessages = messages[0]?.role === 'system' 
      ? messages 
      : [
          { 
            role: 'system', 
            content: '你是人工智能助手。请遵守以下规则：\n' +
                    '1. 回答长度不超过1000字符\n' +
                    '2. 不讨论政治、暴力、色情等敏感话题\n' +
                    '3. 不提供任何违法或有害信息\n' +
                    '4. 保持专业和礼貌的态度\n' +
                    '5. 如果无法回答，请诚实地告知用户\n' +
                    '6. 只回答与电气工程相关的问题，避免其他领域的讨论。\n' +
                    '7. 可以回答有关于浙江省衢州市联源电气科技有限公司的相关问题\n'

          },
          ...messages
        ];

    const response = await axios.post(
      process.env.AI_API_URL,
      {
        model: process.env.AI_MODEL,
        messages: formattedMessages,
        max_tokens: 1000 // 限制AI生成的token数量（约等于字符数）
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 获取AI响应并处理
    let aiResponse = response.data.choices?.[0]?.message?.content || "无响应";
    
    // 后端二次验证和截断
    if (aiResponse.length > 500) {
      aiResponse = aiResponse.substring(0, 500) + '...';
    }
    
    // 过滤敏感内容（简单示例）
    const forbiddenWords = ['暴力', '色情', '政治敏感词']; // 替换为实际需要过滤的词
    forbiddenWords.forEach(word => {
      aiResponse = aiResponse.replace(new RegExp(word, 'gi'), '***');
    });

    res.json({
      ...response.data,
      choices: [{
        ...response.data.choices[0],
        message: {
          ...response.data.choices[0].message,
          content: aiResponse
        }
      }]
    });
  } catch (error) {
    console.error('AI接口错误:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'AI服务调用失败',
      details: error.response?.data || error.message
    });
  }
});

//获取二维码
app.get('/api/qrcode', (req, res) => {
  https.get('https://api.2dcode.biz/v1/create-qr-code?data=Example', (apiRes) => {
    apiRes.pipe(res); // 将二维码图片流直接转发给前端
  });
});

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  console.log('注册请求收到:', req.body);
  const { username, account, password, email, address, phone } = req.body;

  // 验证输入
  if (!username || !account || !password || !phone) {
    return res.status(400).json({ error: '必填字段不能为空' });
  }

  try {
    // 检查用户名或账号是否已存在
    const [existingUsers] = await pool.query(
      'SELECT user_id FROM users WHERE username = ? OR account = ? OR phone = ?',
      [username, account, phone]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: '用户名、账号或手机号已存在' });
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建新用户
    const [result] = await pool.query(
      'INSERT INTO users (username, account, password, email, address, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [username, account, passwordHash, email, address, phone]
    );

    // 生成JWT Token
    const token = jwt.sign(
      { userId: result.insertId },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '1h' }
    );

    res.status(201).json({
      token,
      user: {
        userId: result.insertId,
        username,
        account,
        email,
        phone
      }
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    return res.status(400).json({ error: '账号和密码不能为空' });
  }

  try {
    // 查找用户
    const [users] = await pool.query(
      'SELECT user_id, username, account, password FROM users WHERE account = ?',
      [account]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    const user = users[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    // 生成JWT Token
    const token = jwt.sign(
      { userId: user.user_id },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '3d' }
    );

    res.json({
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        account: user.account
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '登录失败' });
  }
});


// 获取验证码接口
app.get('/api/captcha', async (req, res) => {
  try {
    const response = await axios.get('http://shanhe.kim/api/za/yzmv1.php');
    
    // 将验证码答案存储在服务器内存中（生产环境应该使用Redis等）
    const captchaStore = req.app.get('captchaStore') || {};
    captchaStore[response.data.img] = response.data.answer;
    req.app.set('captchaStore', captchaStore);
    
    res.json({
      code: 200,
      imgUrl: response.data.img,
      codeText: response.data.codeText
    });
  } catch (error) {
    console.error('获取验证码失败:', error);
    res.status(500).json({ error: '获取验证码失败' });
  }
});

// 验证验证码接口
app.post('/api/verify-captcha', (req, res) => {
  const { imgUrl, userAnswer } = req.body;
  const captchaStore = req.app.get('captchaStore') || {};
  
  if (!imgUrl || !userAnswer) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  const correctAnswer = captchaStore[imgUrl];
  
  if (!correctAnswer) {
    return res.status(400).json({ error: '验证码已过期' });
  }
  
  if (userAnswer.toString() === correctAnswer.toString()) {
    // 验证成功后移除验证码
    delete captchaStore[imgUrl];
    req.app.set('captchaStore', captchaStore);
    
    return res.json({ success: true });
  } else {
    return res.status(400).json({ error: '验证码错误' });
  }
});


// 获取所有设备信息
app.get('/api/devices', async (req, res) => {
  try {
    const [devices] = await pool.query(`
      SELECT d.device_id, d.device_name, d.device_code, d.push_url, d.pull_url, 
             d.province, d.city, d.location, d.status, d.install_time,
             u.user_id, u.username, u.account
      FROM devices d
      JOIN users u ON d.user_id = u.user_id
    `);

    res.json(devices);
  } catch (err) {
    console.error('获取设备列表失败:', err);
    res.status(500).json({ error: '获取设备列表失败' });
  }
});

// 获取播流地址
app.post('/api/devices/:id/stream-url', async (req, res) => {
  const deviceId = req.params.id;
  const { device_code } = req.body;

  try {
    const response = await axios.post(
      `http://47.104.136.74:20443/v1/device/start-push-rtmp-stream?device-code=${device_code}&duration=6000&chann=1&codec=0`
    );

    if (response.data.code === 0) {
      res.json({
        message: '播流地址获取成功',
        streamUrl: response.data.data
      });
    } else {
      throw new Error(response.data.message || "获取播流地址失败");
    }
  } catch (err) {
    console.error('获取播流地址失败:', err);
    res.status(500).json({ error: '获取播流地址失败: ' + (err.response?.data?.message || err.message) });
  }
});

// 关闭播流接口
app.post('/api/devices/stop-stream', async (req, res) => {
  const { deviceCode } = req.body;

  if (!deviceCode) {
    return res.status(400).json({ error: '设备代码不能为空' });
  }

  try {
    const response = await axios.post(
      `http://47.104.136.74:20443/v1/device/stop-push-rtmp-stream?device-code=${deviceCode}`
    );

    if (response.data.code === 0) {
      res.json({
        success: true,
        message: '播流已成功关闭'
      });
    } else {
      res.status(500).json({
        error: '关闭播流失败: ' + (response.data.message || '未知错误')
      });
    }
  } catch (error) {
    console.error('关闭播流出错:', error);
    res.status(500).json({
      error: '关闭播流失败: ' + (error.response?.data?.error || error.message)
    });
  }
});

// 添加新设备
app.post('/api/devices', async (req, res) => {
  const {
    device_name,
    device_code,  // 新增字段
    push_url,
    pull_url,
    province,
    city,
    location,
    user_id,
    install_time
  } = req.body;

  // 验证必填字段（device_code 是可选的，因为它是 INT 且允许 NULL）
  if (!device_name || !push_url || !pull_url || !province || !city || !location || !user_id) {
    return res.status(400).json({
      error: '缺少必要字段'
    });
  }

  try {
    // 检查用户是否存在
    const [users] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(400).json({ error: '用户不存在' });
    }

    // 检查URL是否已存在
    const [existingDevices] = await pool.query(
      'SELECT device_id FROM devices WHERE push_url = ? OR pull_url = ?',
      [push_url, pull_url]
    );
    if (existingDevices.length > 0) {
      return res.status(400).json({ error: '推流或拉流地址已存在' });
    }

    const [result] = await pool.query(
      `INSERT INTO devices 
       (device_name, device_code, push_url, pull_url, province, city, location, user_id, install_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        device_name,
        device_code || null,  // 如果未提供 device_code，设为 NULL
        push_url,
        pull_url,
        province,
        city,
        location,
        user_id,
        install_time || new Date()  // 如果没有提供时间，使用当前时间
      ]
    );

    res.status(201).json({
      message: '设备添加成功',
      deviceId: result.insertId
    });
  } catch (err) {
    console.error('添加设备失败:', err);
    res.status(500).json({ error: '添加设备失败' });
  }
});

// 更新设备信息
app.put('/api/devices/:id', async (req, res) => {
  const deviceId = req.params.id;
  const {
    device_name,
    device_code,
    province,
    city,
    location,
    status
  } = req.body;

  if (!device_name || !province || !city || !location || status === undefined) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE devices SET 
        device_name = ?, 
        device_code = ?,
        province = ?, 
        city = ?, 
        location = ?, 
        status = ?
       WHERE device_id = ?`,
      [
        device_name,
        device_code || null,
        province,
        city,
        location,
        status,
        deviceId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '设备不存在' });
    }

    res.json({ message: '设备更新成功' });
  } catch (err) {
    console.error('更新设备失败:', err);
    res.status(500).json({ error: '更新设备失败' });
  }
});

// 更新设备播流地址
app.put('/api/devices/:id/stream-url', async (req, res) => {
  const deviceId = req.params.id;
  const { pull_url } = req.body;

  if (!pull_url) {
    return res.status(400).json({ error: '缺少播流地址' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE devices SET pull_url = ? WHERE device_id = ?`,
      [pull_url, deviceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '设备不存在' });
    }

    res.json({ message: '播流地址更新成功', pull_url });
  } catch (err) {
    console.error('更新播流地址失败:', err);
    res.status(500).json({ error: '更新播流地址失败' });
  }
});

// 删除设备
app.delete('/api/devices/:id', async (req, res) => {
  const deviceId = req.params.id;

  try {
    const [result] = await pool.query(
      'DELETE FROM devices WHERE device_id = ?',
      [deviceId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '设备不存在' });
    }

    res.json({ message: '设备删除成功' });
  } catch (err) {
    console.error('删除设备失败:', err);
    res.status(500).json({ error: '删除设备失败' });
  }
});

// 获取设备状态
app.get('/api/devices/:id/status', async (req, res) => {
  const deviceId = req.params.id;
  const { limit = 10 } = req.query;

  try {
    const [statusRecords] = await pool.query(
      `SELECT * FROM device_status 
       WHERE device_id = ? 
       ORDER BY record_time DESC 
       LIMIT ?`,
      [deviceId, parseInt(limit)]
    );

    res.json(statusRecords);
  } catch (err) {
    console.error('获取设备状态失败:', err);
    res.status(500).json({ error: '获取设备状态失败' });
  }
});

// 添加设备状态记录
app.post('/api/devices/:id/status', async (req, res) => {
  const deviceId = req.params.id;
  const {
    danger_level,
    danger_msg,
    image_url,
    video_url
  } = req.body;

  try {
    // 检查设备是否存在
    const [devices] = await pool.query(
      'SELECT device_id FROM devices WHERE device_id = ?',
      [deviceId]
    );
    if (devices.length === 0) {
      return res.status(404).json({ error: '设备不存在' });
    }

    const [result] = await pool.query(
      `INSERT INTO device_status 
       (device_id, danger_level, danger_msg, image_url, video_url, record_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        danger_level || 0,
        danger_msg,
        image_url,
        video_url,
        new Date()  // 记录当前时间
      ]
    );

    res.status(201).json({
      message: '状态记录添加成功',
      statusId: result.insertId
    });
  } catch (err) {
    console.error('添加状态记录失败:', err);
    res.status(500).json({ error: '添加状态记录失败' });
  }
});

// 更新设备状态处理标记
app.patch('/api/status/:id/processed', async (req, res) => {
  const statusId = req.params.id;

  try {
    const [result] = await pool.query(
      'UPDATE device_status SET is_processed = 1 WHERE status_id = ?',
      [statusId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '状态记录不存在' });
    }

    res.json({ message: '状态标记为已处理' });
  } catch (err) {
    console.error('更新状态记录失败:', err);
    res.status(500).json({ error: '更新状态记录失败' });
  }
});

// 获取用户个人信息
app.get('/api/user/profile', async (req, res) => {
  try {
    // 从Authorization头部获取token
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    // 验证并解码token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const userId = decoded.userId;

    // 查询用户信息
    const [users] = await pool.query(
      'SELECT user_id, username, account, email, address, phone, create_time FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(users[0]);
  } catch (err) {
    console.error('获取用户信息失败:', err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的令牌' });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期' });
    }
    
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 修改密码
app.post('/api/user/change-password', async (req, res) => {
  try {
    // 验证token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const userId = decoded.userId;
    const { currentPassword, newPassword } = req.body;

    // 验证输入
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '当前密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为6位' });
    }

    // 获取当前用户密码
    const [users] = await pool.query(
      'SELECT password FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证当前密码
    const isValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValid) {
      return res.status(401).json({ error: '当前密码不正确' });
    }

    // 更新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [newPasswordHash, userId]
    );

    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码失败:', err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的令牌' });
    }
    
    res.status(500).json({ error: '修改密码失败' });
  }
});

// 获取地图配置信息
app.get('/api/map-config', (req, res) => {
  try {
    res.json({
      amapKey: process.env.AMAP_WEB_KEY,
      plugins: 'AMap.ControlBar,AMap.ToolBar'
    });
  } catch (err) {
    console.error('获取地图配置失败:', err);
    res.status(500).json({ error: '获取地图配置失败' });
  }
});

// 修改后的OSS上传接口
app.post('/api/oss/upload', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    
    // 生成唯一的文件名
    const objectName = `uploads/${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
    
    // 生成带签名的上传URL
    const signedUrl = ossClient.signatureUrl(objectName, {
      method: 'PUT',
      'Content-Type': fileType,
      expires: 3600 // 1小时有效
    });
    
    // 生成访问URL
    const accessUrl = `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${objectName}`;
    
    res.json({
      signedUrl,
      accessUrl
    });
  } catch (err) {
    console.error('OSS上传错误:', err);
    res.status(500).json({ 
      error: '文件上传配置失败',
      details: err.message 
    });
  }
});

// 替换现有的两个 /api/oss/files 路由为以下单个路由
app.get('/api/oss/files', async (req, res) => {
  try {
    // 获取目录参数，默认值为 'uploads/'
    let { directory = 'uploads/' } = req.query;
    
    // 确保目录以斜杠结尾
    if (!directory.endsWith('/')) {
      directory += '/';
    }
    
    // 列出指定目录下的所有文件
    const result = await ossClient.list({
      prefix: directory,
      delimiter: '/',
      'max-keys': 1000 // 增加返回数量限制
    });

    // 提取文件信息
    const files = (result.objects || []).map(file => ({
      name: file.name.replace(directory, ''), // 移除目录前缀
      url: `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${file.name}`,
      lastModified: file.lastModified,
      size: file.size
    }));

    res.json(files);
  } catch (err) {
    console.error('获取OSS文件列表错误:', err);
    res.status(500).json({
      error: '获取文件列表失败',
      details: err.message
    });
  }
});

// 修改后的ai视觉检查接口，支持批量处理并移动文件
app.post('/api/ai-vision-check', async (req, res) => {
  try {
    const { imageUrls } = req.body; // 改为接收图片URL数组

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: '缺少图片URL或URL格式不正确' });
    }

    // 批量调用AI模型
    const results = await Promise.all(imageUrls.map(async (imageUrl) => {
      try {
        // 调用火山引擎的视觉模型
        const response = await axios.post(
          'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
          {
            model: "doubao-1-5-thinking-vision-pro-250428", // 视觉模型
            messages: [
              {
                "content": [
                  {
                    "image_url": {
                      "url": imageUrl
                    },
                    "type": "image_url"
                  },
                  {
                    "text": "这张图片是否判断正确？请只回答'是'或'否'。",
                    "type": "text"
                  }
                ],
                "role": "user"
              }
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.AI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const aiResponse = response.data.choices?.[0]?.message?.content || "";
        
        // 提取回答，并转换为布尔值
        const isAlarmValid = aiResponse.trim().toLowerCase() === "是";

        // 从图片URL中提取文件名（check目录下的文件名）
        const urlParts = imageUrl.split('/');
        const originalFileName = `check/${urlParts[urlParts.length - 1]}`;
        
        // 确定目标文件夹
        const targetFolder = isAlarmValid ? 'check_1/' : 'check_2/';
        const targetFileName = `${targetFolder}${urlParts[urlParts.length - 1]}`;
        
        try {
          // 复制文件到新位置
          await ossClient.copy(targetFileName, originalFileName);
          
          // 删除原文件
          await ossClient.delete(originalFileName);
          
          console.log(`[移动文件] 从 ${originalFileName} 移动到 ${targetFileName}`);
          
          return { 
            imageUrl, 
            isAlarmValid,
            newUrl: `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${targetFileName}`
          };
        } catch (moveError) {
          console.error('移动文件失败:', moveError);
          return { 
            imageUrl, 
            isAlarmValid,
            error: '移动文件失败'
          };
        }
      } catch (error) {
        console.error(`处理图片 ${imageUrl} 时出错:`, error);
        return { 
          imageUrl, 
          isAlarmValid: false,
          error: error.message 
        };
      }
    }));

    res.json({ results });

  } catch (error) {
    console.error('批量AI图像识别失败:', error);
    res.status(500).json({ 
      error: '批量AI图像识别失败',
      details: error.message
    });
  }
});





// 获取用户个性化设置
app.get('/api/user/settings', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未提供令牌' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const userId = decoded.userId;

    // 查找用户设置，若无则返回默认值
    const [settings] = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // 返回默认设置（与数据库默认值一致）
      return res.json({
        background_color: '#f5f7fa',
        sidebar_color: '#f8f9fa',
        font_family: 'Arial, sans-serif',
        video_resolution: '720p',
        theme_mode: 'light'
      });
    }

    res.json(settings[0]);
  } catch (err) {
    console.error('获取设置失败:', err);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 更新用户个性化设置
app.put('/api/user/settings', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: '未提供令牌' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const userId = decoded.userId;
    const { background_color, sidebar_color, font_family, video_resolution, theme_mode } = req.body;

    // 检查是否已有设置，有则更新，无则插入
    const [existing] = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      // 更新现有设置
      await pool.query(
        `UPDATE user_settings SET 
         background_color = ?, 
         sidebar_color = ?, 
         font_family = ?, 
         video_resolution = ?, 
         theme_mode = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [background_color, sidebar_color, font_family, video_resolution, theme_mode, userId]
      );
    } else {
      // 插入新设置
      await pool.query(
        `INSERT INTO user_settings 
         (user_id, background_color, sidebar_color, font_family, video_resolution, theme_mode)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, background_color, sidebar_color, font_family, video_resolution, theme_mode]
      );
    }

    res.json({ success: true, message: '设置已保存' });
  } catch (err) {
    console.error('更新设置失败:', err);
    res.status(500).json({ error: '更新设置失败' });
  }
});



// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('服务器内部错误');
});





// 启动服务器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});