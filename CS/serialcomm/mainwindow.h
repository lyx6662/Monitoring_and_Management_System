#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QStackedWidget>
#include "widget.h"
// 新增: 包含新页面的头文件
#include "partialdischargewidget.h"
#include "microwaterwidget.h"

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
    // 新增: 跳转到新页面的槽函数
    void showPartialDischargePage();
    void showMicroWaterPage();

private:
    Ui::MainWindow *ui;
    QStackedWidget *stackedWidget;
    Widget *serialCommWidget;
    // 新增: 新页面的成员指针
    PartialDischargeWidget *partialDischargeWidget;
    MicroWaterWidget *microWaterWidget;
};
#endif // MAINWINDOW_H