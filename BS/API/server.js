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
  const { username, password } = req.body;
  
  // 验证输入
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  try {
    // 检查用户名是否已存在
    const [existingUsers] = await pool.query(
      'SELECT id FROM user WHERE username = ?', 
      [username]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 生成盐并哈希密码
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 创建新用户
    const [result] = await pool.query(
      'INSERT INTO user (username, password_hash, salt) VALUES (?, ?, ?)',
      [username, passwordHash, salt]
    );

    // 生成JWT Token
    const token = jwt.sign(
      { userId: result.insertId },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '1h' }
    );

    res.status(201).json({ token });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  try {
    // 查找用户
    const [users] = await pool.query(
      'SELECT id, username, password_hash, salt FROM user WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const user = users[0];
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(
      password, 
      user.password_hash
    );
    
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成JWT Token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取所有设备
app.get('/devices', async (req, res) => {
  try {
    const [devices] = await pool.query('SELECT * FROM devices ORDER BY id');
    res.json(devices);
  } catch (err) {
    console.error('获取设备列表失败:', err);
    res.status(500).json({ error: '获取设备列表失败' });
  }
});

// 添加新设备
app.post('/devices', async (req, res) => {
  const { id, name, date } = req.body;
  
  // 验证必填字段
  if (!id || !name || !date) {
    return res.status(400).json({ 
      error: '缺少必要字段: id, name, date' 
    });
  }

  try {
    await pool.query(
      'INSERT INTO devices (id, name, date) VALUES (?, ?, ?)',
      [id, name, date]
    );
    res.status(201).json({ message: '设备添加成功' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: '设备ID已存在' });
    } else {
      console.error('添加设备失败:', err);
      res.status(500).json({ error: '添加设备失败' });
    }
  }
});

// 更新设备信息
app.put('/devices/:id', async (req, res) => {
  const deviceId = req.params.id;
  const { name, date } = req.body;
  
  if (!name || !date) {
    return res.status(400).json({ error: '缺少name或date字段' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE devices SET name = ?, date = ? WHERE id = ?',
      [name, date, deviceId]
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

// 删除设备
app.delete('/devices/:id', async (req, res) => {
  const deviceId = req.params.id;

  try {
    const [result] = await pool.query(
      'DELETE FROM devices WHERE id = ?',
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