#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QStackedWidget>
#include "widget.h"
#include "genericdevicewidget.h" // 新增: 包含新页面的头文件

QT_BEGIN_NAMESPACE
namespace Ui {
class MainWindow;
}
QT_END_NAMESPACE

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void showSerialCommPage();
    void showHomePage();
    void showGenericDevicePage(); // 新增: 跳转到通用设备页面的槽

private:
    Ui::MainWindow *ui;
    QStackedWidget *stackedWidget;
    Widget *serialCommWidget;
   GenericDeviceWidget *genericDeviceWidget; // 新增: 新页面的成员指针
};
#endif // MAINWINDOW_H
