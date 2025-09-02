#include "genericdevicewidget.h"
#include "ui_genericdevicewidget.h"
#include <QSerialPortInfo>
#include <QMessageBox>
#include <QDateTime>
#include <QDataStream>

GenericDeviceWidget::GenericDeviceWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::GenericDeviceWidget),
    m_serialPort(new QSerialPort(this)),
    m_currentState(AppState::Idle),
    m_currentDeviceCode(0)
{
    ui->setupUi(this);
    initUiSettings();
    initSerialPort();

    connect(ui->returnButton, &QPushButton::clicked, this, &GenericDeviceWidget::returnToHomeRequested);
}

GenericDeviceWidget::~GenericDeviceWidget()
{
    delete ui;
}

void GenericDeviceWidget::initUiSettings()
{
    const auto ports = QSerialPortInfo::availablePorts();
    for (const QSerialPortInfo &port : ports) {
        ui->portComboBox->addItem(port.portName());
    }
    ui->baudComboBox->addItems({"9600", "19200", "38400", "57600", "115200"});
    ui->baudComboBox->setCurrentText("9600");

    m_deviceCodes.insert("变压器局放", 0x5209);
    m_deviceCodes.insert("油色谱", 0x520a);
    m_deviceCodes.insert("铁芯", 0x520c);
    m_deviceCodes.insert("开关柜测温", 0x5210);
    m_deviceCodes.insert("避雷器", 0x59d9);
    m_deviceCodes.insert("荧光光纤", 0x520E);
    m_deviceCodes.insert("GIS局放", 0x5DC1);
    m_deviceCodes.insert("微水", 0x520b);
    ui->deviceComboBox->addItems(m_deviceCodes.keys());

    updateUiState(false);
}

void GenericDeviceWidget::initSerialPort()
{
    connect(m_serialPort, &QSerialPort::readyRead, this, &GenericDeviceWidget::readDataFromSerial);
}

void GenericDeviceWidget::updateUiState(bool isOpen)
{
    ui->portComboBox->setEnabled(!isOpen);
    ui->baudComboBox->setEnabled(!isOpen);
    ui->openPortButton->setEnabled(!isOpen);
    ui->closePortButton->setEnabled(isOpen);
    ui->startButton->setEnabled(isOpen);
}

void GenericDeviceWidget::logMessage(const QString &msg)
{
    ui->logTextEdit->appendPlainText(QDateTime::currentDateTime().toString("[yyyy-MM-dd hh:mm:ss.zzz] ") + msg);
}

void GenericDeviceWidget::on_openPortButton_clicked()
{
    m_serialPort->setPortName(ui->portComboBox->currentText());
    m_serialPort->setBaudRate(ui->baudComboBox->currentText().toInt());
    m_serialPort->setDataBits(QSerialPort::Data8);
    m_serialPort->setParity(QSerialPort::NoParity);
    m_serialPort->setStopBits(QSerialPort::OneStop);
    m_serialPort->setFlowControl(QSerialPort::NoFlowControl);

    if (m_serialPort->open(QIODevice::ReadWrite)) {
        updateUiState(true);
        logMessage("串口 " + m_serialPort->portName() + " 打开成功。");
    } else {
        QMessageBox::critical(this, "错误", m_serialPort->errorString());
        logMessage("错误: " + m_serialPort->errorString());
    }
}

void GenericDeviceWidget::on_closePortButton_clicked()
{
    if (m_serialPort->isOpen()) {
        m_serialPort->close();
    }
    updateUiState(false);
    logMessage("串口已关闭。");
}

void GenericDeviceWidget::on_startButton_clicked()
{
    if (m_currentState != AppState::Idle) {
        logMessage("警告: 当前正忙，请等待上一条指令完成。");
        return;
    }
    QString currentDeviceName = ui->deviceComboBox->currentText();
    m_currentDeviceCode = m_deviceCodes.value(currentDeviceName, 0);
    if (m_currentDeviceCode == 0) {
        logMessage("错误: 无效的设备类型。");
        return;
    }
    QByteArray command;
    command.append(static_cast<char>(0x01));
    command.append(static_cast<char>(0x06));
    command.append(static_cast<char>(0x00));
    command.append(static_cast<char>(0x01));
    command.append(static_cast<char>((m_currentDeviceCode >> 8) & 0xFF));
    command.append(static_cast<char>(m_currentDeviceCode & 0xFF));
    sendSerialCommand(command);
    m_currentState = AppState::WaitingForDeviceSelectionAck;
}

