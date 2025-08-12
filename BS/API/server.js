const express = require('express');
const cors = require('cors');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const https = require('https');
const fs = require('fs');
const axios = require('axios');




require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// 启动设备RTMP推流的路由
app.post('/api/start-stream', async (req, res) => {
  try {
    const deviceCode = '865522078460315'; // 固定设备编码

    // 调用设备推流接口
    const streamUrl = await startDeviceStreaming(deviceCode);

    // 成功响应 - 返回播放地址
    res.status(200).json({
      code: 0,
      message: '推流命令已发送',
      playbackUrl: 'https://play.zhijingwuxian.com/quzhou/0811.flv?auth_key=1754895912-0-0-6ca1c0454250f00a16d27c11af470c02',
      streamUrl: streamUrl
    });

    console.log('推流命令已发送，设备推流地址:', streamUrl);
    console.log('请使用以下地址播放:', 'https://play.zhijingwuxian.com/quzhou/0811.flv?auth_key=1754895912-0-0-6ca1c0454250f00a16d27c11af470c02');

  } catch (error) {
    // 错误处理
    console.error('推流请求失败:', error.message);
    res.status(500).json({
      code: -1,
      message: `推流失败: ${error.message}`
    });
  }
});

// 设备推流函数
async function startDeviceStreaming(deviceCode) {
  const url = 'http://127.0.0.1:8080/v1/device/start-push-rtmp-stream';

  // 请求参数
  const params = {
    'device-code': deviceCode,
    'duration': 300,    // 固定300秒
    'chann': 2          // 固定通道号2
  };

  const response = await axios.post(url, null, { params });

  if (response.data.code === 0) {
    return response.data.data; // 返回推流地址
  } else {
    throw new Error(`设备返回错误 ${response.data.code}: ${response.data.message}`);
  }
}

//获取ai聊天结果
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await axios.post(
      'https://api.suanli.cn/v1/chat/completions',
      {
        model: "free:QwQ-32B",
        messages
      },
      {
        headers: {
          'Authorization': 'Bearer sk-W0rpStc95T7JVYVwDYc29IyirjtpPPby6SozFMQr17m8KWeo',
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('AI接口错误:', error.response?.data || error.message);
    res.status(500).json({ error: 'AI服务调用失败' });
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
      { expiresIn: '1h' }
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