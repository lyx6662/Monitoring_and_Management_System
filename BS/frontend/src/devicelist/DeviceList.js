import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';

// 设备类型选项
const deviceTypes = [
  { value: '云台', label: '云台' },
  { value: '枪机', label: '枪机' }
];

// 中国省份和城市数据
const chinaRegions = {
  "北京": ["北京市"],
  "天津": ["天津市"],
  "河北": ["石家庄市", "唐山市", "秦皇岛市", "邯郸市", "邢台市", "保定市", "张家口市", "承德市", "沧州市", "廊坊市", "衡水市"],
  "山西": ["太原市", "大同市", "阳泉市", "长治市", "晋城市", "朔州市", "晋中市", "运城市", "忻州市", "临汾市", "吕梁市"],
  "内蒙古": ["呼和浩特市", "包头市", "乌海市", "赤峰市", "通辽市", "鄂尔多斯市", "呼伦贝尔市", "巴彦淖尔市", "乌兰察布市"],
  "辽宁": ["沈阳市", "大连市", "鞍山市", "抚顺市", "本溪市", "丹东市", "锦州市", "营口市", "阜新市", "辽阳市", "盘锦市", "铁岭市", "朝阳市", "葫芦岛市"],
  "吉林": ["长春市", "吉林市", "四平市", "辽源市", "通化市", "白山市", "松原市", "白城市"],
  "黑龙江": ["哈尔滨市", "齐齐哈尔市", "鸡西市", "鹤岗市", "双鸭山市", "大庆市", "伊春市", "佳木斯市", "七台河市", "牡丹江市", "黑河市", "绥化市"],
  "上海": ["上海市"],
  "江苏": ["南京市", "无锡市", "徐州市", "常州市", "苏州市", "南通市", "连云港市", "淮安市", "盐城市", "扬州市", "镇江市", "泰州市", "宿迁市"],
  "浙江": ["杭州市", "宁波市", "温州市", "嘉兴市", "湖州市", "绍兴市", "金华市", "衢州市", "舟山市", "台州市", "丽水市"],
  "安徽": ["合肥市", "芜湖市", "蚌埠市", "淮南市", "马鞍山市", "淮北市", "铜陵市", "安庆市", "黄山市", "滁州市", "阜阳市", "宿州市", "巢湖市", "六安市", "亳州市", "池州市", "宣城市"],
  "福建": ["福州市", "厦门市", "莆田市", "三明市", "泉州市", "漳州市", "南平市", "龙岩市", "宁德市"],
  "江西": ["南昌市", "景德镇市", "萍乡市", "九江市", "新余市", "鹰潭市", "赣州市", "吉安市", "宜春市", "抚州市", "上饶市"],
  "山东": ["济南市", "青岛市", "淄博市", "枣庄市", "东营市", "烟台市", "潍坊市", "济宁市", "泰安市", "威海市", "日照市", "莱芜市", "临沂市", "德州市", "聊城市", "滨州市", "菏泽市"],
  "河南": ["郑州市", "开封市", "洛阳市", "平顶山市", "安阳市", "鹤壁市", "新乡市", "焦作市", "濮阳市", "许昌市", "漯河市", "三门峡市", "南阳市", "商丘市", "信阳市", "周口市", "驻马店市"],
  "湖北": ["武汉市", "黄石市", "十堰市", "宜昌市", "襄樊市", "鄂州市", "荆门市", "孝感市", "荆州市", "黄冈市", "咸宁市", "随州市"],
  "湖南": ["长沙市", "株洲市", "湘潭市", "衡阳市", "邵阳市", "岳阳市", "常德市", "张家界市", "益阳市", "郴州市", "永州市", "怀化市", "娄底市"],
  "广东": ["广州市", "深圳市", "珠海市", "汕头市", "韶关市", "佛山市", "江门市", "湛江市", "茂名市", "肇庆市", "惠州市", "梅州市", "汕尾市", "河源市", "阳江市", "清远市", "东莞市", "中山市", "潮州市", "揭阳市", "云浮市"],
  "广西": ["南宁市", "柳州市", "桂林市", "梧州市", "北海市", "防城港市", "钦州市", "贵港市", "玉林市", "百色市", "贺州市", "河池市", "来宾市", "崇左市"],
  "海南": ["海口市", "三亚市"],
  "重庆": ["重庆市"],
  "四川": ["成都市", "自贡市", "攀枝花市", "泸州市", "德阳市", "绵阳市", "广元市", "遂宁市", "内江市", "乐山市", "南充市", "眉山市", "宜宾市", "广安市", "达州市", "雅安市", "巴中市", "资阳市"],
  "贵州": ["贵阳市", "六盘水市", "遵义市", "安顺市"],
  "云南": ["昆明市", "曲靖市", "玉溪市", "保山市", "昭通市", "丽江市", "普洱市", "临沧市"],
  "西藏": ["拉萨市"],
  "陕西": ["西安市", "铜川市", "宝鸡市", "咸阳市", "渭南市", "延安市", "汉中市", "榆林市", "安康市", "商洛市"],
  "甘肃": ["兰州市", "嘉峪关市", "金昌市", "白银市", "天水市", "武威市", "张掖市", "平凉市", "酒泉市", "庆阳市", "定西市", "陇南市"],
  "青海": ["西宁市"],
  "宁夏": ["银川市", "石嘴山市", "吴忠市", "固原市", "中卫市"],
  "新疆": ["乌鲁木齐市", "克拉玛依市"]
};

