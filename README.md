## Streamline Your AI-Generated Text in Obsidian

When "vibe coding" in the CLI, we frequently need to copy snippets from AI outputs. However, unformatted AI generations can be incredibly messy and hard to read—**especially when dealing with massive walls of text, code blocks, or complex JSON payload.**

<img width="2870" height="1674" alt="1" src="https://github.com/user-attachments/assets/67fd219b-06c5-49c9-8372-aa8bfbe4ed51" />

This tool is designed to instantly clean up and format those chaotic AI outputs.

---

## Features Overview

`prettier.js` is a deep-cleaning and layout optimization formatter specifically designed for **AI-generated Markdown text**. It solves common "hallucination formatting" issues found in parsed AI outputs through precise text splitting, contextual state machines, and regex-based repairs.

### 1. Basic Text Preprocessing

* **Unified Line Endings**: Automatically replaces Windows-style `\r\n` with Unix-style `\n` to prevent cross-platform parsing misalignment.

### 2. Code Block Precision Optimization

* **Code & Text Isolation Protection**: Uses precise regex splitting on code blocks (```) to ensure special characters and structures inside code blocks remain untouched.
* **Smart Language Tag Repair**: When a code block's first line lacks a language definition, but the first non-empty line inside the code is a standalone known language name (e.g., the first line is empty and the second line says `javascript`), the script automatically promotes that language name to immediately follow the opening ```.
* **Alias Normalization**: Automatically corrects `c++` to the standard highlightable `cpp`.
* **Intra-code Blank Line Control**:
  * **Strict Mode**: Forcibly removes **all blank lines** inside code blocks for极致 compactness.
  * **Loose Mode**: Only trims leading and trailing blank lines inside code blocks, preserving internal empty lines.

### 3. Normal Text Area Cleaning & Syntax Repair

* **Bold Syntax Dead Space Fix**: Automatically repairs ` 重点 ` to the standard no-space `重点`, with optimized regex logic that avoids mistakenly swallowing middle text spaces during consecutive bold patterns (e.g., `A 的 B`).
* **List Excess Space Trimming**:
  * Fixes excessive spaces after unordered list symbols (e.g., `-    列表项` → `- 列表项`).
  * Fixes excessive spaces after ordered list symbols (e.g., `1.   列表项` → `1. 列表项`).
* **Special Line Safety Protection**: If a line contains inline code (`) or math formulas (`$`), the script absolutely skips filtering logic for that line (only performing trailing whitespace removal) to prevent damaging complex inline special formatting.

### 4. Contextual Linkage & "AI Filler" Erasure (Core Highlight)

The script includes a **reverse state machine** that, during text reassembly, inspects the text lines immediately above adjacent code blocks:

* **Filler Word Filtering**: Automatically identifies and removes standalone AI guide words (e.g., `运行`, `编译`, `复制`, `代码如下`, `示例`, etc.).
* **External Language Adsorption**: If the AI placed the language name outside the code block (e.g., the previous line standalone says `python`, followed by a ``` with no language), the script automatically deletes that external line and injects it into the code block's opening tag (becoming ````python`).

### 5. Markdown Semantic Layout Control (Part-aware Reassembly)

During final text merging, the script performs unified whitespace and spacing management based on component blocks (Text blocks / Code blocks):

* **Uniform Block Spacing**: All text-to-code block and code-to-code block transitions are separated by **exactly one blank line**.
* **Element Spacing in Strict Mode (Prevents Rendering Adhesion)**:
  * **Heading Cascade Spacing**: Ensures Markdown headings (`#` series) have at least one blank line before and after.
  * **Quote Block Isolation**: When a quote block (`>`) is immediately followed by normal body text, automatically inserts a blank line to prevent the body text from being incorrectly merged into the quote block.
  * **List Type Switching**: When unordered lists (`-`) and ordered lists (`1.`) appear in alternating succession, forces an empty line at the transition point to prevent front-end rendering as a single large list.
  * **Divider Line Spacing**: Ensures horizontal dividers (`---`) have blank lines before and after.
* **Spacing Control in Loose Mode**: Does not forcibly insert the above semantic empty lines, but automatically compresses 3 or more consecutive newlines down to 2 newlines.

### 6. Node.js Standalone Execution & Automated Testing

* **Local File Integration**: Supports reading `input.md` from the same directory and outputting formatted results to `output.md`.
* **Zero-Config Self-Healing**: If no local `input.md` exists, the script automatically creates a typical test case file featuring "external language and AI filler" scenarios, allowing developers to run and see the effects immediately.

---

## 🚀 Quick Start

1. **Download the Package:** Download the ZIP file and extract it directly into the **root directory** of your Obsidian repository.
    
2. **Install Templater:** Make sure you have the **Templater** plugin installed.
    
3. **Configure the Plugin:** Set up the template options as shown in the screenshots below:

<img width="787" height="668" alt="2" src="https://github.com/user-attachments/assets/0a7e7d2d-0d68-4e5d-847d-3f3a4b621e2b" />

<img width="545" height="629" alt="3" src="https://github.com/user-attachments/assets/28bfd802-5a2e-4c8a-b65f-743a2a40f7db" />

4. **Bind a Hotkey:** Assign a hotkey to trigger the script. We highly recommend `Cmd + Shift + V` (or `Ctrl + Shift + V` on Windows).

5. **Parameter of strict_rules** (NEW ADDED): You can choose to delete all the blank lines in the code block or not.

<img width="516" height="83" alt="image" src="https://github.com/user-attachments/assets/0e62a1c0-880c-4dc0-bbac-3b0524757c82" /> 
6. Fixed: Yuque's "Export as Markdown" feature adds extra spaces around `$` symbols in math formulas, causing display issues in Obsidian.
<img width="572" height="91" alt="image" src="https://github.com/user-attachments/assets/0a63bad9-96d3-43e6-9ec6-d0a5f2a04d50" />

> 💡 **Tip:** This specific shortcut is perfect because it preserves standard pasting behavior when you just want to drop in text normally, while giving you instant formatting power when you need it.

Enjoy a much cleaner, seamless vibe coding workflow! If this tool saved you some time, **don't forget to drop a ⭐ on GitHub!**
