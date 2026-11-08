# ACES Pixel for Windows (x64)

Download the portable ZIP, extract it, and double-click **ACES-Pixel.exe**. Node.js and the office application are built in; no npm install is required to start the interface. It opens http://127.0.0.1:4317 in your default browser. Copy the owner token displayed in the console into the sign-in screen.

Keep the console open while employees work. Ctrl+C stops the office. Restarting reuses `%LOCALAPPDATA%\ACESPixel\data`, including account folders, encrypted service connections and Markdown memory. Do not delete or share that directory. This is a per-user portable application, not a Windows service and not an automatic-startup installer.

## One-time live setup

Install Git for Windows and Codex CLI using their official installers/documentation. Restart the EXE after installing them. The launcher finds a native `codex.exe` on PATH or in the standard npm global OpenAI package folders. A nonstandard installation can set `PIXEL_CODEX_BIN` to its absolute executable path.

In Accounts, add an employee and run the displayed **PowerShell** login command. Repeat for each employee-owned account. Use Connections to connect GitHub, select a repository, and connect Vercel. Never paste credentials into chat or commit them to a repository.

The launcher listens only on your Windows computer. The public Vercel website still needs a separately configured HTTPS route to this persistent host for remote/mobile control. Closing the window or sleeping the computer pauses availability.

The EXE is unsigned; no code-signing certificate is configured. Windows may display a publisher warning. This is a Windows x64 build, not a macOS application.

## Rebuild

Use Node.js **24.22.1** on Windows x64 (the blob and target binary must match):

```powershell
node scripts/windows/prepare.mjs windows-build
node --experimental-sea-config windows-build/sea-config.json
Copy-Item (Get-Command node).Source windows-build/ACES-Pixel.exe
npm install --prefix windows-build --ignore-scripts postject@1.0.0-alpha.6
node windows-build/node_modules/postject/dist/cli.js windows-build/ACES-Pixel.exe NODE_SEA_BLOB windows-build/sea.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
node scripts/windows/unsigned.mjs windows-build/ACES-Pixel.exe
./scripts/windows/smoke.ps1
```

The Windows EXE GitHub Actions workflow builds and smoke-tests the same package and uploads an artifact. No accounts, runtime records or service tokens are bundled.
