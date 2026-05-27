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

    // 2. 修复语言定义被抛在外部的现象 (例如: ts\n```)
    const brokenCodeBlockRegex = /(?:^|\n)([a-zA-Z0-9+#-]+)\s*\n*```([\s\S]*?)```/g;
    text = text.replace(brokenCodeBlockRegex, (_, lang, codeContent) => {
        return `\n\`\`\`${lang.toLowerCase()}\n${codeContent.trim()}\n\`\`\``;
    });

    // 3. 隔离代码块与普通文本
    const parts = text.split(/(```[\s\S]*?```)/g);

    const formattedParts = parts.map((part) => {
        // 如果是代码块：保护内部结构，仅修剪首尾死空格
        if (part.startsWith('```') && part.endsWith('```')) {
            const match = part.match(/^```(\w*)\n([\s\S]*?)```$/);
            if (match) {
                const [, lang, code] = match;
                return `\`\`\`${lang}\n${code.trim()}\n\`\`\``;
            }
            return part;
        } 
        
        // 如果是普通文本：清理布局
        else {
            let content = part;

            // 清理行尾空格
            content = content.split('\n').map((line) => line.trimEnd()).join('\n');

            if (strictDeleteEmptyLines) {
                // 彻底干掉所有空行
                content = content.replace(/\n\s*\n/g, '\n'); 
            } else {
                content = content.replace(/\n{3,}/g, '\n\n'); // 压缩连续空行
            }

            // 修复列表符号后多余的空格 (如: -    列表项)
            content = content.replace(/^(\s*[-*+]\s+)\s+/gm, '$1');
            content = content.replace(/^(\s*\d+\.\s+)\s+/gm, '$1');

            // 修复加粗语法内部的死空格 (如: ** 文本 **)
            content = content.replace(/\*\*\s+([^\*]+?)\s+\*\*/g, '**$1**');

            return content;
        }
    });

    let result = formattedParts.join('');

    // 4. 宏观间距优化
    if (strictDeleteEmptyLines) {
        // 先确保所有连续换行被压缩为单换行
        result = result.replace(/\n{2,}/g, '\n'); 
        
        // 【新增条件】当出现 --- 时，在其上方强行插入一个空行（非文章开头时）
        // 匹配“任意非换行字符 + 单换行 + ---” 替换为 “该字符 + 双换行 + ---”
        result = result.replace(/([^\n])\n(---)\s*$/gm, '$1\n\n$2');
    } else {
        // 确保标题（#）前有且仅有一个空行
        result = result.replace(/([^\n])\n(#+\s)/g, '$1\n\n$2');
        // 确保代码块前后各有一个空行隔离
        result = result.replace(/([^\n])\n(```)/g, '$1\n\n$2');
        result = result.replace(/(```)\n([^\n])/g, '$1\n\n$2');
    }

    return result.trim();
}

// 导出方法（方便其他 JS 文件 require 引入）
module.exports = { formatAiMarkdown };

// ================= Node.js 独立运行入口 =================
const inputFile = path.join(__dirname, 'input.md');
const outputFile = path.join(__dirname, 'output.md');

if (require.main === module) {
    try {
        if (!fs.existsSync(inputFile)) {
            fs.writeFileSync(inputFile, 'ts\n```\nconst obsidian = "awesome";\n```');
            console.log(`初始化成功，请在 ${inputFile} 中粘贴需要修剪的文本。`);
            process.exit(0);
        }

        const rawData = fs.readFileSync(inputFile, 'utf-8');
        // 传入 true，开启严格去空行模式
        const cleanData = formatAiMarkdown(rawData, true); 
        
        fs.writeFileSync(outputFile, cleanData, 'utf-8');
        console.log('✨ JS 脚本格式化完成（已清除空行，并为 --- 上方留空）！');
    } catch (err) {
        console.error('运行失败:', err);
    }
}