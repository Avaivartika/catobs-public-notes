
### 核心目标
- 让远程主机通过 SSH `-R` 把所有 Codex 流量反向转回本地代理。
- 保证 Codex IDE/CLI 共用 `~/.codex/config.toml` 与 `auth.json`，并继承远程 shell 的代理变量。
- 用 VS Code Remote-SSH 在远端安装并运行 Codex 扩展。

### 1. 反向端口转发
本地代理端口假设为 `7890`，在远程挂载为 `17890`，连接命令如下（替换 `user@server`）：

```bash
ssh -R 17890:127.0.0.1:7890 user@server
```

`-R` 保证远程访问 `127.0.0.1:17890` 时经 SSH 通道到本地代理。确认远程代理环境已经设置后再启动 Codex。

### 2. 固化到 `~/.ssh/config`
把以下段落加入本地 `~/.ssh/config`，用 `Host my-codex-server` 取代具体主机名：

```sshconfig
Host my-codex-server
    HostName your.server.ip.or.domain
    User your_user
    Port 22
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
    RemoteForward 17890 127.0.0.1:7890
```

SSH 连接后在远程确认 `curl` 能通过 `http://127.0.0.1:17890`（或 `socks5h://`）访问 `https://api.openai.com`。

### 3. VS Code Remote-SSH
1. 打开 VS Code，本地安装 Remote-SSH。
2. `F1` → `Remote-SSH: Connect to Host...` → 选 `my-codex-server`。
3. 进入远端窗口后，在扩展面板里手动“Install in SSH” Codex 插件。
4. 此时 VS Code Server 和插件都在远程运行，网络访问依赖远端的代理环境变量。

### 4. 远程代理环境变量
根据代理类型在远端 shell 配置文件（`~/.bashrc`/`~/.zshrc`）里写：

HTTP 代理：
```bash
export HTTP_PROXY=http://127.0.0.1:17890
export HTTPS_PROXY=http://127.0.0.1:17890
export ALL_PROXY=http://127.0.0.1:17890
export NO_PROXY=localhost,127.0.0.1,::1
```

SOCKS5 代理改为 `socks5h://` 前缀。加载配置后用 `env | grep -i proxy` 与 `curl -I https://api.openai.com` 验证。

### 5. 同步 Codex 身份与配置
1. 本地先执行 `codex login`，确认 `~/.codex/auth.json` 已生成（若不生成，可在本地 `~/.codex/config.toml` 里设置 `cli_auth_credentials_store = "file"` 再登录）。
2. 复制认证与配置到远端：
```bash
ssh my-codex-server 'mkdir -p ~/.codex && chmod 700 ~/.codex'
scp ~/.codex/auth.json my-codex-server:~/.codex/auth.json
scp ~/.codex/config.toml my-codex-server:~/.codex/config.toml
ssh my-codex-server 'chmod 600 ~/.codex/auth.json ~/.codex/config.toml'
```

### 6. 最简远端 `~/.codex/config.toml`
```toml
model = "gpt-5.4"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
sandbox_workspace_write.network_access = true
shell_environment_policy.inherit = "all"
shell_environment_policy.experimental_use_profile = true
```

如需走企业网关再配置 `openai_base_url` 或 `model_provider`，否则保留默认。

### 7. 验证流程
1. 远端 `curl -I https://api.openai.com`（或显式 `--proxy`）确认代理通。
2. `codex` 命令能正常启动并不再卡在认证。
3. VS Code 远端窗口的 Codex 面板显示登录状态且能发起请求。

### 8. 常见问题
- 远端 `AllowTcpForwarding` 被关闭：请管理员恢复。
- `auth.json` 不存在：设置 `cli_auth_credentials_store = "file"` 再登录生成。
- 需要本地回调认证：用 `ssh -L 1455:localhost:1455 user@remote` + `codex login`，在本地浏览器完成 OAuth。

### 9. 快速模板

```sshconfig
Host my-codex-server
    HostName your.server.ip.or.domain
    User your_user
    Port 22
    RemoteForward 17890 127.0.0.1:7890
```

```toml
model = "gpt-5.4"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
sandbox_workspace_write.network_access = true
shell_environment_policy.inherit = "all"
shell_environment_policy.experimental_use_profile = true
```
