#ifndef PARTIALDISCHARGEWIDGET_H
#define PARTIALDISCHARGEWIDGET_H

#include <QWidget>
#include <QSerialPort>
#include <QWebSocketServer>
#include <QWebSocket>
#include <QList>
#include <QTimer>

namespace Ui {
class PartialDischargeWidget;
}

class PartialDischargeWidget : public QWidget
{
    Q_OBJECT

public:
    explicit PartialDischargeWidget(QWidget *parent = nullptr);
    ~PartialDischargeWidget();

signals:
    void returnToHomeRequested();

private slots:
    // UI按钮槽函数
    void on_openPortButton_clicked();
    void on_closePortButton_clicked();
    void on_startButton_clicked(); // 这个按钮现在将只用于选择设备

    // 串口相关槽函数
    void readDataFromSerial();
    void processReceivedData();

    // WebSocket相关槽函数
    void onNewWebSocketConnection();
    void onWebSocketDisconnected();
    void onWebSocketMessageReceived(const QString &message);
    
    // 新增: 用于自动轮询的槽函数
    void autoSendDataRequest();

private:
    // 应用状态枚举
    enum class AppState {
        Idle,
        WaitingForDeviceSelectionAck,
        WaitingForDeviceInfo,
        WaitingForData
    };

    // 初始化函数
    void initUiSettings();
    void initSerialPort();

    // UI更新函数
    void updateUiState(bool isOpen);
    void logMessage(const QString &msg);

    // 串口通信函数
    void sendSerialCommand(const QByteArray &command);
    quint16 calculateModbusCrc(const QByteArray &data) const;
    bool isResponseComplete(const QByteArray &buffer);

    // 数据解析函数
    void parseResponse(const QByteArray &buffer);
    void parsePartialDischarge(const QByteArray &data);

    // WebSocket 辅助函数
    void sendStatusToClient(QWebSocket *client);

    Ui::PartialDischargeWidget *ui;

    // 串口相关
    QSerialPort *m_serialPort;
    QByteArray m_receivedBuffer;
    QTimer *m_dataTimer;

    // WebSocket相关
    QWebSocketServer *m_webSocketServer;
    QList<QWebSocket*> m_clients;

    // 自动发送相关
    QTimer *m_autoSendTimer;
    int m_sendIntervalMs;
    
    // 新增: 存储来自Web端的自定义轮询参数
    quint8 m_currentSlaveId;
    quint16 m_currentReadAddress;
    quint16 m_currentReadCount;


    // 应用状态
    AppState m_currentState;
    const quint16 m_deviceCode = 0x5209; // 变压器局放设备选择码
};

#endif // PARTIALDISCHARGEWIDGET_H