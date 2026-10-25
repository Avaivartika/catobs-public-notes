# Web font fallback

The website first asks the visitor's system for Kaiti SC, matching the font selected in Obsidian. When that font is unavailable, it uses these self-hosted web fonts instead of falling back to a sans-serif font.

The WOFF2 files are subsets of [LXGW WenKai GB Lite v1.530](https://github.com/lxgw/LxgwWenKaiGB-Lite/releases/tag/v1.530), licensed under the [SIL Open Font License 1.1](OFL.txt). The internal font names were changed to “Catobs Kai Fallback” and “Catobs Kai Extended”. The common subset contains GB2312 characters plus all characters currently used by the site and published notes; the extended subset covers the remaining source font characters. The latter is loaded only when a character outside the common subset is needed.

These fonts approximate the look of Kaiti SC. They do not contain Apple's font data.
