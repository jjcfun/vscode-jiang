# vscode-jiang

Jiang 语言的 VS Code 语法高亮扩展。

## 功能

- `.jiang` 文件关联
- `//` 单行注释高亮
- 字符串、数字、关键字、运算符高亮
- `struct / enum / union / record / trait / type` 声明高亮
- 内建类型与 PascalCase 类型名高亮
- `new User(...)`、`Point { ... }` 这类构造器高亮
- `.ok`、`.a(42)` 这类 enum/union shorthand 变体高亮
- `value$.as(Int)`、`Type$.alloc()` 这类隐式层调用高亮
- 泛型参数、函数名、成员访问、标签参数高亮

## 本地安装

### 方式一：作为未打包扩展直接加载

把当前目录软链接到 VS Code 扩展目录：

```bash
mkdir -p ~/.vscode/extensions
ln -s "$(pwd)/vscode-jiang" ~/.vscode/extensions/local.vscode-jiang
```

然后重启 VS Code，或执行 `Developer: Reload Window`。

### 方式二：以扩展开发模式运行

1. 在 VS Code 中打开 `vscode-jiang`
2. 按 `F5`
3. 在新打开的 Extension Development Host 中打开任意 `.jiang` 文件

## 打包

如果要打成 `.vsix`：

```bash
cd vscode-jiang
npx @vscode/vsce package
```

生成后的文件会出现在当前目录，例如 `vscode-jiang-0.1.0.vsix`。

## 目录结构

```text
vscode-jiang/
  examples/
    demo.jiang
  media/
    logo.svg
  package.json
  language-configuration.json
  syntaxes/
    jiang.tmLanguage.json
```

## 示例

仓库自带一个高亮验收文件：[examples/demo.jiang](./examples/demo.jiang)。

可以直接用 VS Code 打开这个文件，快速检查：

- 声明关键字和控制流关键字
- 类型名、泛型参数、构造器
- `.ok` / `.err` 这类 shorthand 变体
- `$.as(...)` 这类隐式层调用
- 标签参数、字符串、数字、成员访问和运算符

## 图标

当前仓库使用 [media/logo.svg](./media/logo.svg) 作为扩展 logo。
