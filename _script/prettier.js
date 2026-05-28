const fs = require('fs');
const path = require('path');

/**
 * AI Markdown 格式化核心函数
 * @param {string} rawMarkdown 原始文本
 * @param {boolean} strictDeleteEmptyLines 是否严格删除所有空行（默认 true）
 */
function formatAiMarkdown(rawMarkdown, strictDeleteEmptyLines = true) {
    if (!rawMarkdown) return '';

    // 1. 统一换行符
    let text = rawMarkdown.replace(/\r\n/g, '\n');

    // 已知编程语言名集合（仅当独立成行时才会被识别为语言标签）
    const knownLanguages = new Set([
        'javascript', 'js', 'typescript', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'less',
        'python', 'py', 'java', 'cpp', 'c++', 'c', 'csharp', 'cs', 'go', 'golang', 'rust', 'rs',
        'php', 'ruby', 'rb', 'swift', 'kotlin', 'kt', 'dart', 'scala', 'perl', 'pl', 'lua', 'r',
        'shell', 'sh', 'bash', 'zsh', 'powershell', 'ps1', 'bat', 'cmd', 'makefile', 'dockerfile', 'docker',
        'json', 'yaml', 'yml', 'xml', 'toml', 'ini', 'csv', 'markdown', 'md',
        'sql', 'mysql', 'postgresql', 'pgsql', 'oracle', 'plsql', 'sqlite', 'mongodb', 'redis', 'graphql',
        'text', 'plain', 'diff', 'vba', 'vb', 'assembly', 'asm', 'latex', 'tex', 'matlab'
    ]);

    const independentTrashWords = new Set([
        '运行', '编译', '复制', '或者', '代码如下', '如下', '执行', '代码', '示例', '核心代码', '完整代码'
    ]);

    // 2. 隔离代码块与普通文本（使用精准切分，保留完整代码块结构）
    const parts = text.split(/(```[\s\S]*?```)/g);

    const formattedParts = parts.map((part) => {
        // 如果是代码块：保护内部结构
        if (part.startsWith('```') && part.endsWith('```')) {
            const match = part.match(/^```([^\n]*)\n([\s\S]*?)```$/);
            if (match) {
                let lang = match[1].trim().toLowerCase();
                let code = match[2];

                // 【关键修复】：擦除 ``` 与语言名之间的空格/空行
                // 例如 "```\n\njavascript\nconst x=1;\n```" → "```javascript\nconst x=1;\n```"
                // 仅当 ``` 后无语言名、且代码内首个非空行是独立成行的已知语言名时触发
                if (!lang) {
                    let codeLines = code.split('\n');
                    let skip = 0;
                    while (skip < codeLines.length && codeLines[skip].trim() === '') {
                        skip++;
                    }
                    if (skip < codeLines.length) {
                        let candidate = codeLines[skip].trim().toLowerCase();
                        if (knownLanguages.has(candidate)) {
                            lang = candidate;
                            code = codeLines.slice(skip + 1).join('\n');
                        }
                    }
                }

                if (lang === 'c++') lang = 'cpp';

                // strict 模式：删除代码块内部所有空行；宽松模式只去除首尾空白
                if (strictDeleteEmptyLines) {
                    code = code.split('\n').filter(line => line.trim() !== '').join('\n');
                } else {
                    code = code.trim();
                }

                return `\`\`\`${lang}\n${code}\n\`\`\``;
            }
            return part;
        }
        
        // 如果是普通文本区：清洗布局
        else {
            let content = part;

            // 修复加粗语法内部的死空格 (如: ** 重点 **) -> 保证不吞噬重点
            // 仅用一条规则：要求加粗内容首尾都是非星号非空白字符，长度 >= 2。
            // 不再用单字符版本（曾导致 `**A** 的 **B**` 中间空格被误吞）。
            content = content.replace(/\*\*\s*([^* \t\n][^*]*?[^* \t\n])\s*\*\*/g, '**$1**');

            // 修复列表符号后多余的空格 (如: -    列表项)
            content = content.replace(/^(\s*[-*+]\s+)\s+/gm, '$1');
            content = content.replace(/^(\s*\d+\.\s+)\s+/gm, '$1');

            // 拆分成行进行过滤，确保含有行内代码 ` text` 或公式 $alpha$ 的行绝不被删除
            let lines = content.split('\n');
            let cleanedLines = [];

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                let trimmed = line.trim();

                // 如果是空行
                if (trimmed === '') {
                    if (!strictDeleteEmptyLines) {
                        cleanedLines.push('');
                    }
                    continue;
                }

                // 修复行内公式内侧空格: $  xx x $ → $xx x$
                // 仅匹配成对的单 $，跳过 $$...$$ 块公式。
                // 触发条件（保守，避免把"$ 5 和 $ 10"这类货币片段误配成公式）：
                //   1) 两侧都紧贴空白
                //   2) 去空白后首尾非数字
                line = line.replace(/(?<!\$)\$([^\n$]+?)\$(?!\$)/g, (m, inner) => {
                    if (!/^\s/.test(inner) || !/\s$/.test(inner)) return m;
                    const trimmed = inner.replace(/^\s+|\s+$/g, '');
                    if (/^\d|\d$/.test(trimmed)) return m;
                    return '$' + trimmed + '$';
                });

                // 【安全保护】：如果行内包含 `（行内代码）或 $（公式），绝对不删除
                if (line.includes('`') || line.includes('$')) {
                    cleanedLines.push(line.trimEnd());
                    continue;
                }

                cleanedLines.push(line.trimEnd());
            }

            return cleanedLines.join('\n');
        }
    });

    // 3. 上下文联动：逆向状态机，擦除独立成行的“外抛语言”和“废话”
    //    注意：knownLanguages / independentTrashWords 已在函数顶部声明
    //    这里依赖 prevLines[j].trim().toLowerCase() + Set.has() 做整行精确匹配，
    //    正文中包含 "javascript" 等子串不会被误删。
    for (let i = 0; i < formattedParts.length; i++) {
        if (formattedParts[i].startsWith('```') && i > 0) {
            let prevText = formattedParts[i - 1];
            let prevLines = prevText.split('\n');
            
            let linesToRemove = 0;
            let detectedLang = '';

            for (let j = prevLines.length - 1; j >= 0; j--) {
                let currentLine = prevLines[j].trim().toLowerCase();
                
                if (currentLine === '') {
                    linesToRemove++;
                    continue;
                }
                
                if (independentTrashWords.has(currentLine)) {
                    linesToRemove++;
                    continue;
                }
                
                if (knownLanguages.has(currentLine)) {
                    detectedLang = currentLine;
                    linesToRemove++;
                    continue; 
                }
                
                break;
            }

            if (linesToRemove > 0) {
                prevLines.splice(prevLines.length - linesToRemove);
                formattedParts[i - 1] = prevLines.join('\n');

                // 仅当代码块本身没有语言名时，才用前文外抛的语言名补上；
                // 用户已显式写出 ```js / ```python 等就尊重原意，不覆盖。
                if (detectedLang) {
                    if (detectedLang === 'c++') detectedLang = 'cpp';
                    formattedParts[i] = formattedParts[i].replace(
                        /^```([^\n]*)/,
                        (m, existing) => existing.trim() ? m : '```' + detectedLang
                    );
                }
            }
        }
    }

    // 4. Part-aware 重组：依靠 split 时已知的代码块/文本块边界精确控制分隔，
    //    避免在 join 后对字符串做正则时无法区分 ``` 是开符还是闭符的歧义问题。
    const blocks = [];
    for (let i = 0; i < formattedParts.length; i++) {
        const p = formattedParts[i];
        if (p.startsWith('```') && p.endsWith('```')) {
            blocks.push({ type: 'code', content: p });
        } else {
            // 去掉首尾空行，由块间分隔符统一负责留白
            const trimmed = p.replace(/^\n+/, '').replace(/\n+$/, '');
            if (trimmed === '') continue;
            blocks.push({ type: 'text', content: trimmed });
        }
    }

    if (strictDeleteEmptyLines) {
        for (const b of blocks) {
            if (b.type !== 'text') continue;
            // 压缩文本块内连续换行
            b.content = b.content.replace(/\n{2,}/g, '\n');
            // 标题前后都撑开空行（# 系列）
            b.content = b.content.replace(/([^\n])\n(#+\s)/g, '$1\n\n$2');
            b.content = b.content.replace(/(^|\n)(#+\s[^\n]*)\n(?!\n)([^\n])/g, '$1$2\n\n$3');
            // 引用块（> ...）结束后跟非引用正文，撑开空行，避免渲染时被合并进 blockquote
            b.content = b.content.replace(/(^|\n)(>[^\n]*)\n(?!\n|>)([^\n])/g, '$1$2\n\n$3');
            // 顶层列表类型切换（无序↔有序）处撑开空行，避免渲染时被合并为同一列表
            // 左侧允许前导空格（嵌套项），右侧要求行首（顶层切换）
            b.content = b.content.replace(/(^|\n)([ \t]*[-*+] [^\n]*)\n(\d+\. )/g, '$1$2\n\n$3');
            b.content = b.content.replace(/(^|\n)([ \t]*\d+\. [^\n]*)\n([-*+] )/g, '$1$2\n\n$3');
            // --- 前后撑开空行
            b.content = b.content.replace(/([^\n])\n(---\s*)(?=\n|$)/g, '$1\n\n$2');
            b.content = b.content.replace(/(^|\n)(---\s*)\n(?!\n)([^\n])/g, '$1$2\n\n$3');
        }
    } else {
        for (const b of blocks) {
            if (b.type !== 'text') continue;
            b.content = b.content.replace(/\n{3,}/g, '\n\n');
            b.content = b.content.replace(/([^\n])\n(#+\s)/g, '$1\n\n$2');
        }
    }

    // 块间统一用一个空行隔开（代码块⇄文本、代码块⇄代码块）
    let result = blocks.map(b => b.content).join('\n\n');

    return result.trim();
}

// 导出方法
module.exports = { formatAiMarkdown };

// ================= Node.js 独立运行入口 =================
const inputFile = path.join(__dirname, 'input.md');
const outputFile = path.join(__dirname, 'output.md');

if (require.main === module) {
    try {
        if (!fs.existsSync(inputFile)) {
            // 测试用例：包含外抛、废话、粘连、以及开头后多空行的情况
            fs.writeFileSync(inputFile, 'cpp\n运行\n\n```\n#include <iostream>\nint main() { return 0; }\n```');
            console.log(`初始化成功，请在 ${inputFile} 中粘贴需要修剪的文本。`);
            process.exit(0);
        }

        const rawData = fs.readFileSync(inputFile, 'utf-8');
        const cleanData = formatAiMarkdown(rawData, true); 
        
        fs.writeFileSync(outputFile, cleanData, 'utf-8');
        console.log('✨ JS 脚本格式化完成（完美修复语言名离奇换行 BUG，维持开头前空一行，后不空行）！');
    } catch (err) {
        console.error('运行失败:', err);
    }
}