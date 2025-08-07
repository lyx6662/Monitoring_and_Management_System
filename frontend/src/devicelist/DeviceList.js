import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function DeviceList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newDevice, setNewDevice] = useState({ id: "", name: "", date: "" });
  const [success, setSuccess] = useState("");

  // 定义可选的设备名称列表
  const deviceNameOptions = [
    "温度传感器",
    "变压器在线监测系统",
    "GIS在线监测系统",
    "电缆在线监测系统",
    "箱体在线监测系统",
    "智能辅助控制系统",
    "电机设备在线监测系统"
  ];

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await axios.get("http://localhost:5000/devices");
      setDevices(response.data);
    } catch (err) {
      setError("无法加载设备列表: " + (err.response?.data?.error || err.message));
      console.error("获取设备失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDevice({ ...newDevice, [name]: value });
  };

  const addDevice = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/devices", newDevice);
      setSuccess(response.data.message);
      setNewDevice({ id: "", name: "", date: "" });
      fetchDevices(); // 刷新列表
    } catch (err) {
      setError(err.response?.data.error || "Failed to add device");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/devices/${id}`);
      setDevices(devices.filter(device => device.id !== id));
    } catch (err) {
      setError("删除失败: " + (err.response?.data?.error || err.message));
    }
  };

  // 按照name分组设备
  const groupDevicesByName = () => {
    const groups = {};
    devices.forEach(device => {
      if (!groups[device.name]) {
        groups[device.name] = [];
      }
      groups[device.name].push(device);
    });
    return groups;
  };

  const deviceGroups = groupDevicesByName();

  return (
    <div style={{ padding: "20px" }}>
      <h1>设备列表</h1>
      <Link to="/" style={{ marginBottom: "20px", display: "block" }}>
        ← 返回首页
      </Link>
      
      {/* 添加设备表单 */}
      <div style={{ marginBottom: "30px", padding: "20px", border: "1px solid #eee", borderRadius: "4px" }}>
        <h2>添加新设备</h2>
        <form onSubmit={addDevice}>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ marginRight: "10px" }}>ID: </label>
            <input
              type="text"
              name="id"
              value={newDevice.id}
              onChange={handleInputChange}
              required
              style={{ padding: "5px" }}
            />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ marginRight: "10px" }}>Name: </label>
            <select
              name="name"
              value={newDevice.name}
              onChange={handleInputChange}
              required
              style={{ padding: "5px", width: "250px" }}
            >
              <option value="">-- 请选择设备类型 --</option>
              {deviceNameOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ marginRight: "10px" }}>Date: </label>
            <input
              type="date"
              name="date"
              value={newDevice.date}
              onChange={handleInputChange}
              required
              style={{ padding: "5px" }}
            />
          </div>
          <button 
            type="submit" 
            style={{ 
              padding: "5px 15px", 
              backgroundColor: "#4CAF50", 
              color: "white", 
              border: "none", 
              borderRadius: "4px", 
              cursor: "pointer" 
            }}
          >
            添加设备
          </button>
        </form>
        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        {success && <p style={{ color: "green", marginTop: "10px" }}>{success}</p>}
      </div>

      {/* 按名称分组的设备表格 */}
      {loading ? (
        <p>加载中...</p>
      ) : devices.length === 0 ? (
        <p>没有找到设备</p>
      ) : (
        Object.entries(deviceGroups).map(([name, devices]) => (
          <div key={name} style={{ marginBottom: "30px" }}>
            <h2>{name}</h2>
            <table style={{ 
              width: "100%", 
              borderCollapse: "collapse",
              border: "1px solid #ddd"
            }}>
              <thead>
                <tr style={{ backgroundColor: "#f2f2f2" }}>
                  <th style={{ padding: "12px", textAlign: "left", border: "1px solid #ddd" }}>ID</th>
                  <th style={{ padding: "12px", textAlign: "left", border: "1px solid #ddd" }}>日期</th>
                  <th style={{ padding: "12px", textAlign: "left", border: "1px solid #ddd" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.id} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "12px", border: "1px solid #ddd" }}>{device.id}</td>
                    <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                      {new Date(device.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                      <button 
                        onClick={() => handleDelete(device.id)}
                        style={{ 
                          color: "white",
                          backgroundColor: "#f44336",
                          border: "none",
                          borderRadius: "4px",
                          padding: "5px 10px",
                          cursor: "pointer"
                        }}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default DeviceList;