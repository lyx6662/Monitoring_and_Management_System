#ifndef GENERICDEVICEWIDGET_H
#define GENERICDEVICEWIDGET_H

#include <QWidget>
#include <QSerialPort>
#include <QMap>

// 向前声明UI类
namespace Ui {
class GenericDeviceWidget;
}

class GenericDeviceWidget : public QWidget
{
    Q_OBJECT

public:
    explicit GenericDeviceWidget(QWidget *parent = nullptr);
    ~GenericDeviceWidget();

signals:
    // 用于通知MainWindow返回主页的信号
    void returnToHomeRequested();

private slots:
    // 所有槽函数都从之前的MainWindow迁移过来
    void on_openPortButton_clicked();
    void on_closePortButton_clicked();
    void on_startButton_clicked();
    void readDataFromSerial();

private:
    // 业务流程状态机
    enum class AppState {
        Idle,
        WaitingForDeviceSelectionAck,
        WaitingForDeviceInfo,
        WaitingForData
    };

    // 初始化
    void initUiSettings();
    void initSerialPort();

    // 协议相关
    void sendSerialCommand(const QByteArray &command);
    quint16 calculateModbusCrc(const QByteArray &data) const;
    void parseResponse(const QByteArray &buffer);

    // 具体设备的数据解析
    void parsePartialDischarge(const QByteArray &data);
    void parseMicroWater(const QByteArray &data);

    // UI更新
    void updateUiState(bool isOpen);
    void logMessage(const QString &msg);

private:
    Ui::GenericDeviceWidget *ui; // 指向新UI类的指针
    QSerialPort *m_serialPort;
    QMap<QString, quint16> m_deviceCodes;
    AppState m_currentState;
    quint16 m_currentDeviceCode;
    QByteArray m_receivedBuffer;
};

#endif // GENERICDEVICEWIDGET_H