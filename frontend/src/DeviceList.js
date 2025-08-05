import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function DeviceList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await axios.get("http://localhost:5000/devices"); // 注意添加/api前缀
      setDevices(response.data);
    } catch (err) {
      setError("无法加载设备列表: " + (err.response?.data?.error || err.message));
      console.error("获取设备失败:", err);
    } finally {
      setLoading(false);
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

  return (
    <div style={{ padding: "20px" }}>
      <h1>设备列表</h1>
      <Link to="/" style={{ marginBottom: "20px", display: "block" }}>
        ← 返回首页
      </Link>
      
      {error && <p style={{ color: "red" }}>{error}</p>}
      
      {loading ? (
        <p>加载中...</p>
      ) : devices.length === 0 ? (
        <p>没有找到设备</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {devices.map((device) => (
            <li 
              key={device.id} 
              style={{ 
                padding: "10px", 
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between"
              }}
            >
              <div>
                <strong>ID:</strong> {device.id} | 
                <strong>名称:</strong> {device.name} | 
                <strong>日期:</strong> {new Date(device.date).toLocaleDateString()}
              </div>
              <button 
                onClick={() => handleDelete(device.id)}
                style={{ color: "red", cursor: "pointer" }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DeviceList;