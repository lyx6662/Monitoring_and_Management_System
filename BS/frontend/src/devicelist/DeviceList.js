import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';

// 初始表单状态
const initialDeviceState = {
  device_name: "",
  device_code: "",
  province: "",
  city: "",
  location: "",
  user_id: "",
  install_time: new Date().toISOString().slice(0, 16) // 默认当前时间
};

// ========== 封装的 API 方法 ========== //
const fetchDeviceList = async (setDevices, setError, setLoading) => {
  try {
    const response = await axios.get("http://localhost:5000/api/devices");
    // 处理API返回数据中的null/undefined值
    const processedDevices = response.data.map(device => ({
      ...device,
      device_code: device.device_code || "",
      install_time: device.install_time || new Date().toISOString()
    }));
    setDevices(processedDevices);
  } catch (err) {
    setError("无法加载设备列表: " + (err.response?.data?.error || err.message));
    console.error("获取设备失败:", err);
  } finally {
    setLoading(false);
  }
};

const addNewDevice = async (newDevice, setSuccess, setError, fetchDevices) => {
  try {
    const push_url = `没有`;
    const pull_url = `点击按钮获取`;

    const response = await axios.post("http://localhost:5000/api/devices", {
      ...newDevice,
      push_url,
      pull_url,
      device_code: newDevice.device_code || null
    });

    setSuccess(response.data.message);
    fetchDevices();
    return initialDeviceState; // 返回初始状态
  } catch (err) {
    setError(err.response?.data.error || "添加设备失败");
    return null;
  }
};

const updateDevice = async (deviceId, deviceData, setSuccess, setError, fetchDevices) => {
  try {
    await axios.put(`http://localhost:5000/api/devices/${deviceId}`, {
      ...deviceData,
      device_code: deviceData.device_code || null
    });
    setSuccess("设备更新成功");
    fetchDevices();
  } catch (err) {
    setError("更新失败: " + (err.response?.data?.error || err.message));
  }
};

