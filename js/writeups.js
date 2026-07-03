// writeups.js - WRITEUPS METADATA
/*
  {
    id:         "",
    title:      "",
    category:   "",            // htb | tryhackme | ctf | vulnhub | pico
    platform:   "",
    os:         "",            // Linux | Windows | "empty"
    difficulty: "",
    date:       "",
    author:     "",
    image:      "",
    locked:     false          // true = not open
    excerpt:    "",
  },
*/

const WRITEUPS = [
  {
    id:         "two-million",
    title:      "HackTheBox: TwoMillion",
    category:   "htb",
    platform:   "HackTheBox",
    os:         "Linux",
    difficulty: "Easy",
    date:       "May 10, 2026",
    author:     "Ch4rum",
    image:      "writeups/htb/src/twomillion/01_logo.png",
    locked:     false,
    excerpt:    "TwoMillion is an Easy difficulty Linux box that was released to celebrate reaching 2 million users on HackTheBox. The box features an old version of the HackTheBox platform that includes the old hackable invite code. After hacking the invite code an account can be created on the platform. The account can be used to enumerate various API endpoints, one of which can be used to elevate the user to an Administrator. With administrative access the user can perform a command injection in the admin VPN generation endpoint thus gaining a system shell. An .env file is found to contain database credentials and owed to password re-use the attackers can login as user admin on the box. The system kernel is found to be outdated and CVE-2023-0386 can be used to gain a root shell."
  },
  {
    id:         "reactor",
    title:      "HackTheBox: Reactor",
    category:   "htb",
    platform:   "HackTheBox",
    os:         "Linux",
    difficulty: "Easy",
    date:       "Jul 02, 2026",
    author:     "Ch4rum",
    image:      "writeups/htb/src/reactor/01_logo.png",
    locked:     true,
    excerpt:    "Reactor is an Easy difficulty Linux machine hosting a Next.js web application vulnerable to an unauthenticated RCE via React Server Components (CVE-2025-55182). Credentials extracted from a SQLite database lead to SSH access, and privilege escalation abuses a Node.js V8 Inspector process running as root via SSH port forwarding."
  },
  {
    id:         "enigma",
    title:      "HackTheBox: Enigma",
    category:   "htb",
    platform:   "HackTheBox",
    os:         "Linux",
    difficulty: "Easy",
    date:       "Jul 02, 2026",
    author:     "Ch4rum",
    image:      "writeups/htb/src/enigma/01_logo.png",
    locked:     true,
    excerpt:    "Enigma is an Easy difficulty Linux machine simulating a corporate environment. An exposed NFS share leaks onboarding credentials, which chain through Roundcube webmail and OpenSTAManager (CVE-2026-38751) to achieve remote code execution. Privilege escalation abuses OliveTin via command injection through its gRPC-Web API."
  },
  {
    id:         "cctv",
    title:      "HackTheBox: CCTV",
    category:   "htb",
    platform:   "HackTheBox",
    os:         "Linux",
    difficulty: "Easy",
    date:       "Jun 28, 2026",
    author:     "Ch4rum",
    image:      "writeups/htb/src/cctv/01_logo.png",
    locked:     true,
    excerpt:    "CCTV is an Easy difficulty Linux machine running motionEye. Enumeration reveals an exposed admin panel with default credentials. The filename field in motionEye is vulnerable to OS command injection, allowing RCE and obtaining a reverse shell as a low-privilege user. Privilege escalation is achieved by exploiting a SUID binary or misconfigured sudo rule to gain root."
  },
  {
    id:         "kobold",
    title:      "HackTheBox: Kobold",
    category:   "htb",
    platform:   "HackTheBox",
    os:         "Linux",
    difficulty: "Easy",
    date:       "Jun 28, 2026",
    author:     "Ch4rum",
    image:      "writeups/htb/src/kobold/01_logo.png",
    locked:     true,
    excerpt:    "Kobold is an Easy difficulty Linux machine. Initial foothold involves enumerating exposed services and exploiting a web vulnerability. Lateral movement and privilege escalation are achieved through credential reuse and misconfigured system services."
  },
];