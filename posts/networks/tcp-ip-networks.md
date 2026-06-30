![Tcp Ip](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80)

Understanding how data travels across the internet is non-negotiable for anyone working in offensive or defensive security. Without this foundation, network attacks appear as black magic. With it, every attack — ARP poisoning, DNS spoofing, SYN floods, man-in-the-middle — becomes a logical consequence of how the protocols were designed decades ago, often with trust rather than security as the primary concern.

This article builds the mental model from the ground up: packets, layers, ports, and exactly how attackers abuse each one.

## The TCP/IP Model — Four Layers That Run the Internet

Every packet crosses four conceptual layers. Each adds its own header, addressing, and rules — this is **encapsulation**.

**Application Layer** — HTTP, HTTPS, DNS, FTP, SSH, SMTP. User-facing protocols live here. Your browser generates an HTTP request at this layer with no knowledge of IP addresses — just the protocol.

**Transport Layer** — TCP and UDP. Adds **source and destination ports**, enabling multiple services on the same machine. Handles reliable delivery (TCP) or best-effort (UDP).

**Internet Layer** — IP. Adds **source and destination IP addresses** for routing across networks. Routers operate here.

**Network Access Layer** — Ethernet, Wi-Fi, ARP. Handles physical addressing within a single segment using **MAC addresses**. Switches operate here.

When your browser sends a request, data travels down through these layers — each adding a header — until it becomes a raw frame on the wire. At the destination, each layer strips its header back up until the application receives the original data.

## TCP — Reliability and the Three-Way Handshake

**TCP** (Transmission Control Protocol) guarantees reliable, ordered delivery via the **three-way handshake**:

```
Client → Server:  SYN       (seq=100)
Server → Client:  SYN-ACK   (seq=200, ack=101)
Client → Server:  ACK       (ack=201)
```

Every subsequent segment is acknowledged — if no ACK is received within a timeout, the segment retransmits. This makes TCP ideal for HTTP, SSH, FTP: applications where every byte must arrive correctly.

### SYN Flood — Abusing the Handshake

The attacker sends thousands of SYN packets from **spoofed source IPs**. The server allocates memory for each half-open connection and waits for ACKs that never arrive. The **backlog queue** fills up and legitimate connections are refused — a classic DoS attack with no authentication required.

**Defense:** SYN cookies encode connection state in the initial sequence number instead of allocating memory, eliminating the backlog vulnerability.

## UDP — Speed Without Guarantees

**UDP** (User Datagram Protocol) adds ports to IP and nothing else. No handshake, no acknowledgment, no retransmission. Ideal for DNS, VoIP, video streaming, and gaming — where low latency matters more than guaranteed delivery.

```
UDP header: Source Port | Destination Port | Length | Checksum | Data
```

8 bytes total. Compare to TCP's minimum 20 bytes.

### UDP Amplification — DDoS at Scale

Attackers send small UDP requests to open servers (DNS, NTP, Memcached) with the **victim's IP as source**. The server returns a response much larger than the request — to the victim. With thousands of reflectors, the victim receives traffic orders of magnitude larger than what the attacker sent. The 2018 GitHub attack using Memcached achieved a **51,000x amplification factor** — 1.35 Tbps from a relatively small amount of spoofed traffic.

## Ports — The Front Doors of Services

Every service listens on a **port number** (0–65535). An attacker maps open ports to discover what's running and which version — because every version maps to a CVE search.

| Port | Service | Key Attack Surface |
|------|---------|-------------------|
| 21 | FTP | Anonymous auth, cleartext credentials |
| 22 | SSH | Brute force, key theft, CVEs |
| 23 | Telnet | Cleartext — deprecated but still found |
| 53 | DNS | Zone transfers, tunneling, cache poisoning |
| 80/443 | HTTP/S | Web application attacks |
| 139/445 | SMB | EternalBlue, relay attacks, ransomware |
| 3389 | RDP | BlueKeep, brute force, ransomware entry |
| 5985 | WinRM | PowerShell remoting, lateral movement |

Standard recon scan:

```bash
nmap -sV -sC -p- -T4 -oN scan.txt 192.168.1.1
```

Every open port is an attack surface.

## ARP — The Layer 2 Glue and Its Fatal Weakness

**ARP** (Address Resolution Protocol) maps IP addresses to MAC addresses within a local network. When your machine needs to reach `192.168.1.1`, it broadcasts: *"Who has 192.168.1.1?"* The gateway replies with its MAC. No authentication — any machine can claim any IP-to-MAC mapping with a **gratuitous ARP reply**, and most operating systems accept it unconditionally.

### ARP Poisoning — Foundation of LAN Attacks

The attacker sends forged ARP replies to both victim and gateway:

```
To victim:  "192.168.1.1 is at AA:BB:CC:DD:EE:FF" (attacker's MAC)
To gateway: "192.168.1.50 is at AA:BB:CC:DD:EE:FF" (attacker's MAC)
```

Both update their caches. All traffic between victim and gateway flows through the attacker — a **Man-in-the-Middle** with the victim completely unaware.