// 初始表单状态
const initialDeviceState = {
  device_name: "", // 现在存储设备类型（云台/枪机）
  device_code: "", // 必填字段
  province: "",
  city: "",
  location: "",
  user_id: "",
  install_time: new Date().toISOString().slice(0, 16)
};

// ========== 封装的 API 方法 ========== //
const fetchDeviceList = async (setDevices, setError, setLoading, userId) => {
  try {
    const response = await axios.get("http://localhost:5000/api/devices", {
      params: { user_id: userId }
    });
    setDevices(response.data);
  } catch (err) {
    setError("无法加载设备列表: " + (err.response?.data?.error || err.message));
    console.error("获取设备失败:", err);
  } finally {
    setLoading(false);
  }
};

const addNewDevice = async (newDevice, setSuccess, setError, fetchDevices) => {
  try {
    if (!newDevice.device_code) {
      throw new Error("设备代码不能为空");
    }

    const response = await axios.post("http://localhost:5000/api/devices", {
      ...newDevice,
      push_url: `未设置`,
      pull_url: "播流地址还没开放",
      user_id: newDevice.user_id
    });

    setSuccess("设备添加成功");
    setTimeout(() => setSuccess(""), 1000);

    fetchDevices();
    return initialDeviceState;
  } catch (err) {
    setError(err.response?.data?.error || "添加设备失败: " + err.message);
    return null;
  }
};

const updateDevice = async (deviceId, deviceData, setSuccess, setError, fetchDevices) => {
  try {
    if (!deviceData.device_code) {
      throw new Error("设备代码不能为空");
    }

    await axios.put(`http://localhost:5000/api/devices/${deviceId}`, {
      ...deviceData,
      user_id: undefined
    });
    setSuccess("设备更新成功");
    setTimeout(() => setSuccess(""), 1000);
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
  // 存储省份列表和选中省份对应的城市列表
  const [provinces] = useState(Object.keys(chinaRegions));
  const [cities, setCities] = useState([]);

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
      fetchDeviceList(setDevices, setError, setLoading, userId);
    }
  }, []);

  // 监听省份变化，更新城市列表
  useEffect(() => {
    if (editingDevice?.province) {
      setCities(chinaRegions[editingDevice.province] || []);
    } else if (newDevice.province) {
      setCities(chinaRegions[newDevice.province] || []);
    } else {
      setCities([]);
    }
  }, [editingDevice?.province, newDevice.province]);

  const fetchDevices = () => {
    fetchDeviceList(setDevices, setError, setLoading, currentUserId);
  };

  const addDevice = async (e) => {
    e.preventDefault();
    const clearedForm = await addNewDevice(newDevice, setSuccess, setError, fetchDevices);
    if (clearedForm) setNewDevice(clearedForm);
  };

  const startEdit = (device) => {
    // 编辑时初始化城市列表
    setCities(chinaRegions[device.province] || []);
    setEditingDevice({
      ...device,
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
      setTimeout(() => setSuccess(""), 1000);
      setDevices(devices.filter(device => device.device_id !== device_id));
    } catch (err) {
      setError("删除失败: " + (err.response?.data?.error || err.message));
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
            {/* 设备名称改为下拉框 */}
            <div className="form-group">
              <label className="form-label">设备类型: </label>
              <select
                name="device_name"
                value={editingDevice ? editingDevice.device_name || "" : newDevice.device_name || ""}
                onChange={(e) => editingDevice
                  ? setEditingDevice({ ...editingDevice, device_name: e.target.value })
                  : setNewDevice({ ...newDevice, [e.target.name]: e.target.value })
                }
                className="form-select"
              >
                <option value="">请选择设备类型</option>
                {deviceTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 设备代码 - 必填字段 */}
            <div className="form-group">
              <label className="form-label">设备代码: <span className="required">*</span></label>
              <input
                type="text"
                name="device_code"
                value={editingDevice ? editingDevice.device_code || "" : newDevice.device_code || ""}
                onChange={(e) => editingDevice
                  ? setEditingDevice({ ...editingDevice, device_code: e.target.value })
                  : setNewDevice({ ...newDevice, [e.target.name]: e.target.value })
                }
                className="form-input"
                required
              />
            </div>

            {/* 省份和城市下拉框 */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">省份: </label>
                <select
                  name="province"
                  value={editingDevice ? editingDevice.province || "" : newDevice.province || ""}
                  onChange={(e) => {
                    const selectedProvince = e.target.value;
                    if (editingDevice) {
                      setEditingDevice({
                        ...editingDevice,
                        province: selectedProvince,
                        city: "" // 重置城市选择
                      });
                    } else {
                      setNewDevice({
                        ...newDevice,
                        province: selectedProvince,
                        city: "" // 重置城市选择
                      });
                    }
                  }}
                  className="form-select"
                >
                  <option value="">请选择省份</option>
                  {provinces.map(province => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">城市: </label>
                <select
                  name="city"
                  value={editingDevice ? editingDevice.city || "" : newDevice.city || ""}
                  onChange={(e) => editingDevice
                    ? setEditingDevice({ ...editingDevice, city: e.target.value })
                    : setNewDevice({ ...newDevice, [e.target.name]: e.target.value })
                  }
                  className="form-select"
                  disabled={!cities.length}
                >
                  <option value="">请选择城市</option>
                  {cities.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
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
                    <td>{device.device_code}</td>
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