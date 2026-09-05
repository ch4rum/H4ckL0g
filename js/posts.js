// posts.js - POSTS METADATA
/*
  {
    id:        "",
    title:     "",
    category:  "",            // malware | hacking | networks | osint
    date:      "",
    author:    "",            // or "" for local
    reading:   "",
    image:     "",
    excerpt:   ""
  },
*/

const POSTS = [
  {
    id:       "edr-evasion-techniques",
    title:    "EDR Evasion in 2026: Below the Kernel, Beyond Detection",
    category: "malware",
    date:     "Sept 04, 2026",
    author:   "Ch4rum",
    reading:  "22 min",
    image:    "https://www.csiny.com/wp-content/uploads/2026/06/edr-evasion.png?w=200&q=80",
    excerpt:  "Userland hooks, kernel callbacks, ETW telemetry, memory scanning. A conventional shellcode dropper lasts 11 seconds on CrowdStrike. Here's how red teamers operate below every detection layer in 2026."
  },
  {
    id:       "windows-protection-rings-ring-minus4",
    title:    "Windows Protection Rings & Ring -4: The Hardware Frontier Nobody Talks About",
    category: "malware",
    date:     "Aug 09, 2026",
    author:   "Ch4rum | Anzscension",
    reading:  "17 min",
    image:    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    excerpt:  "Ring 0 rootkits, Ring -1 hypervisors, Ring -2 SMM, Ring -3 Intel ME. Now meet Ring -4 — the layer where assembly becomes useless and your attack vector is voltage, electromagnetic pulses, and physics itself."
  },
  {
    id:       "osint-deepfake-detection",
    title:    "OSINT in the Age of Deepfakes: Detecting Synthetic Identities",
    category: "osint",
    date:     "May 20, 2026",
    author:   "Ch4rum",
    reading:  "14 min",
    image:    "https://static.scientificamerican.com/dam/m/c8cf593f7aa3ffb9/original/GettyImages-2200516160.jpg?m=1769195254.56&w=900",
    excerpt:  "A LinkedIn profile with perfect work history, mutual connections, and published papers. The person doesn't exist. How to detect synthetic AI-generated identities in 2026."
  },
  {
    id:       "dns-tunneling-exfiltration",
    title:    "DNS Tunneling: Data Exfiltration Through the Protocol Nobody Blocks",
    category: "networks",
    date:     "May 20, 2026",
    author:   "Ch4rum",
    reading:  "16 min",
    image:    "https://www.reversinglabs.com/api/media/file/data-exfiltrator-blog-1400x711.webp",
    excerpt:  "Every firewall blocks HTTP. Everyone inspects HTTPS. But DNS? DNS stays open forever. Here's how attackers tunnel entire C2 channels through port 53 — and how to catch them."
  },
  {
    id:        "win-shellcoding",
    title:     "Windows Shellcoding (In-Depth)",
    category:  "malware",
    date:      "May 29, 2026",
    author:    "Ch4rum",
    reading:   "12 min",
    image:     "https://miro.medium.com/v2/resize:fit:1400/1*rfPLgtjo1LuF7G2d4CMioA.jpeg",
    excerpt:   "Shellcode, Both are internal Windows data structures leveraged by malware/exploit developers."
  },
  {
    id:        "token-theft-mfa-bypass",
    title:     "Token Theft: How Infostealers Are Killing MFA",
    category:  "hacking",
    date:      "May 18, 2026",
    author:    "Ch4rum",
    reading:   "14 min",
    image:     "https://ismalicious.com/medias/blog/posts/session-token-theft-infostealers-bypass-mfa.png",
    excerpt:   "Session token theft has become the primary method of authentication bypass in 2026. Why MFA no longer stops modern infostealers like LummaC2."
  },
  {
    id:        "what-is-malware",
    title:     "What is Malware and How Does It Work?",
    category:  "malware",
    date:      "May 10, 2026",
    author:    "Ch4rum",
    reading:   "9 min",
    image:     "https://thumbs.dreamstime.com/b/representaci%C3%B3n-digital-del-concepto-de-virus-inform%C3%A1ticos-una-atractiva-ilustraci%C3%B3n-que-representa-un-inform%C3%A1tico-en-el-centro-341079621.jpg?w=992",
    excerpt:   "Viruses, trojans, ransomware, spyware. A breakdown of the main types of malicious software."
  },
  {
    id:        "tcp-ip-networks",
    title:     "TCP/IP and Network Protocols Explained",
    category:  "networks",
    date:      "May 10, 2026",
    author:    "Ch4rum",
    reading:   "10 min",
    image:     "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80",
    excerpt:   "How data travels across the internet. Packets, ports, TCP handshake, and network attacks."
  },
  {
    id:        "ransomware-deep-dive",
    title:     "Anatomy of a Modern Ransomware",
    category:  "malware",
    date:      "May 10, 2026",
    author:    "Ch4rum",
    reading:   "10 min",
    image:     "https://media.telefonicatech.com/telefonicatech/uploads/2024/4/github-malware-blogpost-telefonica-tech.jpg",
    excerpt:   "Technical breakdown of how ransomware operates: encryption, C2 channels, and AV evasion."
  },
  {
    id:        "ethical-hacking-intro",
    title:     "Ethical Hacking: What It Is and How to Start",
    category:  "hacking",
    date:      "May 10, 2026",
    author:    "Ch4rum",
    reading:   "8 min",
    image:     "https://blog.computerservicenow.com/wp-content/uploads/2020/04/adobe-csn-hacking.jpg",
    excerpt:   "Penetration testing, bug bounty and Red Team explained. Start legal ethical hacking."
  },
  {
    id:        "osint-techniques",
    title:     "OSINT: Open Source Intelligence Techniques",
    category:  "osint",
    date:      "May 10, 2026",
    author:    "Ch4rum",
    reading:   "8 min",
    image:     "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600&q=80",
    excerpt:   "Google dorks, Shodan, Maltego. How investigators collect public information."
  },
];