void GenericDeviceWidget::readDataFromSerial()
{
    m_receivedBuffer.append(m_serialPort->readAll());
    if (m_receivedBuffer.length() < 5) return;
    logMessage("接收: " + m_receivedBuffer.toHex(' ').toUpper());
    parseResponse(m_receivedBuffer);
    m_receivedBuffer.clear();
}

void GenericDeviceWidget::sendSerialCommand(const QByteArray &command)
{
    if (!m_serialPort->isOpen()) {
        logMessage("错误: 串口未打开，无法发送指令。");
        m_currentState = AppState::Idle;
        return;
    }
    QByteArray commandWithCrc = command;
    quint16 crc = calculateModbusCrc(command);
    // Modbus RTU CRC: 低字节在前，高字节在后
    commandWithCrc.append(static_cast<char>(crc & 0xFF));
    commandWithCrc.append(static_cast<char>((crc >> 8) & 0xFF));
    m_serialPort->write(commandWithCrc);
    logMessage("发送: " + commandWithCrc.toHex(' ').toUpper());
}

quint16 GenericDeviceWidget::calculateModbusCrc(const QByteArray &data) const
{
    quint16 crc = 0xFFFF;
    const uchar *cdata = reinterpret_cast<const uchar *>(data.constData());
    for (int i = 0; i < data.length(); ++i) {
        crc ^= cdata[i];
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

void GenericDeviceWidget::parseResponse(const QByteArray &buffer)
{
    if (buffer.length() < 2) return;

    QByteArray dataToCheck = buffer.left(buffer.length() - 2);
    quint16 calculatedCrc = calculateModbusCrc(dataToCheck);

    // 获取接收到的CRC字节
    quint8 receivedCrcLow = static_cast<unsigned char>(buffer.at(buffer.length() - 2));
    quint8 receivedCrcHigh = static_cast<unsigned char>(buffer.at(buffer.length() - 1));

    // 计算出的CRC字节（Modbus RTU格式：低字节在前，高字节在后）
    quint8 calculatedCrcLow = calculatedCrc & 0xFF;
    quint8 calculatedCrcHigh = (calculatedCrc >> 8) & 0xFF;

    if (receivedCrcLow != calculatedCrcLow || receivedCrcHigh != calculatedCrcHigh) {
        logMessage(QString("CRC校验失败! 接收字节: %1 %2, 计算字节: %3 %4")
                       .arg(QString::number(receivedCrcLow, 16).toUpper().rightJustified(2, '0'))
                       .arg(QString::number(receivedCrcHigh, 16).toUpper().rightJustified(2, '0'))
                       .arg(QString::number(calculatedCrcLow, 16).toUpper().rightJustified(2, '0'))
                       .arg(QString::number(calculatedCrcHigh, 16).toUpper().rightJustified(2, '0')));
        m_currentState = AppState::Idle;
        return;
    }

    // CRC校验通过，继续处理
    switch (m_currentState)
    {
        case AppState::WaitingForDeviceSelectionAck:
        {
            logMessage("设备选择成功, 请求设备信息...");
            QByteArray command;
            command.append(static_cast<char>(0x01));
            command.append(static_cast<char>(0x03));
            command.append(static_cast<char>(0x00));
            command.append(static_cast<char>(0x02));
            command.append(static_cast<char>(0x00));
            command.append(static_cast<char>(0x07));
            sendSerialCommand(command);
            m_currentState = AppState::WaitingForDeviceInfo;
            break;
        }
        case AppState::WaitingForDeviceInfo:
        {
             if (buffer.length() < 19) {
                 logMessage("错误: 获取设备信息的返回报文长度不足。");
                 m_currentState = AppState::Idle;
                 return;
            }
            logMessage("获取设备信息成功, 请求设备数据...");

            // 直接读取寄存器数量，而不是通过起止地址计算
            // '单个设备的寄存器数量' 位于返回数据中的第3个寄存器 (地址4),
            // 对应数据区字节偏移量为4，即buffer索引7和8.
            quint16 numRegs = (static_cast<unsigned char>(buffer[7]) << 8) | static_cast<unsigned char>(buffer[8]);

            // '寄存器起始地址' 位于返回数据中的第6个寄存器 (地址7),
            // 对应数据区字节偏移量为10，即buffer索引13和14.
            quint16 startAddr = (static_cast<unsigned char>(buffer[13]) << 8) | static_cast<unsigned char>(buffer[14]);

            QByteArray command;
            command.append(static_cast<char>(0x01));
            command.append(static_cast<char>(0x03));
            command.append(static_cast<char>((startAddr >> 8) & 0xFF));
            command.append(static_cast<char>(startAddr & 0xFF));
            command.append(static_cast<char>((numRegs >> 8) & 0xFF));
            command.append(static_cast<char>(numRegs & 0xFF));
            sendSerialCommand(command);
            m_currentState = AppState::WaitingForData;
            break;
        }
        case AppState::WaitingForData:
        {
            logMessage("接收到设备数据，开始解析...");
            QByteArray dataPayload = buffer.mid(3, buffer.size() - 5);
            if (m_currentDeviceCode == 0x5DC1 || m_currentDeviceCode == 0x5209) {
                parsePartialDischarge(dataPayload);
            } else if (m_currentDeviceCode == 0x520b) {
                parseMicroWater(dataPayload);
            } else {
                logMessage("注意: 尚未实现该设备的数据解析: " + QString::number(m_currentDeviceCode, 16));
            }
            logMessage("本次采集流程结束。");
            m_currentState = AppState::Idle;
            break;
        }
        default:
            break;
    }
}

void GenericDeviceWidget::parsePartialDischarge(const QByteArray &data)
{
    if(data.length() < 22) { logMessage("局放数据长度不足"); return; }
    QDataStream stream(data);
    stream.setByteOrder(QDataStream::BigEndian);
    quint32 time; quint16 type, freq, amount, strength, hasSignal, comm, alarm; quint32 total;
    stream >> time >> type >> freq >> total >> amount >> strength >> hasSignal >> comm >> alarm;
    ui->tabWidget->setCurrentWidget(ui->pdTab);
    ui->pdTimeLineEdit->setText(QDateTime::fromSecsSinceEpoch(time).toString("yyyy-MM-dd hh:mm:ss"));
    ui->pdTypeLineEdit->setText(QString::number(type));
    ui->pdFreqLineEdit->setText(QString::number(freq));
    ui->pdTotalLineEdit->setText(QString::number(total));
    ui->pdAmountLineEdit->setText(QString::number(amount * 0.01, 'f', 2));
    ui->pdStrengthLineEdit->setText(QString::number(strength));
    ui->pdCommStatusLineEdit->setText(QString::number(comm));
    ui->pdAlarmStatusLineEdit->setText(QString::number(alarm));
    logMessage("局放数据解析完成。");
}

void GenericDeviceWidget::parseMicroWater(const QByteArray &data)
{
    if(data.length() < 18) { logMessage("微水数据长度不足"); return; }
    QDataStream stream(data);
    stream.setByteOrder(QDataStream::BigEndian);
    quint32 time; quint16 temp, pressure, density, microWater, dewPoint, comm, alarm;
    stream >> time >> temp >> pressure >> density >> microWater >> dewPoint >> comm >> alarm;
    ui->tabWidget->setCurrentWidget(ui->mwTab);
    ui->mwTimeLineEdit->setText(QDateTime::fromSecsSinceEpoch(time).toString("yyyy-MM-dd hh:mm:ss"));
    ui->mwTempLineEdit->setText(QString::number(temp * 0.01, 'f', 2));
    ui->mwPressureLineEdit->setText(QString::number(pressure * 0.01, 'f', 2));
    ui->mwDensityLineEdit->setText(QString::number(density * 0.01, 'f', 2));
    ui->mwMicroWaterLineEdit->setText(QString::number(microWater * 0.01, 'f', 2));
    ui->mwDewPointLineEdit->setText(QString::number(dewPoint * 0.01, 'f', 2));
    ui->mwCommStatusLineEdit->setText(QString::number(comm));
    ui->mwAlarmStatusLineEdit->setText(QString::number(alarm));
    logMessage("微水数据解析完成。");
}
