# Catwarrior · 笔记

**[打开笔记网站，阅读完整文章 →](https://avaivartika.github.io/catobs-public-notes/)**

<a href="https://avaivartika.github.io/catobs-public-notes/"><img src="assets/notes-site-preview-20261026.png" alt="笔记网站的实际页面预览，展示文章目录和正文" width="100%"></a>

这里保存已发布的 Markdown 文章及其图片等附件。网页提供文章列表、分类和搜索。

## 文章

- [GLaDOS 教育认证](https://avaivartika.github.io/catobs-public-notes/n/%E6%9E%81%E5%AE%A2/GLaDOS%20%E6%95%99%E8%82%B2%E8%AE%A4%E8%AF%81/)

原文件位于 [notes](notes/) 目录。Obsidian 插件将标记的笔记同步到该目录后，GitHub Actions 自动更新网站。

标题使用 Georgia / 系统宋体，不再请求外部字体服务；正文与 Obsidian 一致，使用 Times New Roman / 楷体 SC，字号 18px；设备未安装楷体时使用随站点提供的 Fandol 楷体。代码块保留等宽字体。

每次部署同时生成 `index.json`，包含已发布文章的标题、摘要、日期、分类和链接。博客在访问时读取这份索引，新增、改名或删除笔记无需再部署博客。顶部导航和页脚提供返回博客的入口。

## 自动维护中英文列表

发布流程在构建后使用 Helsinki-NLP/opus-mt-zh-en（赫尔辛基大学，CC-BY-4.0）自动翻译标题、摘要与分类，写入 `index.json` 的 `titleEn`、`descriptionEn`、`tagsEn`。原始 Markdown 和正文 HTML 不变。只需继续发布中文笔记，无需填写英文 frontmatter。

翻译在 GitHub Actions CPU 上运行，不需要 API 密钥。按中文源内容的哈希复用上次已发布译文，修改后自动重译；模型权重也会缓存。翻译失败时部署停止，保留上一版完整站点，避免发布半份双语数据。首次下载模型会增加发布时间。机器翻译可能存在术语误译。

模型来源及许可：https://huggingface.co/Helsinki-NLP/opus-mt-zh-en
