# Synopsis

**Library** is an Easy difficulty Linux machine on TryHackMe, originally created for the FIT and BSides Guatemala CTF. Initial enumeration reveals two open ports: SSH (22) and HTTP (80) with an Apache server. Reviewing the website exposes the username `meliodas`, and the `robots.txt` file contains a direct hint toward using `rockyou.txt` as a wordlist. Hydra is used to run an SSH brute-force attack, obtaining `meliodas`'s credentials. Once inside, enumerating sudo privileges reveals that the user can run `/usr/bin/python /home/meliodas/bak.py` as root without a password. Having write permissions on that script, it's overwritten with a Python payload that spawns a shell, and it's run with `sudo` to gain full access as root.

## Skills Required

* Basic web enumeration and reading publicly exposed configuration files
* Using Hydra for SSH brute forcing
* Basic understanding of sudo permissions on Linux

## Skills Learned

* Recognizing hints in `robots.txt` to identify attack vectors
* Enumerating users through exposed web content
* Brute forcing SSH credentials with Hydra and rockyou.txt
* Privilege escalation by abusing `sudo` on a writable Python script

## Enumeration

I started with reconnaissance of the exposed services using **Nmap**, with the goal of identifying open ports and getting information on the versions of the available services.

```bash
sudo nmap -p- --open --min-rate 5000 -sS -Pn -sCV -n --disable-arp-ping --source-port 53 -oA target $IP
```

![Enumeration Nmap](writeups/thm/src/library/Library_enumeration_nmap.png)

The scan identified **two open TCP ports**, corresponding to the **SSH** and **HTTP** services:

|Port|Service|Version|Notes|
|---|---|---|---|
|`22/tcp`|SSH|OpenSSH 7.2p2 Ubuntu 4ubuntu2.8|Remote access service via SSH.|
|`80/tcp`|HTTP|Apache httpd 2.4.18 (Ubuntu)|Web server hosting the **Blog - Library Machine** application.|

Additionally, Nmap provided some extra details about the web service:

```text
http-robots.txt: 1 disallowed entry
http-title: Welcome to Blog - Library Machine
http-server-header: Apache/2.4.18 (Ubuntu)
```

The `robots.txt` file contains an entry marked as **disallowed**, so I proceeded with a more thorough enumeration of the web service.

### Web service enumeration

Accessing the HTTP service through the browser, I found a web page corresponding to a **blog**, with different sections such as **Blog**, **About**, **Archives**, and **Contact**.

The main page contains a post titled **"This is the title of a blog post"**, published on **June 29, 2009** by user **`meliodas`**. This username is especially interesting, since it could correspond to an existing user on the system and could later be used to try to gain access via **SSH**.

![Main Page](writeups/thm/src/library/Library_main_page.png)

I also noticed that the post has **3 comments**, so user `meliodas` was taken as a candidate to continue enumerating the SSH service.

## Foothold

After identifying user **`meliodas`** in the web application, I ran a **brute-force** attack against the SSH service using **Hydra** and the `rockyou-75.txt` wordlist:

```bash
hydra -l meliodas -P /usr/share/SecLists/Passwords/Leaked-Databases/rockyou-75.txt ssh://10.65.149.235
```

![Hydra Brute Force](writeups/thm/src/library/Library_hydra_brute_force.png)

The attack found valid credentials for the user:

```text
User: meliodas
Password: iloveyou1
```

With these credentials it was possible to authenticate directly to the SSH service exposed on **port 22**, obtaining initial access to the machine:

```bash
ssh meliodas@$IP
```

![Login Ssh](writeups/thm/src/library/Library_login_ssh.png)

### User Flag

Once I gained access as `meliodas`, I did a basic enumeration of the home directory. Among the files found was `user.txt`.

Reading the file's content, it was possible to obtain the **user flag**, confirming initial access to the system as user `meliodas`.

![User Flag](writeups/thm/src/library/Library_user_flag.png)

## Privilege Escalation

Once I gained access as `meliodas`, I did local enumeration to identify available privileges and possible **privilege escalation** vectors. To do this, I checked `sudo` permissions:

```bash
sudo -l
```

The result showed that user `meliodas` could run `/home/meliodas/bak.py` via Python as **root**, without needing to enter a password:

```text
User meliodas may run the following commands on ubuntu:
    (ALL) NOPASSWD: /usr/bin/python* /home/meliodas/bak.py
```

This permission is especially interesting, since it allows running the script with **root** privileges.

![User Enumeration](writeups/thm/src/library/Library_user_enumeration.png)

### Library Hijacking

Analyzing the `bak.py` file, I noticed that the script imports the `zipfile` module:

```python
import os
import zipfile
```

The script uses this module to create a compressed archive at `/var/backups/website.zip` from the content of `/var/www/html`.

Since `bak.py` could be run via `sudo` with **root** privileges and I had control over the `/home/meliodas` directory, it was possible to leverage Python's module search mechanism through a **Library Hijacking** attack.

To do this, I created a file called `zipfile.py` inside `/home/meliodas`, using the same name as the legitimate module. The file contained code capable of spawning a shell with elevated privileges:

```python
import os

os.setuid(0)
os.system("/bin/bash -i")
```

When `bak.py` tries to import `zipfile`, Python may load the user-controlled `zipfile.py` file first. When the script is subsequently run via `sudo`, this code executes with **root** privileges:

```bash
sudo /usr/bin/python3 /home/meliodas/bak.py
```

Finally, I confirmed that the privilege escalation was successful using `whoami`, which returned `root`.

![Privilege Scalation](writeups/thm/src/library/Library_privilege_scalation.png)

### Root Flag

With a shell as **root**, all that remained was to access the `root` user's home directory and read the corresponding file to obtain the **root flag**.

![Root Flag](writeups/thm/src/library/Library_root_flag.png)