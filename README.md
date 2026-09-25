<p align="center">
  <img src="./media/logo.png" alt="Jiang logo" width="180">
</p>

# vscode-jiang

Jiang 语言的 VS Code 扩展。语法高亮由扩展提供；诊断、跳转定义、悬停和基础补全由
Jiang 编译器的常驻 `jiang lsp` 进程提供。

## 功能

- `.jiang` 文件关联
- 未保存文件的诊断、跳转定义、悬停和基础名称补全（需要 Jiang 0.6.0 开发版编译器）
- `//` 单行注释高亮
- 字符串、数字、关键字、运算符高亮
- `struct / enum / union / trait / type` 声明高亮
- 内建类型与 PascalCase 类型名高亮
- `new User(...)`、`Point(x: 1, y: 2)` 这类构造器高亮
- `@region(...)`、`@life(...)`、`@where(...)` 这类 annotation 高亮
- `{ value => ... }` brace closure 和尾随闭包中的 `=>` 高亮
- `.ok`、`.a(42)` 这类 enum/union shorthand 变体高亮
- `value$.as(Int)`、`Type$.alloc()` 这类隐式层调用高亮
- 泛型参数、函数名、成员访问、标签参数高亮

## 本地安装

### 方式一：作为未打包扩展直接加载

把当前目录软链接到 VS Code 扩展目录：

```bash
mkdir -p ~/.vscode/extensions
ln -s "$(pwd)" ~/.vscode/extensions/local.vscode-jiang
```

然后重启 VS Code，或执行 `Developer: Reload Window`。

### 方式二：以扩展开发模式运行

1. 在本仓库运行 `npm install`
2. 在 VS Code 中打开 `vscode-jiang`
3. 在「运行」菜单选择 **Run Without Debugging**（以非调试模式运行）；本机的 F5 调试器可能无法连接扩展宿主
4. 新打开的 Extension Development Host 会以本仓库为工作区；在资源管理器中打开 `examples/demo.jiang`

启动配置使用 `examples/demo.code-workspace` 打开仓库。若之前的开发宿主窗口仍停留在“尚未打开文件夹”，
先关闭那个窗口，再从主窗口重新运行；停止运行不会自动关闭旧窗口。

## LSP 开发版配置

语法高亮无需编译器。使用 LSP 时，扩展在 `.jiang` 文件打开后启动一个 `jiang lsp` 进程。
安装支持 LSP 的 Jiang CLI 并将其 `bin` 目录加入 `PATH` 后，无需配置路径。如果没有加入 `PATH`，
在 VS Code 设置界面搜索 **Jiang: Server Path**，填入 `jiang` 可执行文件的绝对路径；
也可以在用户设置 JSON 中写入：

```json
{
  "jiang.serverPath": "/absolute/path/to/jiang/bin/jiang"
}
```

为兼容已有配置，这个设置也接受 CLI 的 `bin` 目录。扩展会从可执行文件位置定位随 CLI
安装的标准库和内建源码；用户无需配置源码仓库路径。当前 0.5.6 CLI 不支持 LSP，需要 0.6.0 开发版或后续版本。
语言服务器只处理本地文件。修改设置后请重新加载 VS Code 窗口；若仍无语义功能，
在「输出」面板选择 **Jiang Language Server** 查看服务器错误。

在 `examples/demo.jiang` 中，对 `helper.answer()` 的 `answer` 执行 **Go to Definition**，
应跳到 `examples/helper.jiang`；在 `main` 内输入 `sco` 并按 `Ctrl+Space` 应看到 `score` 候选。
把 `helper.jiang` 的 `answer` 临时改成 `wrong`，`demo.jiang` 应出现诊断；改回后诊断应消失。

使用本地 VS Code 运行集成测试：

```sh
JIANG_LSP_BIN=/absolute/path/to/jiang \
npm run test:integration
```

测试覆盖未保存编辑后的诊断、跳转定义和补全，以及示例文件的跨文件导入。
可用 `JIANG_VSCODE_BIN` 指定 VS Code 可执行文件。

## 打包

如果要打成 `.vsix`：

```bash
cd vscode-jiang
npx @vscode/vsce package
```

生成后的文件会出现在当前目录，例如 `vscode-jiang-0.1.1.vsix`。

## 目录结构

```text
vscode-jiang/
  examples/
    demo.code-workspace
    demo.jiang
    helper.jiang
  media/
    logo.png
    logo.svg
  extension.js
  test/
  package.json
  language-configuration.json
  syntaxes/
    jiang.tmLanguage.json
```

## 示例

仓库自带一个可通过编译器检查的 LSP 验收文件：[examples/demo.jiang](./examples/demo.jiang)，
并导入 [examples/helper.jiang](./examples/helper.jiang)。

可以直接用 VS Code 打开这个文件，快速检查：

- 声明关键字和控制流关键字
- 类型名、泛型参数、构造器
- `.ok` / `.err` 这类 enum payload 变体
- `$.as(...)` 这类隐式层调用
- 标签参数、字符串、数字、成员访问和运算符

## 图标

当前仓库使用 [media/logo.png](./media/logo.png) 作为扩展 logo，保留 [media/logo.svg](./media/logo.svg) 作为矢量源文件。
