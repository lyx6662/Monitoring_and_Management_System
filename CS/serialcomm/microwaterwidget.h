#ifndef MICROWATERWIDGET_H
#define MICROWATERWIDGET_H

#include <QWidget>
#include <QSerialPort>
#include <QWebSocketServer>
#include <QWebSocket>

class QTimer;

namespace Ui {
class MicroWaterWidget;
}

class MicroWaterWidget : public QWidget
{
    Q_OBJECT

public:
    explicit MicroWaterWidget(QWidget *parent = nullptr);
    ~MicroWaterWidget();

signals:
    void returnToHomeRequested();

private slots:
    // --- UI 交互槽函数 ---
    void on_openPortButton_clicked();
    void on_closePortButton_clicked();
    void on_startButton_clicked(); // 功能改变：仅用于选择设备

    // --- 串口和网络槽函数 ---
    void readDataFromSerial();
    void processReceivedData();
    void onNewWebSocketConnection();
    void onWebSocketDisconnected();
    void onWebSocketMessageReceived(const QString &message);
    
    // 新增: 用于自动轮询的槽函数
    void autoSendDataRequest();

private:
    // 状态机枚举
    enum class AppState {
        Idle,
        WaitingForDeviceSelectionAck,
        WaitingForDeviceInfo,
        WaitingForData
    };

    // --- 私有方法 ---
    void initUiSettings();
    void initSerialPort();
    void updateUiState(bool isOpen);
    void logMessage(const QString &msg);
    void sendSerialCommand(const QByteArray &command);
    quint16 calculateModbusCrc(const QByteArray &data) const;
    void parseResponse(const QByteArray &buffer);
    void parseMicroWater(const QByteArray &data);
    bool isResponseComplete(const QByteArray &buffer);
    void sendStatusToClient(QWebSocket *client); // 新增

    // --- 成员变量 ---
    Ui::MicroWaterWidget *ui;
    QSerialPort *m_serialPort;
    QByteArray m_receivedBuffer;
    AppState m_currentState;
    const quint16 m_deviceCode = 0x520b; // 微水设备码
    
    // WebSocket 相关
    QWebSocketServer *m_webSocketServer;
    QList<QWebSocket*> m_clients;
    
    // 定时器
    QTimer *m_dataTimer; // 用于串口数据缓冲
    QTimer *m_autoSendTimer; // 新增: 用于自动发送轮询指令

    // 新增: 存储来自Web端的自定义轮询参数
    int m_sendIntervalMs;
    quint8 m_currentSlaveId;
    quint16 m_currentReadAddress;
    quint16 m_currentReadCount;
};

#endif // MICROWATERWIDGET_H