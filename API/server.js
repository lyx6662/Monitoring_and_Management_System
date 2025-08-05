const express = require('express');
const cors = require('cors');
const pool = require('./db'); // 导入数据库连接

// 创建Express应用
const app = express();

// 中间件配置
app.use(cors()); // 允许跨域
app.use(express.json()); // 解析JSON请求体

// 健康检查端点
app.get('/', (req, res) => {
  res.send('设备管理系统API运行中');
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