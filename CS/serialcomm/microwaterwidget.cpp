#include "microwaterwidget.h"
#include "ui_microwaterwidget.h"
#include <QSerialPortInfo>
#include <QMessageBox>
#include <QDateTime>
#include <QDataStream>
#include <QJsonDocument>
#include <QJsonObject>
#include <QTimer>

MicroWaterWidget::MicroWaterWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MicroWaterWidget),
    m_serialPort(new QSerialPort(this)),
    m_currentState(AppState::Idle),
    m_webSocketServer(new QWebSocketServer("MW Server", QWebSocketServer::NonSecureMode, this)),
    m_dataTimer(new QTimer(this)),
    m_autoSendTimer(new QTimer(this)), // 初始化自动发送定时器
    m_sendIntervalMs(5000),            // 默认发送间隔
    m_currentSlaveId(1),               // 默认从站ID
    m_currentReadAddress(0),           // 默认起始地址
    m_currentReadCount(0)              // 默认读取长度
{
    ui->setupUi(this);
    initUiSettings();
    initSerialPort();

    // 串口数据缓冲定时器
    m_dataTimer->setSingleShot(true);
    m_dataTimer->setInterval(100); 
    connect(m_dataTimer, &QTimer::timeout, this, &MicroWaterWidget::processReceivedData);
    
    // 自动发送定时器
    connect(m_autoSendTimer, &QTimer::timeout, this, &MicroWaterWidget::autoSendDataRequest);

    connect(ui->returnButton, &QPushButton::clicked, this, &MicroWaterWidget::returnToHomeRequested);

    // 为微水监测使用不同的端口 8082
    if (m_webSocketServer->listen(QHostAddress::Any, 8082)) {
        logMessage("WebSocket服务器启动在端口: 8082");
        connect(m_webSocketServer, &QWebSocketServer::newConnection, this, &MicroWaterWidget::onNewWebSocketConnection);
    } else {
        logMessage("WebSocket服务器启动失败: " + m_webSocketServer->errorString());
    }
}

MicroWaterWidget::~MicroWaterWidget()
{
    qDeleteAll(m_clients);
    m_webSocketServer->close();
    if(m_serialPort->isOpen()) m_serialPort->close();
    delete ui;
}

void MicroWaterWidget::onNewWebSocketConnection()
{
    QWebSocket *client = m_webSocketServer->nextPendingConnection();
    logMessage("新的WebSocket连接: " + client->peerAddress().toString());
    connect(client, &QWebSocket::textMessageReceived, this, &MicroWaterWidget::onWebSocketMessageReceived);
    connect(client, &QWebSocket::disconnected, this, &MicroWaterWidget::onWebSocketDisconnected);
    m_clients.append(client);
    sendStatusToClient(client);
}

void MicroWaterWidget::onWebSocketDisconnected()
{
    QWebSocket *client = qobject_cast<QWebSocket*>(sender());
    if (client) {
        logMessage("WebSocket连接断开: " + client->peerAddress().toString());
        m_clients.removeAll(client);
        client->deleteLater();
    }
}

void MicroWaterWidget::onWebSocketMessageReceived(const QString &message)
{
    QWebSocket *client = qobject_cast<QWebSocket*>(sender());
    logMessage("收到WebSocket消息: " + message);

    QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
    if (!doc.isObject()) return;

    QJsonObject obj = doc.object();
    QString type = obj.value("type").toString();

    if (type == "SEND_ONCE" || type == "START_AUTO_POLL") {
        if (!m_serialPort->isOpen()) {
            logMessage("错误: 串口未打开，无法执行指令。");
            return;
        }
        if (m_currentState != AppState::Idle) {
            logMessage("警告: 当前正忙，请等待上一条指令完成。");
            return;
        }
        
        m_currentSlaveId = static_cast<quint8>(obj.value("slaveId").toInt(1));
        m_currentReadAddress = static_cast<quint16>(obj.value("address").toInt(0));
        m_currentReadCount = static_cast<quint16>(obj.value("count").toInt(0));
        
        logMessage(QString("设置读取参数: 从站ID=%1, 地址=0x%2, 数量=%3")
                       .arg(m_currentSlaveId)
                       .arg(QString::number(m_currentReadAddress, 16))
                       .arg(m_currentReadCount));

        if (type == "START_AUTO_POLL") {
            int interval = obj.value("interval").toInt(m_sendIntervalMs);
            if (interval > 0) {
                 m_sendIntervalMs = interval;
                 m_autoSendTimer->setInterval(m_sendIntervalMs);
            }
            m_autoSendTimer->start();
            logMessage("启动自动轮询，间隔: " + QString::number(m_sendIntervalMs) + "ms");
            QJsonObject response;
            response["type"] = "AUTO_STARTED";
            response["interval"] = m_sendIntervalMs;
            client->sendTextMessage(QJsonDocument(response).toJson(QJsonDocument::Compact));
        }
        
        autoSendDataRequest();

    } else if (type == "STOP_AUTO") {
        m_autoSendTimer->stop();
        logMessage("停止自动轮询");
        QJsonObject response;
        response["type"] = "AUTO_STOPPED";
        client->sendTextMessage(QJsonDocument(response).toJson(QJsonDocument::Compact));

    } else if (type == "GET_STATUS") {
        sendStatusToClient(client);
    }
}