```bash
bettercap -iface eth0
» set arp.spoof.targets 192.168.1.50
» arp.spoof on
» net.sniff on
```

**Defense:** Dynamic ARP Inspection (DAI) on managed switches, static ARP entries for critical hosts.

## DNS — The Internet's Phone Book and Its Abuses

**DNS** resolves names to IPs. It uses UDP port 53 and is hierarchical: your resolver queries root → TLD → authoritative server. Because DNS is almost never blocked at firewalls, it is a reliable exfiltration and tunneling channel.

### Zone Transfers

A misconfigured DNS server will hand over its entire zone — every subdomain, every host — to any requester. One command, complete infrastructure map:

```bash
dig axfr target.com @ns1.target.com
```

### DNS Cache Poisoning

DNS responses are traditionally unauthenticated. An attacker who injects a forged response into a resolver's cache can redirect `bank.com` to a phishing server for every user of that resolver. **DNSSEC** cryptographically signs records to prevent this, but adoption remains incomplete.

### DNS Tunneling

Data encoded in DNS query names passes through almost every firewall:

```
aGVsbG8gd29ybGQ.attacker.com  (base64-encoded data as subdomain)
```

Tools like **dnscat2** and **iodine** establish full C2 channels over DNS — useful for exfiltration from networks that block all other outbound traffic.

**Detection:** Unusually long query names, high query frequency to a single external domain, queries for non-existent TLDs.

## HTTPS — Why Encryption Isn't Magic

HTTPS wraps HTTP in **TLS** (Transport Layer Security). The TLS handshake authenticates the server via a certificate signed by a trusted CA, negotiates cipher suites, and establishes session keys. All subsequent data is encrypted.

What HTTPS protects: content of requests and responses, credentials, cookies.

What HTTPS does **not** protect: the destination domain (visible in SNI during handshake), traffic timing and volume, DNS queries (unless DoH/DoT is used), and certificate-level metadata.

**SSL stripping** downgrades HTTPS to HTTP by intercepting the initial unencrypted request before the browser receives the redirect. Tools like `bettercap`'s `hstshijack` module implement this. **HSTS** (HTTP Strict Transport Security) prevents it by telling the browser to always use HTTPS — but only after the first visit, and only if the domain is on the HSTS preload list.

## Network Scanning and Enumeration Tools

Every security professional needs fluency with these:

**`nmap`** — the definitive port scanner. Fingerprints OS, services, and versions. Scriptable via NSE (Nmap Scripting Engine) for vulnerability detection:

```bash
# Service + version + default scripts + OS detection
nmap -sV -sC -O -oN output.txt target

# Full port scan, aggressive timing
nmap -p- -T4 target

# Run a specific vulnerability script
nmap --script smb-vuln-ms17-010 -p 445 target
```

**`Wireshark`** — graphical packet capture and protocol dissection. Captures everything on the wire, decodes protocols layer by layer. Essential for understanding attack traffic, analyzing malware C2 behavior, and debugging network issues.

**`tcpdump`** — command-line packet capture for remote servers without GUI:

```bash
tcpdump -i eth0 -w capture.pcap host 192.168.1.1 and port 80
```

**`netstat` / `ss`** — lists active connections and listening ports on the local machine:

```bash
ss -tulnp   # TCP+UDP, listening, numeric, show process
```

**`Responder`** — listens on a network segment for NBT-NS and LLMNR broadcast queries (Windows name resolution fallback mechanisms) and poisons responses to capture NTLMv2 hashes, which can then be cracked or relayed:

```bash
responder -I eth0 -rdwF
```

This attack is trivially easy on internal corporate networks and remains highly effective because the underlying protocols cannot be simply patched.

## Common Network Attacks Summary

| Attack | Layer | Mechanism | Primary Defense |
|--------|-------|-----------|-----------------|
| SYN Flood | Transport | Half-open connection exhaustion | SYN cookies |
| ARP Poisoning | Network Access | Forged ARP replies | DAI, static ARP |
| DNS Spoofing | Application | Forged DNS responses | DNSSEC, DoH |
| DNS Tunneling | Application | Data in DNS queries | DNS monitoring, filtering |
| SSL Stripping | Application | HTTPS downgrade | HSTS preloading |
| SMB Relay | Application | NTLM relay to SMB | SMB signing |
| LLMNR Poisoning | Application | Broadcast poisoning | Disable LLMNR/NBT-NS |
| BGP Hijacking | Internet | Unauthorized route advertisement | RPKI |

> "If you don't understand the protocol, you can't break it. And if you can't break it, you can't defend it."

## Where to Go Deeper

The protocols covered here underpin virtually every network-based attack in existence. To go deeper:

- **RFC 793** (TCP), **RFC 791** (IP), **RFC 826** (ARP), **RFC 1035** (DNS) — reading the original specifications reveals exactly why these attacks work
- **Wireshark University** — free courses on protocol analysis
- **TryHackMe: Pre-Security path** — hands-on labs covering networking fundamentals
- **HackTheBox: Starting Point** — the first machines specifically require network enumeration and service exploitation