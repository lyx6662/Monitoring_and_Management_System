#include "mainwindow.h"
#include "ui_mainwindow.h"
#include <QPushButton>
#include <QVBoxLayout>
#include <QLabel>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::MainWindow)
{
    ui->setupUi(this);
    setWindowTitle("设备监测系统");

    stackedWidget = new QStackedWidget(this);
    setCentralWidget(stackedWidget);

    // --- 创建主页 ---
    QWidget *homePage = new QWidget();
    QVBoxLayout *homeLayout = new QVBoxLayout(homePage);
    QLabel *titleLabel = new QLabel("设备监测系统");
    titleLabel->setAlignment(Qt::AlignCenter);
    titleLabel->setStyleSheet("font-size: 24px; font-weight: bold; margin: 20px;");

    // 主页按钮1
    QPushButton *serialCommButton = new QPushButton("铁芯接地电流检测");
    serialCommButton->setMinimumHeight(60);
    serialCommButton->setStyleSheet("font-size: 16px;");

    // 修改: 将通用按钮替换为两个专用按钮
    QPushButton *pdButton = new QPushButton("变压器局放监测");
    pdButton->setMinimumHeight(60);
    pdButton->setStyleSheet("font-size: 16px;");

    QPushButton *mwButton = new QPushButton("微水监测");
    mwButton->setMinimumHeight(60);
    mwButton->setStyleSheet("font-size: 16px;");


    homeLayout->addWidget(titleLabel);
    homeLayout->addStretch();
    homeLayout->addWidget(serialCommButton);
    // 修改: 添加两个新按钮到布局
    homeLayout->addWidget(pdButton);
    homeLayout->addWidget(mwButton);
    homeLayout->addStretch();


    // --- 创建各个功能页面 ---
    serialCommWidget = new Widget();
    // 修改: 创建新页面实例
    partialDischargeWidget = new PartialDischargeWidget();
    microWaterWidget = new MicroWaterWidget();

    // --- 将所有页面添加到堆叠窗口 ---
    stackedWidget->addWidget(homePage);
    stackedWidget->addWidget(serialCommWidget);
    // 修改: 添加新页面
    stackedWidget->addWidget(partialDischargeWidget);
    stackedWidget->addWidget(microWaterWidget);

    // --- 连接信号和槽 ---
    connect(serialCommButton, &QPushButton::clicked, this, &MainWindow::showSerialCommPage);
    connect(serialCommWidget, &Widget::returnToHomeRequested, this, &MainWindow::showHomePage);

    // 修改: 连接新页面的信号和槽
    connect(pdButton, &QPushButton::clicked, this, &MainWindow::showPartialDischargePage);
    connect(partialDischargeWidget, &PartialDischargeWidget::returnToHomeRequested, this, &MainWindow::showHomePage);

    connect(mwButton, &QPushButton::clicked, this, &MainWindow::showMicroWaterPage);
    connect(microWaterWidget, &MicroWaterWidget::returnToHomeRequested, this, &MainWindow::showHomePage);


    // 默认显示主页
    showHomePage();
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::showSerialCommPage()
{
    stackedWidget->setCurrentWidget(serialCommWidget);
}

void MainWindow::showHomePage()
{
    stackedWidget->setCurrentIndex(0);
}

// 新增: 实现新页面的跳转槽函数
void MainWindow::showPartialDischargePage()
{
    stackedWidget->setCurrentWidget(partialDischargeWidget);
}

void MainWindow::showMicroWaterPage()
{
    stackedWidget->setCurrentWidget(microWaterWidget);
}