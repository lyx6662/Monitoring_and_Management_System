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
    // 修正：将 title_label 修改为 titleLabel
    titleLabel->setStyleSheet("font-size: 24px; font-weight: bold; margin: 20px;");

    // 主页按钮1
    QPushButton *serialCommButton = new QPushButton("铁芯接地电流检测");
    serialCommButton->setMinimumHeight(60);
    serialCommButton->setStyleSheet("font-size: 16px;");

    // 新增: 主页按钮2
    QPushButton *genericDeviceButton = new QPushButton("通用设备监测 (局放、微水等)");
    genericDeviceButton->setMinimumHeight(60);
    genericDeviceButton->setStyleSheet("font-size: 16px;");

    homeLayout->addWidget(titleLabel);
    homeLayout->addStretch();
    homeLayout->addWidget(serialCommButton);
    homeLayout->addWidget(genericDeviceButton); // 新增: 添加按钮到布局
    homeLayout->addStretch();


    // --- 创建各个功能页面 ---
    serialCommWidget = new Widget();
    genericDeviceWidget = new GenericDeviceWidget(); // 新增: 创建新页面实例

    // --- 将所有页面添加到堆叠窗口 ---
    stackedWidget->addWidget(homePage);
    stackedWidget->addWidget(serialCommWidget);
    stackedWidget->addWidget(genericDeviceWidget); // 新增: 添加新页面

    // --- 连接信号和槽 ---
    connect(serialCommButton, &QPushButton::clicked, this, &MainWindow::showSerialCommPage);
    connect(serialCommWidget, &Widget::returnToHomeRequested, this, &MainWindow::showHomePage);

    // 新增: 连接新页面的信号和槽
    connect(genericDeviceButton, &QPushButton::clicked, this, &MainWindow::showGenericDevicePage);
    connect(genericDeviceWidget, &GenericDeviceWidget::returnToHomeRequested, this, &MainWindow::showHomePage);


    // 默认显示主页
    showHomePage();
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::showSerialCommPage()
{
    // 使用 setCurrentWidget 更清晰
    stackedWidget->setCurrentWidget(serialCommWidget);
}

void MainWindow::showHomePage()
{
    // index 0 是主页
    stackedWidget->setCurrentIndex(0);
}

// 新增: 实现新页面的跳转槽函数
void MainWindow::showGenericDevicePage()
{
    stackedWidget->setCurrentWidget(genericDeviceWidget);
}
