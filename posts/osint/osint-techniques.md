# OSINT: Open Source Intelligence Techniques

**OSINT** (Open Source Intelligence) is the practice of collecting, correlating, and analyzing information from publicly available sources to build actionable intelligence about a target. No exploits, no unauthorized access — the data is already out there, indexed and accessible to anyone who knows the right queries, tools, and methodology.

Law enforcement agencies, intelligence services, journalists, corporate investigators, and penetration testers all use OSINT. For a pentester, it is the reconnaissance phase — understanding the target before touching a single port. For a threat intelligence analyst, it is ongoing monitoring. For a journalist, it is source verification. The techniques are the same; the intent and authorization differ.

## The OSINT Framework

Before diving into tools, understand the process. Raw data collection without structure produces noise, not intelligence. The workflow:

1. **Define the objective** — what are you trying to find? A person's contact details, an organization's infrastructure, a company's exposed credentials?
2. **Identify seed data** — what do you start with? A domain, an email, a username, a full name, an IP address?
3. **Collect** — query multiple sources, automated and manual
4. **Correlate** — connect data points across sources to build a picture
5. **Analyze** — separate signal from noise, assess reliability of each source
6. **Report** — document findings with sources so they can be verified

## Google Dorks

Search engines index far more than most users realize. **Google dorks** use advanced operators to surface information that standard queries miss:

```
site:target.com filetype:pdf
```
Lists all publicly indexed PDFs on a domain — often containing internal documents, employee names, org charts, or configuration details accidentally left public.

```
site:target.com inurl:admin OR inurl:login OR inurl:dashboard
```
Surfaces exposed administration panels and login interfaces.

```
"index of /" site:target.com
```
Finds web servers with directory listing enabled — potentially exposing source code, backups, or sensitive files.

```
site:target.com ext:sql OR ext:bak OR ext:log
```
Looks for accidentally exposed database dumps, backup files, and application logs.

```
"@target.com" site:linkedin.com
```
Extracts employee email addresses indexed from LinkedIn profiles.

The **Google Hacking Database (GHDB)** at Exploit-DB maintains thousands of pre-built dorks categorized by target type. It is a standard first-stop for web application recon.

## Shodan — The Search Engine for Devices

Shodan continuously crawls the internet and indexes every publicly reachable device by querying ports and collecting banners: IP cameras, industrial control systems (ICS/SCADA), routers, printers, smart home devices, and misconfigured cloud servers. It does not exploit anything — it simply records what services respond and what they say about themselves.

A single Shodan query can reveal thousands of devices running outdated firmware, exposed without authentication, or leaking version information that maps directly to public CVEs.

Useful Shodan queries:

```
org:"Target Corp" port:3389
```
Finds all RDP-exposed machines belonging to a specific organization.

```
hostname:target.com has_screenshot:true
```
Shows indexed screenshots of web interfaces — sometimes revealing internal dashboards.

```
vuln:CVE-2021-44228
```
Lists all devices Shodan has identified as potentially vulnerable to a specific CVE (Log4Shell in this example).

Shodan is equally valuable for **defenders auditing their own exposure** as it is for attackers mapping an attack surface. If Shodan can see it, so can everyone else.

## Certificate Transparency Logs

Every TLS certificate issued by a public CA is logged in **Certificate Transparency (CT) logs** — a public, append-only record. This means every subdomain that has ever had a certificate issued is permanently discoverable, even if the DNS record no longer exists.

Tools like **crt.sh** query CT logs:

```
https://crt.sh/?q=%.target.com
```

This single query often reveals dozens of internal subdomains, staging environments, and forgotten infrastructure that the organization considers non-public. `subfinder`, `amass`, and `dnsx` automate this and cross-reference multiple CT log sources simultaneously.

## Maltego — Relationship Mapping

Maltego is a visual intelligence and data mining tool. Starting from a single seed (domain, email, IP, username), it automatically queries dozens of data sources to map relationships: associated subdomains, linked email addresses, social media accounts, hosting providers, certificate transparency records, leaked credential databases, and WHOIS history.

The result is a comprehensive **entity graph** — a visual map of a target's digital footprint. Connections that would take hours of manual research become visible in minutes.

Maltego is used by law enforcement, corporate intelligence teams, and penetration testers for the same reason: it externalizes the correlation work that the human brain struggles with at scale.

## Username and Email Enumeration

A single username or email address unlocks surprising amounts of information across platforms:

**`sherlock`** — queries 300+ social media platforms simultaneously to find where a username is registered:
```bash
python3 sherlock.py ch4rum
```

**`holehe`** — checks whether an email address is registered on 120+ services (GitHub, Twitter, Instagram, Adobe, etc.) using account recovery flows — without sending any email or triggering any notification:
```bash
holehe target@email.com
```

**Have I Been Pwned (HIBP)** — checks whether an email appears in known data breaches. The API can be queried programmatically for bulk checking.

## theHarvester — Automated Passive Recon

`theHarvester` collects email addresses, subdomains, hosts, IP ranges, and employee names from public sources including Google, Bing, LinkedIn, Shodan, and dozens of others:

```bash
theHarvester -d target.com -b google,linkedin,shodan -l 500
```

A single command against a target domain typically returns enough data to build a realistic picture of the organization's employees, email format, and external infrastructure — all without sending a single packet to the target.

## SpiderFoot — Automated Full-Spectrum OSINT

SpiderFoot automates the entire OSINT process, querying over 200 data sources simultaneously and correlating the results into structured reports. It accepts any seed data type (domain, IP, email, username, phone number) and builds a comprehensive graph of related entities.

It can be run as a web interface or from the command line, and produces HTML, JSON, and CSV reports suitable for documentation. For a full organizational assessment, SpiderFoot reduces days of manual work to hours.

> "Before attacking a target, a professional spends 80% of their time on reconnaissance."

## Recon-ng — Modular Recon Framework

`Recon-ng` is a modular web reconnaissance framework with a structure intentionally similar to Metasploit — workspaces, modules, a database, and a consistent interface. It is designed for systematic, repeatable reconnaissance that produces clean, structured output.

```bash
recon-ng
[recon-ng] > workspaces create target_corp
[recon-ng][target_corp] > modules load recon/domains-hosts/hackertarget
[recon-ng][target_corp] > options set SOURCE target.com
[recon-ng][target_corp] > run
```

Each module targets a specific data source or performs a specific transformation (domain → subdomains, email → social profiles, IP → ASN, etc.). Results accumulate in the workspace database for later querying and reporting.

## OSINT for Defensive Purposes

OSINT is not exclusively an offensive capability. Defenders use the same techniques to:

- **Monitor for credential leaks** — automated scanning of paste sites and dark web markets for employee credentials
- **Brand protection** — detecting phishing domains, fake social profiles, or impersonation accounts
- **Threat intelligence** — tracking threat actor infrastructure, identifying C2 servers, attributing attacks
- **Attack surface management** — continuously mapping your own external exposure before attackers do

Running OSINT against your own organization periodically is one of the highest-value, lowest-cost security exercises available.