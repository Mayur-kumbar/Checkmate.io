# Stockfish AI Deployment Guide (AWS EC2 - Ubuntu)

This guide walks you through installing the open-source Stockfish chess engine on your AWS EC2 instance running Ubuntu and ensuring it functions correctly with your Node.js backend.

## 1. Connect to your EC2 Instance
First, SSH into your production EC2 instance where the checkmate.io backend is running:
```bash
ssh -i /path/to/your/key.pem ubuntu@your-ec2-ip-address
```

## 2. Update System Packages
Always start by updating the package manager repositories to ensure you get the latest available version:
```bash
sudo apt update -y
sudo apt upgrade -y
```

## 3. Install Stockfish
The Stockfish binary is available directly through the standard Ubuntu package repositories. 
Install it directly via `apt`:
```bash
sudo apt install stockfish -y
```

## 4. Verify the Installation
After installation completes, verify that the `stockfish` command is available globally.

Run the command:
```bash
stockfish
```
You should see output similar to:
```text
Stockfish 15 by the Stockfish developers (see AUTHORS file)
```
If you type `uci` and press Enter, the engine will list all supported Universal Chess Interface options and conclude with `uciok`. Type `quit` and press Enter to exit.

## 5. Verify the Path for Node.js
We need to ensure Node's `child_process.spawn("stockfish")` can locate the binary. Find where stockfish is installed:
```bash
which stockfish
```
*Expected Output: `/usr/games/stockfish` or `/usr/bin/stockfish`.*

By default, the `spawn` command in `backend/src/services/ai.service.ts` simply calls `"stockfish"`, which relies on the system `PATH`. The installation via `apt` automatically adds it to the system `PATH`. 
If you run your backend process using PM2, PM2 inherits the user PATH environment, meaning it should work immediately without any code changes.

## 6. Restart Backend Service
Ensure you rebuild your NodeJS backend to capture the recently written endpoints and AI controllers.
Inside your production checkmate project directory:
```bash
cd /path/to/Checkmate.io/backend
npm install
npm run build
```
Restart your specific PM2 process (or whatever process manager you are using):
```bash
pm2 restart backend
```

## 7. Troubleshooting

* **Engine timed out while calculating move?**
Double check the instance CPU load. While stockfish is very efficient, setting the difficulty to `expert` pushes the depth to 18, which can take several seconds to compute on t2.micro machines.

* **Stockfish error or engine closed?**
If `pm2 logs backend` shows an error that it cannot find `stockfish`, you might need to use the absolute path in `child_process.spawn()`. Edit `backend/src/services/ai.service.ts`:
Change `spawn("stockfish")` to `spawn("/usr/games/stockfish")` (matching the output of `which stockfish`).
