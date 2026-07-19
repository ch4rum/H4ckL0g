# Synopsis
**Orion** is an Easy difficulty Linux machine on HackTheBox hosting a vulnerable **CraftCMS 5.6.16** instance under the domain `orion.htb`, simulating a telecommunications company's website. Initial access is achieved by exploiting **[CVE-2025-32432](https://nvd.nist.gov/vuln/detail/CVE-2025-32432)**, a deserialization vulnerability in CraftCMS's image transform function that allows instantiating arbitrary PHP classes without authentication, resulting in remote code execution. Once inside, system enumeration reveals plaintext database credentials in the application's configuration files, which, when used against MySQL, expose the user's password hash. Privilege escalation is achieved by abusing **[CVE-2026-24061](https://www.offsec.com/blog/cve-2026-24061/)**, an authentication bypass vulnerability in GNU inetutils `telnetd` 2.7 running on localhost: by manipulating the `USER` environment variable with the value `-f root`, the daemon executes `login -f root`, completely bypassing authentication and granting immediate root access.

## Skills Required
* Port and service enumeration (Nmap)
* Web enumeration and CMS version identification
* CVE research and use of public exploits

## Skills Learned
* Exploiting unauthenticated PHP deserialization in CraftCMS ([CVE-2025-32432](https://github.com/CTY-Research-1/CVE-2025-32432-PoC))
* Extracting credentials from web application configuration files
* Enumerating internal services on localhost (`netstat`)
* Authentication bypass in GNU inetutils telnetd 2.7 through environment variable manipulation ([CVE-2026-24061](https://nvd.nist.gov/vuln/detail/CVE-2025-32432))
* Pivoting to internal services via SSH port forwarding

## Enumeration
Starting to enumerate the box with the `nmap` tool.

```shell
sudo nmap -p- --open --min-rate 5000 -sS -Pn -sCV -n --disable-arp-ping --source-port 53 -oA target $ip
```

![Enumeration Nmap](writeups/htb/src/orion/Orion_enumeraction_nmap.png)

The scan revealed only **two open TCP ports**:

| Port | Service | Version                          | Notes                                                                                          |
| ---- | ------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| 22   | SSH     | OpenSSH 8.9p1 Ubuntu 3ubuntu0.15   | No initial credentials; common Ubuntu version, no relevant public vulnerabilities.                 |
| 80   | HTTP    | nginx 1.18.0                       | Redirects → http://orion.htb                                                                       |

The web server's response showed a redirect to the virtual host `orion.htb`; as usual, the domain is mapped to the machine's IP address before continuing.

```bash
htbhost $IP orion.htb
```

From this point on, enumeration focused on the HTTP service, since it was the only exposed attack vector besides the SSH service, which initially offered no access credentials.

### Web application investigation

Accessing `http://orion.htb`, I saw a seemingly ordinary web page. I browsed through its different sections and inspected the source code (`Ctrl + U`) looking for comments, credentials, hidden paths, or any other clue useful for exploitation; however, I didn't find any relevant information, so I continued with a more thorough enumeration of the web service using specialized tools.
![Main Page Orion](writeups/htb/src/orion/Orion_main_page.png)

### Looking for Paths

Since manual inspection of the site didn't turn up anything relevant, I decided to run directory and file enumeration using **Feroxbuster** to identify hidden paths, admin panels, or resources not linked from the main page.

```bash
feroxbuster -u http://orion.ht/ -s 200,301,302
```

![Feroxbuster Enumeration](writeups/htb/src/orion/Orion_feroxbuster_enumeration_directory.png)

The enumeration revealed the path `/admin/login`, corresponding to the **Craft CMS** admin panel. Accessing it, I found a login form and noticed the site was running version **5.6.16**, which I used to research possible vulnerabilities associated with the CMS.

![Login Admin](writeups/htb/src/orion/Orion_login_admin.png)

Having identified that the application was running **Craft CMS 5.6.16**, I looked into whether known vulnerabilities existed for that version. As a result, I found **[CVE-2025-32432](https://nvd.nist.gov/vuln/detail/CVE-2025-32432https://github.com/CTY-Research-1/CVE-2025-32432-PoC)**, a critical **Remote Code Execution (RCE)** vulnerability affecting Craft CMS versions prior to **5.6.17**. Since the version identified on the target was vulnerable, I decided to use a public proof of concept (PoC) to attempt exploitation.

### Vulnerability: CVE-2025-32432

CVE-2025-32432 is a deserialization flaw in Craft CMS that allows unauthenticated remote code execution. It affects 3.x versions below 3.9.15, 4.x versions below 4.14.15, and 5.x versions below 5.6.17, with a CVSS of 10.0 (Critical). The attack works in two stages: first, PHP code is injected into the server's session file via a GET request to `/index.php?p=admin/dashboard&a=<?php...?>`, where the `a` parameter contains the PHP payload. Then a POST request is sent to `/actions/assets/generate-transform` with a JSON payload that abuses deserialization in the Yii Framework. This attack uses the `yii\rbac\PhpManager` class to force the server to require the poisoned session file, achieving execution of the injected PHP code.

![Testing Vulnerability](writeups/htb/src/orion/Orion_caido_cookie_token.png)
![Testing Vulnerability](writeups/htb/src/orion/Orion_caido_csrf_token.png)

I initially tried to understand and exploit the vulnerability manually using Caido as a proxy to inspect and manipulate the HTTP requests. I tried several Python scripts available on GitHub, but found bugs in their implementation: they didn't correctly replace the session variables in the payload, and CSRF token handling was inconsistent. After several failed attempts to get the Python scripts working, I decided to use Metasploit, which already had a dedicated module (`exploit/linux/http/craftcms_preauth_rce_cve_2025_32432`) that worked completely fine.

![Exploit With Msfconsole](writeups/htb/src/orion/Orion_msfconsole_exploit.png)

Through Metasploit I managed to gain remote access to the machine as user `www-data`, obtaining a successful reverse shell.

## Foothold
After completing the enumeration phase and gaining access to the server, I confirmed that the session had been established with the user **craft**. Listing the directory contents with `ls -la`, I identified a hidden file called `.env`. Since this type of file usually stores environment variables and sensitive application credentials, I proceeded to inspect its content with the `cat` command.

```bash
cat .env
```

![Enumeration Craft](writeups/htb/src/orion/Orion_enumeraction_craft.png)

Inspecting the `.env` file, I found several environment variables used by the application. Among them were the database credentials, including the database name, user, and password with administrator privileges.

```txt
User = root
PassWord = SuperSecureCraft123Pass!
Name_Database = Orion
```

With the credentials obtained from the `.env` file, I accessed the **MySQL** database and started enumerating its content. While reviewing the `users` table, I found the password hash corresponding to the **admin** user, which I extracted to attempt cracking it with a dictionary attack.

```bash
mysql -h 127.0.0.1 -u root -p'SuperSecureCraft123Pass!' -D orion -e "SELECT id,username,password FROM users;"
```

![Mysql Extract Data](writeups/htb/src/orion/Orion_mysql_passwords.png)

| Username | Password                                                     |
| -------- | ------------------------------------------------------------ |
| admin    | $2y$13$e9zuohgFZzGtbQalcn9Mz.5PJbjxobO0GMbXo8NHp3P/B42LUg0lS |

### Cracking the hash

After extracting the hash from the database, I attempted to crack it using `John the Ripper` and the `rockyou.txt` wordlist, with the goal of recovering the password associated with the user found in the application.

```bash
john --wordlist=/usr/share/SecLists/Passwords/Leaked-Databases/rockyou.txt hashes.txt
```

![Cracking Hash](writeups/htb/src/orion/Orion_cracking_with_john.png)

```txt
User: Adam
Password: darkangel
```

After obtaining the password, I verified its validity and proceeded to log in via *SSH*; the access was successful.

```bash
nxc $IP -u adam -p darkangel
ssh engineer@reactor.htb
```

![Login Adam User](writeups/htb/src/orion/Orion_ssh_user_adam.png)

## Privilege Escalation

After gaining access as user **adam**, I started the local enumeration phase to identify a possible way to escalate privileges. As part of this process, I checked the system's open ports with `ss` to identify the services running both locally and exposed to the network. Although I found several running services, one of them especially caught my attention: a **Telnet** service listening only on the local interface (`127.0.0.1:23`). Since Telnet is an old protocol with a long history of vulnerabilities, I decided to focus my research on this service to determine whether it could be leveraged for privilege escalation.

```bash
ss -tulpn
telnet --version
```

![Enumeration Services](writeups/htb/src/orion/Orion_enumeration_adam_services_port.png)

After researching the service, I found **[CVE-2026-24061](https://www.offsec.com/blog/cve-2026-24061/)**. Reviewing the vulnerability analysis, I noticed it was relatively easy to exploit. The problem lies in the fact that the Telnet service uses the content of the `USER` environment variable without validating it properly, allowing arguments to be injected into the `/usr/bin/login` binary and achieving arbitrary command execution. This behavior could be leveraged to escalate privileges on the system.

```bash
USER='-f root' telnet -a localhost
```

![Exploit CVE](writeups/htb/src/orion/Orion_privilege_scalation.png)

After successfully exploiting the vulnerability, I obtained a shell with **root** privileges. With the highest level of privileges on the system, all that remained was to access the `/root` directory and read the last flag to complete the machine.

![Root Flag](writeups/htb/src/orion/Orion_root_flag.png)
