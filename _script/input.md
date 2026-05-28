## React useState 完整教程

下面演示 React 中 `useState` 的用法。

代码如下：
javascript

```

import React, { useState } from 'react';

function Counter() {

  const [count, setCount] = useState(0);
  
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```
注意几个关键点 ** 重点 ** ：

-   状态是 **不可变** 的

-    更新需要调用 setter 函数

如果你想用 TypeScript：


typescript

运行

```
const [count, setCount] = useState<number>(0);
```


## 配置文件示例

下面是 `package.json` 的一个片段：

json

```
{
  "name": "demo",
  "version": "1.0.0"
}
```

---

参考：[React 文档](https://react.dev) 和公式 $E = mc^2$。

> 这是引用提示
> 多行引用
> 后面是普通段落，不应被合并到引用里。

1. 第一步

2. 第二步

- 无序列表项 A

- 无序列表项 B
