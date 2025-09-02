#include "widget.h"
#include "ui_widget.h"
#include <QDebug>
#include <QDateTime>
#include <QAbstractSocket>
#include <QJsonDocument>
#include <QJsonObject>

Widget::Widget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::Widget),
    serial(new QSerialPort(this)),
    webSocketServer(new QWebSocketServer("Serial Server",
                                        QWebSocketServer::NonSecureMode, this)),
    requestTimer(new QTimer(this)),
    sendIntervalMs(5000)
{
    ui->setupUi(this);
    setWindowTitle("铁芯接地装置通讯");

    // 初始化发送间隔
    sendIntervalMs = 5000;

    // 初始化串口设置
    ui->baudRateComboBox->addItem("2400");
    ui->baudRateComboBox->setCurrentText("2400");
    ui->dataBitsComboBox->setCurrentText("8");
    ui->parityComboBox->setCurrentText("None");
    ui->stopBitsComboBox->setCurrentText("1");

    // 列出可用串口
    foreach (const QSerialPortInfo &info, QSerialPortInfo::availablePorts()) {
        ui->portNameComboBox->addItem(info.portName());
    }

    // 连接串口信号
    connect(serial, &QSerialPort::readyRead, this, &Widget::readSerialData);
    connect(serial, static_cast<void (QSerialPort::*)(QSerialPort::SerialPortError)>(&QSerialPort::error),
            [this](QSerialPort::SerialPortError error) {
        if (error != QSerialPort::NoError) {
            ui->logTextEdit->append("串口错误: " + serial->errorString());
        }
    });

    // WebSocket设置
    if (webSocketServer->listen(QHostAddress::Any, 8080)) {
        ui->logTextEdit->append("WebSocket服务器启动在端口: " + QString::number(webSocketServer->serverPort()));
        connect(webSocketServer, &QWebSocketServer::newConnection,
                this, &Widget::onNewWebSocketConnection);
    } else {
        ui->logTextEdit->append("WebSocket服务器启动失败: " + webSocketServer->errorString());
    }

    // 请求定时器
    connect(requestTimer, &QTimer::timeout, this, &Widget::sendRequest);
    requestTimer->setInterval(sendIntervalMs);

    // 初始化缓冲区
    serialBuffer.clear();

    // 连接返回按钮信号（新增）
    connect(ui->returnButton, &QPushButton::clicked, this, &Widget::onReturnToHome);
}

Widget::~Widget()
{
    // 关闭所有客户端连接
    foreach (QWebSocket *client, clients) {
        client->close();
        delete client;
    }
    webSocketServer->close();
    delete ui;
}
void Widget::onReturnToHome()
{
    emit returnToHomeRequested();
}

void Widget::on_connectButton_clicked()
{
    if (serial->isOpen()) {
        serial->close();
        serialBuffer.clear(); // 清空缓冲区
    }

    // 配置串口参数
    serial->setPortName(ui->portNameComboBox->currentText());
    serial->setBaudRate(ui->baudRateComboBox->currentText().toInt());

    // 设置数据位
    switch (ui->dataBitsComboBox->currentIndex()) {
    case 0: serial->setDataBits(QSerialPort::Data8); break;
    default: serial->setDataBits(QSerialPort::Data8);
    }

    // 设置校验位
    switch (ui->parityComboBox->currentIndex()) {
    case 0: serial->setParity(QSerialPort::NoParity); break;
    default: serial->setParity(QSerialPort::NoParity);
    }

    // 设置停止位
    switch (ui->stopBitsComboBox->currentIndex()) {
    case 0: serial->setStopBits(QSerialPort::OneStop); break;
    default: serial->setStopBits(QSerialPort::OneStop);
    }

    serial->setFlowControl(QSerialPort::NoFlowControl);

    // 打开串口
    if (serial->open(QIODevice::ReadWrite)) {
        ui->logTextEdit->append("串口已打开: " + serial->portName());
        ui->connectButton->setEnabled(false);
        ui->disconnectButton->setEnabled(true);
        // 不自动启动定时器，由前端控制
    } else {
        ui->logTextEdit->append("串口打开失败: " + serial->errorString());
    }
}

void Widget::on_disconnectButton_clicked()
{
    if (serial->isOpen()) {
        serial->close();
        ui->logTextEdit->append("串口已关闭");
        serialBuffer.clear(); // 清空缓冲区
    }
    ui->connectButton->setEnabled(true);
    ui->disconnectButton->setEnabled(false);
    requestTimer->stop();
}

void Widget::readSerialData()
{
    QByteArray data = serial->readAll();
    if (!data.isEmpty()) {
        ui->logTextEdit->append("接收到数据: " + data.toHex().toUpper());

        // 将新数据添加到缓冲区
        serialBuffer.append(data);

        // 尝试解析缓冲区中的数据
        tryParseBuffer();
    }
}