void MicroWaterWidget::sendStatusToClient(QWebSocket *client)
{
    if (!client) return;
    QJsonObject status;
    status["type"] = "STATUS";
    status["interval"] = m_sendIntervalMs;
    status["autoSending"] = m_autoSendTimer->isActive();
    status["serialOpen"] = m_serialPort->isOpen();
    client->sendTextMessage(QJsonDocument(status).toJson(QJsonDocument::Compact));
}


void MicroWaterWidget::initUiSettings()
{
    const auto ports = QSerialPortInfo::availablePorts();
    for (const QSerialPortInfo &port : ports) {
        ui->portComboBox->addItem(port.portName());
    }
    ui->baudComboBox->addItems({"9600", "19200", "38400", "57600", "115200"});
    ui->baudComboBox->setCurrentText("9600");
    updateUiState(false);
}

void MicroWaterWidget::initSerialPort()
{
    connect(m_serialPort, &QSerialPort::readyRead, this, &MicroWaterWidget::readDataFromSerial);
}

void MicroWaterWidget::updateUiState(bool isOpen)
{
    ui->portComboBox->setEnabled(!isOpen);
    ui->baudComboBox->setEnabled(!isOpen);
    ui->openPortButton->setEnabled(!isOpen);
    ui->closePortButton->setEnabled(isOpen);
    ui->startButton->setEnabled(isOpen);
}

void MicroWaterWidget::logMessage(const QString &msg)
{
    ui->logTextEdit->appendPlainText(QDateTime::currentDateTime().toString("[yyyy-MM-dd hh:mm:ss.zzz] ") + msg);
}

void MicroWaterWidget::on_openPortButton_clicked()
{
    m_serialPort->setPortName(ui->portComboBox->currentText());
    m_serialPort->setBaudRate(ui->baudComboBox->currentText().toInt());
    m_serialPort->setDataBits(QSerialPort::Data8);
    m_serialPort->setParity(QSerialPort::NoParity);
    m_serialPort->setStopBits(QSerialPort::OneStop);
    m_serialPort->setFlowControl(QSerialPort::NoFlowControl);

    if (m_serialPort->open(QIODevice::ReadWrite)) {
        m_serialPort->setReadBufferSize(4096);
        updateUiState(true);
        logMessage("串口 " + m_serialPort->portName() + " 打开成功。");
    } else {
        QMessageBox::critical(this, "错误", m_serialPort->errorString());
        logMessage("错误: " + m_serialPort->errorString());
    }
}

void MicroWaterWidget::on_closePortButton_clicked()
{
    if (m_serialPort->isOpen()) {
        m_serialPort->close();
    }
    m_autoSendTimer->stop();
    updateUiState(false);
    logMessage("串口已关闭。");
}

void MicroWaterWidget::on_startButton_clicked()
{
    if (m_currentState != AppState::Idle) {
        logMessage("警告: 当前正忙，请等待上一条指令完成。");
        return;
    }

    logMessage("步骤1: 发送指令选择要读取的设备 (微水)...");
    QByteArray command;
    command.append(static_cast<char>(0x01)); 
    command.append(static_cast<char>(0x06));
    command.append(static_cast<char>(0x00));
    command.append(static_cast<char>(0x01));
    command.append(static_cast<char>((m_deviceCode >> 8) & 0xFF));
    command.append(static_cast<char>(m_deviceCode & 0xFF));
    sendSerialCommand(command);
    m_currentState = AppState::WaitingForDeviceSelectionAck;
}