// ========== DeviceList 组件 ========== //
const DeviceList = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingDevice, setEditingDevice] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [newDevice, setNewDevice] = useState(initialDeviceState);

  // 从 token 获取当前用户 ID
  const getCurrentUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return null;
    }

    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        navigate('/login');
        return null;
      }
      return decoded.userId || decoded.id;
    } catch (e) {
      console.error('解析 token 失败:', e);
      localStorage.removeItem('token');
      navigate('/login');
      return null;
    }
  };

  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      setCurrentUserId(userId);
      setNewDevice(prev => ({ ...prev, user_id: userId }));
      fetchDeviceList(setDevices, setError, setLoading);
    }
  }, []);

  const fetchDevices = () => {
    fetchDeviceList(setDevices, setError, setLoading);
  };

  const addDevice = async (e) => {
    e.preventDefault();
    const clearedForm = await addNewDevice(newDevice, setSuccess, setError, fetchDevices);
    if (clearedForm) setNewDevice(clearedForm);
  };

  const startEdit = (device) => {
    setEditingDevice({
      ...device,
      device_code: device.device_code || "",
      install_time: device.install_time
        ? device.install_time.slice(0, 16)
        : new Date().toISOString().slice(0, 16)
    });
  };

  const saveEdit = async () => {
    await updateDevice(editingDevice.device_id, editingDevice, setSuccess, setError, fetchDevices);
    setEditingDevice(null);
  };

  const handleDelete = async (device_id) => {
    try {
      await axios.delete(`http://localhost:5000/api/devices/${device_id}`);
      setSuccess("设备删除成功");
      setDevices(devices.filter(device => device.device_id !== device_id));
    } catch (err) {
      setError("删除失败: " + (err.response?.data?.error || err.message));
    }
  };

  const fetchStreamUrl = async (deviceId, deviceCode) => {
    try {
      setLoading(true);

      // 1. 首先获取播流地址
      const streamResponse = await axios.post(
        `http://localhost:5000/api/devices/${deviceId}/stream-url`,
        { device_code: deviceCode }
      );

      if (streamResponse.data.streamUrl) {
        // 2. 然后更新数据库中的播流地址
        const updateResponse = await axios.put(
          `http://localhost:5000/api/devices/${deviceId}/stream-url`,
          { pull_url: streamResponse.data.streamUrl }
        );

        // 3. 更新前端状态
        setDevices(devices.map(device =>
          device.device_id === deviceId
            ? { ...device, pull_url: streamResponse.data.streamUrl }
            : device
        ));

        setSuccess("播流地址获取并更新成功: " + streamResponse.data.streamUrl);
      } else {
        setError("未能获取有效的播流地址");
      }
    } catch (err) {
      setError("获取或更新播流地址失败: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 新增：调用关闭播流接口的函数
  const handleStopStream = async (deviceCode, deviceId) => {
    if (!deviceCode) {
      setError("设备代码不能为空，无法关闭播流");
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:5000/api/devices/stop-stream",
        { deviceCode }
      );
      if (response.data.success) {
        // 关闭播流成功后，更新数据库中的播流地址
        await axios.put(
          `http://localhost:5000/api/devices/${deviceId}/stream-url`,
          { pull_url: "播流地址还没开放" }
        );
        setSuccess("播流已成功关闭");
        fetchDevices();
      } else {
        setError("关闭播流失败: " + (response.data.error || "未知错误"));
      }
    } catch (err) {
      setError("关闭播流出错: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!currentUserId) {
    return null;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <h1>设备管理</h1>

        {/* 添加设备表单 */}
        <div className="device-form">
          <h2>{editingDevice ? "编辑设备" : "添加新设备"}</h2>
          <form onSubmit={editingDevice ? saveEdit : addDevice}>
            {/* 设备名称 */}
            <div className="form-group">
              <label className="form-label">设备名称: </label>
              <input
                type="text"
                name="device_name"
                value={editingDevice ? editingDevice.device_name || "" : newDevice.device_name || ""}
                onChange={(e) => editingDevice
                  ? setEditingDevice({ ...editingDevice, device_name: e.target.value })
                  : setNewDevice({ ...newDevice, [e.target.name]: e.target.value })
                }
                required
                className="form-input"
              />
            </div>

            {/* 设备代码 */}
            <div className="form-group">
              <label className="form-label">设备代码: </label>
              <input
                type="number"
                name="device_code"
                value={editingDevice ? editingDevice.device_code || "" : newDevice.device_code || ""}
                onChange={(e) => editingDevice
                  ? setEditingDevice({ ...editingDevice, device_code: e.target.value || null })
                  : setNewDevice({ ...newDevice, [e.target.name]: e.target.value || null })
                }
                className="form-input"
                placeholder="可选"
              />
            </div>

            {/* 省份和城市 */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">省份: </label>
                <input
                  type="text"
                  name="province"
                  value={editingDevice ? editingDevice.province || "" : newDevice.province || ""}
                  onChange={(e) => editingDevice
                    ? setEditingDevice({ ...editingDevice, province: e.target.value })
                    : setNewDevice({ ...newDevice, [e.target.name]: e.target.value })
                  }
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">城市: </label>
                <input
                  type="text"
                  name="city"
                  value={editingDevice ? editingDevice.city || "" : newDevice.city || ""}
                  onChange={(e) => editingDevice
                    ? setEditingDevice({ ...editingDevice, city: e.target.value })
                    : setNewDevice({ ...newDevice, [e.target.name]: e.target.value })
                  }
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* 详细位置 */}
            <div className="form-group">
              <label className="form-label">详细位置: </label>
              <input
                type="text"
                name="location"
                value={editingDevice ? editingDevice.location || "" : newDevice.location || ""}
                onChange={(e) => editingDevice
                  ? setEditingDevice({ ...editingDevice, location: e.target.value })
                  : setNewDevice({ ...newDevice, [e.target.name]: e.target.value })
                }
                required
                className="form-input"
              />
            </div>

            {/* 用户ID和安装时间 */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">用户ID: </label>
                <input
                  type="text"
                  name="user_id"
                  value={currentUserId || ""}
                  readOnly
                  className="form-input disabled-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">安装时间: </label>
                <input
                  type="datetime-local"
                  name="install_time"
                  value={editingDevice ? editingDevice.install_time || "" : newDevice.install_time || ""}
                  onChange={(e) => editingDevice
                    ? setEditingDevice({ ...editingDevice, install_time: e.target.value })
                    : setNewDevice({ ...newDevice, [e.target.name]: e.target.value })
                  }
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                {editingDevice ? "保存修改" : "添加设备"}
              </button>
              {editingDevice && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setEditingDevice(null)}
                >
                  取消
                </button>
              )}
            </div>
          </form>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
        </div>

        {/* 设备列表展示 */}
        {loading ? (
          <p>加载中...</p>
        ) : devices.length === 0 ? (
          <p>没有找到设备</p>
        ) : (
          <div className="device-list">
            <table className="device-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>名称</th>
                  <th>设备代码</th>
                  <th>推流地址</th>
                  <th>拉流地址</th>
                  <th>位置</th>
                  <th>状态</th>
                  <th>安装时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.device_id}>
                    <td>{device.device_id}</td>
                    <td>{device.device_name}</td>
                    <td>{device.device_code || '-'}</td>
                    <td className="url-cell">{device.push_url}</td>
                    <td className="url-cell">{device.pull_url}</td>
                    <td>{`${device.province}${device.city}${device.location}`}</td>
                    <td>
                      <span className={`status-${device.status === 1 ? 'active' : 'inactive'}`}>
                        {device.status === 1 ? '在线' : '离线'}
                      </span>
                    </td>
                    <td>{new Date(device.install_time).toLocaleString()}</td>
                    <td className="actions-cell">
                      <button
                        onClick={() => startEdit(device)}
                        className="edit-button"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(device.device_id)}
                        className="delete-button"
                      >
                        删除
                      </button>
                      <button
                        onClick={() => fetchStreamUrl(device.device_id, device.device_code)}
                        className="stream-button"
                        disabled={!device.device_code}
                        title={!device.device_code ? "需要先设置设备代码" : ""}
                      >
                        获取播流地址
                      </button>
                      <button
                        onClick={() => handleStopStream(device.device_code, device.device_id)}
                        className="stop-stream-button"
                        disabled={!device.device_code || !device.pull_url}
                        title={!device.device_code ? "需要设备代码" : (!device.pull_url ? "没有活跃的播流" : "")}
                      >
                        关闭播流
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceList;