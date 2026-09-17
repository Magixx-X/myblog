---
title: 开机跳过硬盘自检
date: 2025-01-06
category: 桌面运维
tags: [Windows, BIOS, 注册表, 硬盘]
summary: "开机自检会让每次启动多等十几秒。两条路：清空注册表里的 BootExecute，或者进 BIOS 打开 Quick Boot。"
---

开机时那段"硬盘自检"是主板在启动阶段对磁盘做的检测。它通常并不解决任何问题，只是让每次开机多花十几秒。关掉它有两条路：改注册表，或者进 BIOS。

## 方法一：修改注册表

适合不想进 BIOS、或者 BIOS 里没有相关选项的机器。

1. 按 `Win + R` 打开"运行"窗口，输入 `regedit` 回车，打开注册表编辑器。
2. 定位到下面的路径：

   ```
   HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager
   ```

3. 在右侧窗口找到 `BootExecute` 键值，双击打开。
4. 把"数值数据"清空，点确定，然后重启电脑。

> `BootExecute` 默认是 `autocheck autochk *`，也就是"开机自动检查磁盘"。清空这个值，这条检查就不再被触发。

## 方法二：修改 BIOS 设置

1. 开机时按 `Del` 或 `F2` 进入 BIOS 设置界面（具体按键因品牌而异）。
2. 找到 `Boot`（启动）选项，一般在菜单的顶部或底部。
3. 在 `Boot` 里找到 `Quick Boot`（快速启动），把它设为启用。
4. 按 `F10` 保存并退出，电脑重启后自检就会被取消。

两种方法不冲突，注册表改完之后如果还觉得慢，可以顺手把 BIOS 里的 Quick Boot 也打开。
