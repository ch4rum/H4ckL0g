// writeups.js - WRITEUPS METADATA
/*
  {
    id:         "",
    title:      "",
    category:   "",            // htb | tryhackme | ctf | vulnhub | pico
    platform:   "",
    difficulty: "",
    date:       "",
    author:     "",            // or "" for local
    image:      "",
    excerpt:    ""
  },
*/

const WRITEUPS = [
  {
    id:         "two-million",
    title:      "HackTheBox: TwoMillion",
    category:   "htb",
    platform:   "HackTheBox",
    difficulty: "Easy",
    date:       "May 10, 2026",
    author:     "Ch4rum",
    image:      "https://bhavik-kanejiya.github.io/images/HTB/TwoMillion/Pasted%20image%2020250118171354.png",
    excerpt:    "TwoMillion is an Easy difficulty Linux box that was released to celebrate reaching 2 million users on HackTheBox. The box features an old version of the HackTheBox platform that includes the old hackable invite code. After hacking the invite code an account can be created on the platform. The account can be used to enumerate various API endpoints, one of which can be used to elevate the user to an Administrator. With administrative access the user can perform a command injection in the admin VPN generation endpoint thus gaining a system shell. An .env file is found to contain database credentials and owed to password re-use the attackers can login as user admin on the box. The system kernel is found to be outdated and CVE-2023-0386 can be used to gain a root shell."
  },
];