// githubs.js - REPOSITORY METADATA
// .md files must be located in githubs/<category>/<id>.md
/*
  {
    id:        "",
    name:      "",
    category:  "",
    githubUrl: "",      // or "" for local
    lang:      "",
    desc:      "",
  },
*/

const REPOS = [
  {
    id:        "Python-base_keylogger",
    name:      "Telegram Keylogger",
    category:  "hacking",
    githubUrl: "https://github.com/ch4rum/Keylogger",
    lang:      "Python",
    desc:      "Educational, a simple Python-base keylogger that captures keystrokes and sends them to a Telegram bot in real time.",
  },
  {
    id:        "A_Simple_Forward_Shell",
    name:      "FwShell",
    category:  "hacking",
    githubUrl: "https://github.com/ch4rum/FwShell",
    lang:      "Python",
    desc:      "A simple Forward Shell, for establishes a remote shell session that allows the execution of commands on the server interactively.",
  },
  {
    id:        "process-injection",
    name:      "Process Injection Technique",
    category:  "malware",
    githubUrl: "https://github.com/0xXyc/process-injection",
    lang:      "C++",
    desc:      "Basic self-injecting malware technique for educational purposes. Demonstrates process injection into Microsoft Edge. Customize shellcode and encrypt to evade endpoint security solutions.",
  },
  {
    id:        "fukahi-na-tekio",
    name:      "fukahi-na-tekio",
    category:  "malware",
    githubUrl: "",
    lang:      "Python",
    desc:      "LFSR-based shellcode encoder/decoder for malware development. Supports multiple decoder modes (looped, unrolled, chunked, asm) and full C loader generation.",
  },  
  {
    id:        "Crypt0-extract",
    name:      "Crypt0-extract",
    category:  "hacking", 
    githubUrl: "",
    lang:      "Go",
    desc:      "Advanced memory scraping tool for cryptographic key extraction from running processes. Designed for embedded systems forensics and penetration testing.",
  }
];