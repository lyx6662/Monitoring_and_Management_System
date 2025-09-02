QT       += core gui serialport websockets

greaterThan(QT_MAJOR_VERSION, 4): QT += widgets

TARGET = SerialComm
TEMPLATE = app

# 保持你原有的文件不变
SOURCES += \
    main.cpp \
    mainwindow.cpp \
    widget.cpp

HEADERS += \
    mainwindow.h \
    widget.h

FORMS += \
    mainwindow.ui \
    widget.ui

# 新增: 添加新页面的源文件、头文件和UI文件
SOURCES += genericdevicewidget.cpp
HEADERS += genericdevicewidget.h
FORMS += genericdevicewidget.ui

# 确保中文显示正常
DEFINES += QT_DEPRECATED_WARNINGS