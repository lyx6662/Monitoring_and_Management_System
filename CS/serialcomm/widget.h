#ifndef WIDGET_H
#define WIDGET_H

#include <QWidget>
#include <QSerialPort>
#include <QSerialPortInfo>
#include <QWebSocketServer>
#include <QWebSocket>
#include <QTimer>

namespace Ui {
class Widget;
}

class Widget : public QWidget
{
    Q_OBJECT

public:
    explicit Widget(QWidget *parent = nullptr);
    ~Widget();

private slots:
    void on_connectButton_clicked();
    void on_disconnectButton_clicked();
    void readSerialData();
    void onNewWebSocketConnection();
    void onWebSocketDisconnected();
    void onWebSocketMessageReceived(const QString &message);
    void sendRequest();
    void tryParseBuffer();
    void onReturnToHome();

signals:
    void returnToHomeRequested();
private:
    Ui::Widget *ui;
    QSerialPort *serial;
    QWebSocketServer *webSocketServer;
    QTimer *requestTimer;
    QList<QWebSocket*> clients;
    QByteArray serialBuffer;  // 添加缓冲区成员变量
    int sendIntervalMs;


    quint16 calculateCRC(const QByteArray &data);
    QByteArray buildRequest(quint8 address, quint8 functionCode,
                          quint16 startReg, quint16 regCount);
    void parseResponse(const QByteArray &data);
    void sendStatusToClient(QWebSocket *client);
};

#endif // WIDGET_H