void MicroWaterWidget::autoSendDataRequest()
{
    if (m_currentState != AppState::Idle) {
        logMessage("警告: 自动发送跳过，因为系统正忙。");
        return;
    }
    if (m_currentReadCount == 0) {
        logMessage("警告: 读取数量为0，跳过发送。请在Web端设置参数。");
        return;
    }

    logMessage("自动轮询: 请求设备数据...");
    QByteArray command;
    command.append(static_cast<char>(m_currentSlaveId));
    command.append(static_cast<char>(0x03));
    command.append(static_cast<char>((m_currentReadAddress >> 8) & 0xFF));
    command.append(static_cast<char>(m_currentReadAddress & 0xFF));
    command.append(static_cast<char>((m_currentReadCount >> 8) & 0xFF));
    command.append(static_cast<char>(m_currentReadCount & 0xFF));
    sendSerialCommand(command);
    m_currentState = AppState::WaitingForData;
}


void MicroWaterWidget::readDataFromSerial()
{
    QByteArray newData = m_serialPort->readAll();
    m_receivedBuffer.append(newData);

    logMessage(QString("本次接收 %1 字节，缓冲区总计 %2 字节")
               .arg(newData.size())
               .arg(m_receivedBuffer.size()));
    
    m_dataTimer->stop();
    m_dataTimer->start();
}

void MicroWaterWidget::processReceivedData()
{
    if (m_receivedBuffer.isEmpty()) return;

    if (!isResponseComplete(m_receivedBuffer)) {
        logMessage("警告: 接收到的数据不完整，继续等待...");
        if (m_receivedBuffer.size() > 256) {
            logMessage("错误: 接收缓冲区过大，清空缓冲区");
            m_receivedBuffer.clear();
            m_currentState = AppState::Idle;
        }
        return;
    }

    logMessage("接收: " + m_receivedBuffer.toHex(' ').toUpper());
    parseResponse(m_receivedBuffer);
    m_receivedBuffer.clear();
}

bool MicroWaterWidget::isResponseComplete(const QByteArray &buffer)
{
    if (buffer.length() < 5) return false;
    quint8 functionCode = buffer[1];
    if (functionCode == 0x03) {
        if (buffer.length() < 3) return false;
        quint8 byteCount = buffer[2];
        return buffer.length() >= 3 + byteCount + 2;
    }
    else if (functionCode == 0x06) {
        return buffer.length() >= 8;
    }
    else if (functionCode & 0x80) {
        return buffer.length() >= 5;
    }
    return true;
}

void MicroWaterWidget::sendSerialCommand(const QByteArray &command)
{
    if (!m_serialPort->isOpen()) {
        logMessage("错误: 串口未打开，无法发送指令。");
        m_currentState = AppState::Idle;
        return;
    }
    QByteArray commandWithCrc = command;
    quint16 crc = calculateModbusCrc(command);
    commandWithCrc.append(static_cast<char>(crc & 0xFF));
    commandWithCrc.append(static_cast<char>((crc >> 8) & 0xFF));
    m_serialPort->write(commandWithCrc);
    logMessage("发送: " + commandWithCrc.toHex(' ').toUpper());
}