void Widget::tryParseBuffer()
{
    // 检查缓冲区是否有足够的数据（至少5字节：地址+功能码+长度+2字节CRC）
    while (serialBuffer.size() >= 5) {
        // 获取数据长度（从第3个字节开始）
        quint8 dataLength = static_cast<quint8>(serialBuffer[2]);

        // 计算完整帧的长度：地址(1) + 功能码(1) + 长度(1) + 数据(dataLength) + CRC(2)
        int fullFrameLength = 3 + dataLength + 2;

        // 如果缓冲区中的数据不够完整帧，等待更多数据
        if (serialBuffer.size() < fullFrameLength) {
            ui->logTextEdit->append("等待更多数据，当前长度: " + QString::number(serialBuffer.size()) +
                                   ", 需要长度: " + QString::number(fullFrameLength));
            break;
        }

        // 提取完整的一帧数据
        QByteArray frame = serialBuffer.left(fullFrameLength);
        serialBuffer = serialBuffer.mid(fullFrameLength); // 从缓冲区移除已处理的数据

        ui->logTextEdit->append("解析完整帧: " + frame.toHex().toUpper());

        // 解析这一帧数据
        parseResponse(frame);
    }
}

void Widget::onNewWebSocketConnection()
{
    QWebSocket *client = webSocketServer->nextPendingConnection();
    ui->logTextEdit->append("新的WebSocket连接: " + client->peerAddress().toString());

    connect(client, &QWebSocket::textMessageReceived,
            this, &Widget::onWebSocketMessageReceived);
    connect(client, &QWebSocket::disconnected,
            this, &Widget::onWebSocketDisconnected);

    clients << client;

    // 发送当前状态给新连接的客户端
    sendStatusToClient(client);
}

void Widget::onWebSocketDisconnected()
{
    QWebSocket *client = qobject_cast<QWebSocket*>(sender());
    if (client) {
        ui->logTextEdit->append("WebSocket连接断开: " + client->peerAddress().toString());
        clients.removeAll(client);
        client->deleteLater();
    }
}

void Widget::onWebSocketMessageReceived(const QString &message)
{
    QWebSocket *client = qobject_cast<QWebSocket*>(sender());
    ui->logTextEdit->append("收到WebSocket消息: " + message);

    // 解析 JSON 消息
    QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
    if (!doc.isNull() && doc.isObject()) {
        QJsonObject obj = doc.object();
        QString type = obj.value("type").toString();

        if (type == "SET_INTERVAL") {
            // 设置发送间隔
            int interval = obj.value("interval").toInt();
            if (interval > 0) {
                sendIntervalMs = interval; // 修正拼写错误
                requestTimer->setInterval(sendIntervalMs);
                ui->logTextEdit->append("设置发送间隔为: " + QString::number(interval) + "ms");

                // 回复客户端
                QJsonObject response;
                response["type"] = "INTERVAL_SET";
                response["interval"] = interval;
                QJsonDocument responseDoc(response);
                client->sendTextMessage(responseDoc.toJson(QJsonDocument::Compact));
            }
        } else if (type == "SEND_NOW") {
            // 立即发送一次请求
            sendRequest();
        } else if (type == "START_AUTO") {
            // 启动自动发送
            requestTimer->start();
            ui->logTextEdit->append("启动自动发送，间隔: " + QString::number(sendIntervalMs) + "ms");

            // 回复客户端
            QJsonObject response;
            response["type"] = "AUTO_STARTED";
            response["interval"] = sendIntervalMs;
            QJsonDocument responseDoc(response);
            client->sendTextMessage(responseDoc.toJson(QJsonDocument::Compact));
        } else if (type == "STOP_AUTO") {
            // 停止自动发送
            requestTimer->stop();
            ui->logTextEdit->append("停止自动发送");

            // 回复客户端
            QJsonObject response;
            response["type"] = "AUTO_STOPPED";
            QJsonDocument responseDoc(response);
            client->sendTextMessage(responseDoc.toJson(QJsonDocument::Compact));
        } else if (type == "GET_STATUS") {
            // 获取当前状态
            sendStatusToClient(client);
        }
    } else {
        // 如果不是 JSON，可能是旧版消息
        if (message == "GET_DATA") {
            sendRequest();
        }
    }
}

// 添加 sendStatusToClient 方法的实现
void Widget::sendStatusToClient(QWebSocket *client)
{
    QJsonObject status;
    status["type"] = "STATUS";
    status["interval"] = sendIntervalMs;
    status["autoSending"] = requestTimer->isActive();
    status["serialOpen"] = serial->isOpen();

    QJsonDocument doc(status);
    client->sendTextMessage(doc.toJson(QJsonDocument::Compact));
}