quint16 MicroWaterWidget::calculateModbusCrc(const QByteArray &data) const
{
    quint16 crc = 0xFFFF;
    for (int i = 0; i < data.length(); ++i) {
        crc ^= static_cast<quint8>(data.at(i));
        for (int j = 0; j < 8; ++j) {
            if (crc & 0x0001) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

void MicroWaterWidget::parseResponse(const QByteArray &buffer)
{
    if (buffer.length() < 2) {
        logMessage("错误: 响应数据太短");
        m_currentState = AppState::Idle;
        return;
    }

    quint8 functionCode = buffer[1];
    if (functionCode & 0x80) {
        quint8 exceptionCode = buffer[2];
        QString exceptionMsg;
        switch(exceptionCode) {
            case 0x01: exceptionMsg = "非法功能码"; break;
            case 0x02: exceptionMsg = "非法数据地址"; break;
            case 0x03: exceptionMsg = "非法数据值"; break;
            case 0x04: exceptionMsg = "从站设备故障"; break;
            default: exceptionMsg = QString("未知异常码: %1").arg(exceptionCode);
        }
        logMessage("Modbus异常响应: " + exceptionMsg);
        m_currentState = AppState::Idle;
        return;
    }

    QByteArray dataToCheck = buffer.left(buffer.length() - 2);
    quint16 calculatedCrc = calculateModbusCrc(dataToCheck);
    quint16 receivedCrc = (static_cast<unsigned char>(buffer.at(buffer.length() - 1)) << 8) | static_cast<unsigned char>(buffer.at(buffer.length() - 2));

    if (receivedCrc != calculatedCrc) {
        logMessage(QString("CRC校验失败! 接收CRC: %1, 计算CRC: %2")
                       .arg(QString::number(receivedCrc, 16).toUpper().rightJustified(4, '0'))
                       .arg(QString::number(calculatedCrc, 16).toUpper().rightJustified(4, '0')));
        m_currentState = AppState::Idle;
        return;
    }
    logMessage("CRC校验成功");

    switch (m_currentState)
    {
        case AppState::WaitingForDeviceSelectionAck:
        {
            logMessage("步骤1完成: 设备选择成功。现在可以从Web端发送读取指令了。");
            m_currentState = AppState::Idle; // 释放状态，等待Web指令
            break;
        }
        case AppState::WaitingForDeviceInfo:
        {
             // 此状态在新流程中不再被自动调用
            logMessage("收到设备信息响应（此流程已废弃）。");
            m_currentState = AppState::Idle;
            break;
        }
        case AppState::WaitingForData:
        {
            if (buffer.length() < 5) {
                logMessage("错误: 数据响应太短");
                m_currentState = AppState::Idle;
                return;
            }
            quint8 byteCount = buffer[2];
            if (buffer.length() < 3 + byteCount + 2) {
                logMessage("错误: 数据响应长度不匹配");
                m_currentState = AppState::Idle;
                return;
            }
            
            logMessage("接收到设备数据，开始解析...");
            QByteArray dataPayload = buffer.mid(3, byteCount);
            parseMicroWater(dataPayload);
            logMessage("本次采集流程结束。");
            m_currentState = AppState::Idle; // 释放状态，允许下一次轮询
            break;
        }
        default:
            logMessage("警告: 在未知状态下收到数据，已忽略。");
            m_currentState = AppState::Idle;
            break;
    }
}

void MicroWaterWidget::parseMicroWater(const QByteArray &data)
{
    // 根据协议表格，总数据长度为 4 + 2*7 = 18字节
    if(data.length() < 18) {
        logMessage(QString("微水数据长度不足，期望至少18字节，实际%1字节").arg(data.length()));
        return;
    }

    QDataStream stream(data);
    stream.setByteOrder(QDataStream::BigEndian);

    quint32 time;
    quint16 temp, pressure, density, microWater, dewPoint, comm, alarm;
    stream >> time >> temp >> pressure >> density >> microWater >> dewPoint >> comm >> alarm;

    QString timeStr = QDateTime::fromSecsSinceEpoch(time).toString("yyyy-MM-dd hh:mm:ss");
    // 注意：这里的值都需要除以100来得到真实值
    QString tempStr = QString::number(static_cast<qint16>(temp) * 0.01, 'f', 2);
    QString pressureStr = QString::number(pressure * 0.01, 'f', 2);
    QString densityStr = QString::number(density * 0.01, 'f', 2);
    QString microWaterStr = QString::number(microWater * 0.01, 'f', 2);
    QString dewPointStr = QString::number(static_cast<qint16>(dewPoint) * 0.01, 'f', 2);

    // 更新UI控件
    ui->mwTimeLineEdit->setText(timeStr);
    ui->mwTempLineEdit->setText(tempStr);
    ui->mwPressureLineEdit->setText(pressureStr);
    ui->mwDensityLineEdit->setText(densityStr);
    ui->mwMicroWaterLineEdit->setText(microWaterStr);
    ui->mwDewPointLineEdit->setText(dewPointStr);
    ui->mwCommStatusLineEdit->setText(comm == 0 ? "正常" : (comm == 1 ? "异常" : "初始化状态"));
    ui->mwAlarmStatusLineEdit->setText(alarm == 0 ? "正常" : (alarm == 1 ? "预警" : "报警"));
    
    logMessage(QString("微水数据解析完成 - 时间:%1, 温度:%2°C, 压力:%3MPa, 微水:%4ppmV")
               .arg(timeStr).arg(tempStr).arg(pressureStr).arg(microWaterStr));

    // 通过WebSocket发送JSON数据
    QJsonObject jsonData;
    jsonData["time"] = timeStr;
    jsonData["temperature"] = tempStr;
    jsonData["pressure"] = pressureStr;
    jsonData["density"] = densityStr;
    jsonData["microWater"] = microWaterStr;
    jsonData["dewPoint"] = dewPointStr;
    jsonData["commStatus"] = comm;
    jsonData["alarmStatus"] = alarm;

    QJsonDocument doc(jsonData);
    QString jsonStr = doc.toJson(QJsonDocument::Compact);

    for (QWebSocket *client : qAsConst(m_clients)) {
        client->sendTextMessage(jsonStr);
    }
    
    if (!m_clients.isEmpty()) {
        logMessage(QString("已向 %1 个WebSocket客户端发送数据").arg(m_clients.size()));
    }
}