quint16 Widget::calculateCRC(const QByteArray &data)
{
    quint16 crc = 0xFFFF;
    for (int i = 0; i < data.size(); ++i) {
        crc ^= static_cast<quint8>(data[i]);
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

QByteArray Widget::buildRequest(quint8 address, quint8 functionCode,
                              quint16 startReg, quint16 regCount)
{
    QByteArray request;

    // 添加地址和功能码
    request.append(address);
    request.append(functionCode);

    // 添加起始寄存器地址 (高位在前)
    request.append(static_cast<char>((startReg >> 8) & 0xFF));
    request.append(static_cast<char>(startReg & 0xFF));

    // 添加寄存器数量 (高位在前)
    request.append(static_cast<char>((regCount >> 8) & 0xFF));
    request.append(static_cast<char>(regCount & 0xFF));

    // 计算并添加CRC校验
    quint16 crc = calculateCRC(request);
    request.append(static_cast<char>(crc & 0xFF));       // CRC低字节
    request.append(static_cast<char>((crc >> 8) & 0xFF)); // CRC高字节

    return request;
}

void Widget::sendRequest()
{
    if (!serial->isOpen()) return;

    // 根据协议示例，读取从0x0000开始的0x000C个寄存器
    QByteArray request = buildRequest(0x01, 0x04, 0x0000, 0x000C);
    serial->write(request);

    ui->logTextEdit->append("发送请求: " + request.toHex().toUpper());
}

void Widget::parseResponse(const QByteArray &data)
{
    // 检查数据长度是否有效（至少5字节）
    if (data.size() < 5) {
        ui->logTextEdit->append("响应数据太短，无效");
        return;
    }

    // 验证地址和功能码
    quint8 address = static_cast<quint8>(data[0]);
    quint8 functionCode = static_cast<quint8>(data[1]);
    quint8 dataLength = static_cast<quint8>(data[2]);

    // 检查帧长度是否正确
    if (data.size() != 3 + dataLength + 2) {
        ui->logTextEdit->append("帧长度不正确，实际: " + QString::number(data.size()) +
                               ", 预期: " + QString::number(3 + dataLength + 2));
        return;
    }

    if (address != 0x01 || functionCode != 0x04) {
        ui->logTextEdit->append("响应地址或功能码不匹配");
        return;
    }

    // 验证CRC
    QByteArray dataWithoutCRC = data.left(data.size() - 2);
    quint16 receivedCRC = static_cast<quint8>(data[data.size() - 2]) |
                         (static_cast<quint8>(data[data.size() - 1]) << 8);
    quint16 calculatedCRC = calculateCRC(dataWithoutCRC);

    if (receivedCRC != calculatedCRC) {
        ui->logTextEdit->append("CRC校验失败，接收: " + QString::number(receivedCRC, 16) +
                               ", 计算: " + QString::number(calculatedCRC, 16));
        return;
    }

    // 解析数据 - 根据协议说明
    if (dataLength >= 24) { // 24字节 = 6个32位寄存器 × 4字节
        // 解析铁芯电流值 (偏移3开始的4字节)
        quint32 coreCurrent =
            (static_cast<quint8>(data[3]) << 0) |
            (static_cast<quint8>(data[4]) << 8) |
            (static_cast<quint8>(data[5]) << 16) |
            (static_cast<quint8>(data[6]) << 24);

        // 解析夹件电流值
        quint32 clampCurrent =
            (static_cast<quint8>(data[7]) << 0) |
            (static_cast<quint8>(data[8]) << 8) |
            (static_cast<quint8>(data[9]) << 16) |
            (static_cast<quint8>(data[10]) << 24);

        // 解析备用电流值
        quint32 standbyCurrent =
            (static_cast<quint8>(data[11]) << 0) |
            (static_cast<quint8>(data[12]) << 8) |
            (static_cast<quint8>(data[13]) << 16) |
            (static_cast<quint8>(data[14]) << 24);

        // 显示解析结果
        QString log = QString("解析结果: 铁芯电流=%1uA, 夹件电流=%2uA, 备用电流=%3uA")
                        .arg(coreCurrent).arg(clampCurrent).arg(standbyCurrent);
        ui->logTextEdit->append(log);

        // 向前端发送数据
        QString jsonData = QString("{\"coreCurrent\": %1, \"clampCurrent\": %2, \"standbyCurrent\": %3}")
                            .arg(coreCurrent).arg(clampCurrent).arg(standbyCurrent);

        foreach (QWebSocket *client, clients) {
            if (client->state() == QAbstractSocket::ConnectedState) {
                client->sendTextMessage(jsonData);
            }
        }
    } else {
        ui->logTextEdit->append("数据长度不足，无法完全解析，实际长度: " + QString::number(dataLength));
    }
}
