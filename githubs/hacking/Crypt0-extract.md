# crypt0-extract
**Language:** Go

## README

Advanced memory scraping tool for cryptographic key extraction from running processes. Designed for embedded systems forensics, penetration testing, and security research.

## Disclaimer

THIS SOFTWARE IS PROVIDED FOR LEGITIMATE SECURITY TESTING AND FORENSIC ANALYSIS ONLY.

By using this tool, you affirm:
- You have explicit written authorization to test the target system
- You understand the legal implications of memory forensics in your jurisdiction
- You accept full liability for any consequences of using this software
- You will not use this tool for illegal purposes including but not limited to: unauthorized access, data theft, or cybercrime

If you cannot answer "yes" to all of the above, DO NOT USE THIS SOFTWARE.

The author (ek0mssavi0r.dev) assumes no responsibility for misuse, damage, or legal consequences.

## Detection Methods

- Entropy Analysis - Shannon entropy threshold filtering
- Pattern Matching - 30+ regex patterns for crypto constants
- Structure Detection - ASN.1 parsing for key containers
- Heuristic Scoring - Confidence scoring based on multiple factors
- Behavioral Analysis - Live monitoring for key material changes

## System Requirements

- Linux kernel 2.6+ with /proc filesystem
- Root/administrative privileges
- ARMv7, aarch64, x86, or x86_64 architecture
- Minimum 512MB RAM
- Go 1.21+ (for compilation)


## Command Reference

| Flag | Default | Description |
|------|---------|-------------|
| -pid | 0 | Target process PID (required) |
| -format | hex | Output: hex, base64, raw, json |
| -output | stdout | Write to file |
| -verbose | false | Detailed progress output |
| -list | false | List all processes |

## Usage Examples

Extract all keys from PID 1337:

```
sudo crypt0-extract -pid 1337
```

JSON output for automation:

```
sudo crypt0-extract -pid 1337 -json | jq '.[] | select(.confidence > 80)'
```

## Files

Licence.txt:
MIT License

Copyright (c) 2026 ekomsSavior

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

crypt0-extract.go:
// crypt0-extract.go 
// Advanced memory scraping tool for cryptographic key extraction
// Supports ARMv7, aarch64, x86, x86_64
// Author: ek0mssavi0r.dev

package main

import (
    "bufio"
    "crypto/sha256"
    "encoding/base64"
    "encoding/binary"
    "encoding/hex"
    "encoding/json"
    "flag"
    "fmt"
    "io"
    "math"
    "os"
    "os/user"
    "path/filepath"
    "regexp"
    "sort"
    "strconv"
    "strings"
    "syscall"
    "time"
    "unsafe"
)

// MemoryRegion represents a process memory mapping
type MemoryRegion struct {
    Start      uint64
    End        uint64
    Perms      string
    Offset     uint64
    Device     string
    Inode      uint64
    Pathname   string
    Entropy    float64
    KeyCount   int
}

// ExtractedKey represents a found cryptographic key
type ExtractedKey struct {
    Value      []byte    `json:"value"`
    Hex        string    `json:"hex"`
    Base64     string    `json:"base64"`
    Algorithm  string    `json:"algorithm"`
    Size       int       `json:"size"`
    Entropy    float64   `json:"entropy"`
    Address    uint64    `json:"address"`
    Region     string    `json:"region"`
    Confidence int       `json:"confidence"` // 0-100
    Fingerprint string   `json:"fingerprint"`
    Timestamp  time.Time `json:"timestamp"`
}

// CryptoAlgorithm defines detection patterns
type CryptoAlgorithm struct {
    Name       string
    Patterns   []*regexp.Regexp
    MinSize    int
    MaxSize    int
    EntropyMin float64
    EntropyMax float64
    Confidence int
}

// Configuration options
type Config struct {
    PID             int
    OutputFormat    string
    OutputFile      string
    MinKeySize      int
    MaxKeySize      int
    PatternFile     string
    Verbose         bool
    EntropyThreshold float64
    JSONOutput      bool
    LiveMode        bool
    LiveInterval    int
    DumpMemory      bool
    DumpDir         string
    HashcatFormat   bool
    Fingerprint     bool
    AlgorithmDetect bool
    StatsOnly       bool
    Heatmap         bool
}

// Global algorithm database
var algorithms = []CryptoAlgorithm{
    // Symmetric ciphers
    {"AES-128", []*regexp.Regexp{regexp.MustCompile(`[\x00-\xff]{16}`)}, 16, 16, 7.5, 8.0, 80},
    {"AES-192", []*regexp.Regexp{regexp.MustCompile(`[\x00-\xff]{24}`)}, 24, 24, 7.5, 8.0, 80},
    {"AES-256", []*regexp.Regexp{regexp.MustCompile(`[\x00-\xff]{32}`)}, 32, 32, 7.5, 8.0, 80},
    {"AES-KeySchedule", []*regexp.Regexp{
        regexp.MustCompile(`\x00[\x01-\xfe]{15}\x00`), // AES key schedule pattern
    }, 176, 240, 6.0, 7.5, 90},
    
    {"ChaCha20", []*regexp.Regexp{
        regexp.MustCompile(`expand 32-byte k`), // ChaCha constant
    }, 32, 32, 6.5, 7.8, 95},
    
    {"Salsa20", []*regexp.Regexp{
        regexp.MustCompile(`expand 32-byte k`), // Same constant
    }, 32, 32, 6.5, 7.8, 95},
    
    // Asymmetric ciphers
    {"RSA-Private", []*regexp.Regexp{
        regexp.MustCompile(`-----BEGIN RSA PRIVATE KEY-----`),
        regexp.MustCompile(`\x30\x82\x01[\x00-\xff]{2}\x02\x01\x00`), // ASN.1 RSA header
    }, 0, 0, 5.0, 7.0, 100},
    
    {"RSA-Prime", []*regexp.Regexp{
        regexp.MustCompile(`[\x00-\xff]{64,512}`), // Large primes
    }, 64, 512, 7.0, 8.0, 70},
    
    {"EC-Private", []*regexp.Regexp{
        regexp.MustCompile(`-----BEGIN EC PRIVATE KEY-----`),
        regexp.MustCompile(`\x30\x77\x02\x01\x01\x04\x20`), // EC private key SEC1
    }, 32, 66, 6.5, 7.5, 95},
    
    {"Ed25519", []*regexp.Regexp{
        regexp.MustCompile(`[\x00-\xff]{32}`), // 32-byte seeds
    }, 32, 32, 7.8, 8.0, 85},
    
    // Hash functions (state extraction)
    {"SHA256-State", []*regexp.Regexp{
        regexp.MustCompile(`\x67\xe6\x09\x6a\x85\xae\x67\xbb`), // SHA256 IV
    }, 32, 32, 6.0, 7.0, 75},
    
    // Stream cipher states
    {"RC4-State", []*regexp.Regexp{
        regexp.MustCompile(`[\x00-\xff]{256}`), // S-box
    }, 256, 256, 7.8, 8.0, 60},
    
    // Custom patterns for embedded systems
    {"U-Boot-Key", []*regexp.Regexp{
        regexp.MustCompile(`(?:boot|env)_key=([a-fA-F0-9]{32,64})`),
    }, 16, 32, 5.0, 7.0, 90},
    
    {"TPM-Seed", []*regexp.Regexp{
        regexp.MustCompile(`\x00\x01\x02\x03\x04\x05\x06\x07`), // TPM test seed
    }, 20, 48, 7.5, 8.0, 85},
    
    {"WireGuard-Key", []*regexp.Regexp{
        regexp.MustCompile(`[A-Za-z0-9+/]{43}=`), // WireGuard base64 keys
    }, 32, 32, 6.8, 7.5, 90},
}

func main() {
    // Enhanced command line interface
    pid := flag.Int("pid", 0, "Target process PID")
    outputFormat := flag.String("format", "hex", "Output format: hex, base64, raw, json")
    outputFile := flag.String("output", "", "Output file (default: stdout)")
    minSize := flag.Int("min-size", 16, "Minimum key size in bytes")
    maxSize := flag.Int("max-size", 256, "Maximum key size in bytes")
    patternFile := flag.String("patterns", "", "Custom patterns file (regex per line)")
    verbose := flag.Bool("verbose", false, "Verbose output")
    entropyThreshold := flag.Float64("entropy", 7.0, "Minimum entropy threshold (0.0-8.0)")
    jsonOutput := flag.Bool("json", false, "JSON output format")
    liveMode := flag.Bool("live", false, "Live monitoring mode")
    liveInterval := flag.Int("interval", 5, "Live monitoring interval (seconds)")
    dumpMemory := flag.Bool("dump", false, "Dump memory regions to files")
    dumpDir := flag.String("dump-dir", "crypt0-dumps", "Directory for memory dumps")
    hashcatFormat := flag.Bool("hashcat", false, "Output Hashcat-compatible format")
    fingerprint := flag.Bool("fingerprint", false, "Generate key fingerprints")
    detectAlgorithms := flag.Bool("detect", true, "Detect specific algorithms")
    statsOnly := flag.Bool("stats", false, "Show memory statistics only")
    heatmap := flag.Bool("heatmap", false, "Generate entropy heatmap")
    listProcesses := flag.Bool("list", false, "List running processes and exit")
    
    flag.Parse()
    
    if *listProcesses {
        listProcessesAndExit()
        return
    }
    
    if *pid == 0 && !*statsOnly {
        fmt.Fprintf(os.Stderr, "Error: PID is required (use -pid)\n")
        flag.Usage()
        os.Exit(1)
    }
    
    config := &Config{
        PID:              *pid,
        OutputFormat:     *outputFormat,
        OutputFile:       *outputFile,
        MinKeySize:       *minSize,
        MaxKeySize:       *maxSize,
        PatternFile:      *patternFile,
        Verbose:          *verbose,
        EntropyThreshold: *entropyThreshold,
        JSONOutput:       *jsonOutput,
        LiveMode:         *liveMode,
        LiveInterval:     *liveInterval,
        DumpMemory:       *dumpMemory,
        DumpDir:          *dumpDir,
        HashcatFormat:    *hashcatFormat,
        Fingerprint:      *fingerprint,
        AlgorithmDetect:  *detectAlgorithms,
        StatsOnly:        *statsOnly,
        Heatmap:          *heatmap,
    }
    
    if config.JSONOutput {
        config.OutputFormat = "json"
    }
    
    if err := runEnhanced(config); err != nil {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }
}

func runEnhanced(config *Config) error {
    // Check privileges
    currentUser, _ := user.Current()
    if currentUser.Uid != "0" {
        fmt.Fprintf(os.Stderr, "Warning: Root privileges recommended\n")
    }
    
    // Verify process exists
    procPath := fmt.Sprintf("/proc/%d", config.PID)
    if _, err := os.Stat(procPath); err != nil && !config.StatsOnly {
        return fmt.Errorf("process %d does not exist", config.PID)
    }
    
    // Live monitoring mode
    if config.LiveMode {
        return liveMonitoring(config)
    }
    
    // Get memory regions
    regions, err := getMemoryRegions(config.PID)
    if err != nil {
        return fmt.Errorf("failed to get memory regions: %w", err)
    }
    
    // Filter readable regions
    var readableRegions []MemoryRegion
    for _, region := range regions {
        if strings.Contains(region.Perms, "r") {
            readableRegions = append(readableRegions, region)
        }
    }
    
    if config.StatsOnly {
        return showStats(config.PID, readableRegions)
    }
    
    if config.Verbose {
        fmt.Fprintf(os.Stderr, "Analyzing %d readable memory regions\n", len(readableRegions))
    }
    
    // Open /proc/pid/mem
    memFile, err := os.Open(fmt.Sprintf("/proc/%d/mem", config.PID))
    if err != nil {
        return fmt.Errorf("failed to open /proc/%d/mem: %w", config.PID, err)
    }
    defer memFile.Close()
    
    // Setup output
    var output io.Writer
    if config.OutputFile == "" {
        output = os.Stdout
    } else {
        file, err := os.Create(config.OutputFile)
        if err != nil {
            return fmt.Errorf("failed to create output file: %w", err)
        }
        defer file.Close()
        output = file
    }
    
    // Create dump directory if needed
    if config.DumpMemory {
        os.MkdirAll(config.DumpDir, 0755)
    }
    
    // Extract keys with enhanced detection
    var allKeys []ExtractedKey
    totalKeys := 0
    
    for i, region := range readableRegions {
        if config.Verbose {
            fmt.Fprintf(os.Stderr, "\rProcessing region %d/%d: 0x%x-0x%x", 
                i+1, len(readableRegions), region.Start, region.End)
        }
        
        keys, err := extractKeysAdvanced(memFile, region, config)
        if err != nil && config.Verbose {
            fmt.Fprintf(os.Stderr, "\nWarning: Failed to read region: %v\n", err)
            continue
        }
        
        // Calculate region entropy
        if config.Heatmap && len(keys) > 0 {
            region.Entropy = calculateRegionEntropy(memFile, region)
            region.KeyCount = len(keys)
            readableRegions[i] = region
        }
        
        for _, key := range keys {
            // Apply entropy filter
            if key.Entropy < config.EntropyThreshold {
                continue
            }
            
            // Detect algorithm
            if config.AlgorithmDetect {
                key.Algorithm, key.Confidence = detectAlgorithm(key.Value)
            }
            
            // Generate fingerprint
            if config.Fingerprint {
                key.Fingerprint = generateFingerprint(key.Value)
            }
            
            allKeys = append(allKeys, key)
            totalKeys++
        }
    }
    
    if config.Verbose {
        fmt.Fprintf(os.Stderr, "\n")
    }
    
    // Output results
    if err := outputResults(allKeys, output, config); err != nil {
        return err
    }
    
    // Generate heatmap if requested
    if config.Heatmap && len(readableRegions) > 0 {
        generateHeatmap(readableRegions, config)
    }
    
    if config.Verbose {
        fmt.Fprintf(os.Stderr, "\n[+] Extraction complete: %d potential keys found\n", totalKeys)
        printKeyStatistics(allKeys)
    }
    
    return nil
}

func extractKeysAdvanced(memFile *os.File, region MemoryRegion, config *Config) ([]ExtractedKey, error) {
    size := region.End - region.Start
    if size > 1024*1024*500 { // 500MB limit for advanced mode
        if config.Verbose {
            fmt.Fprintf(os.Stderr, "\nSkipping large region: 0x%x bytes\n", size)
        }
        return nil, nil
    }
    
    // Seek to region start
    _, err := memFile.Seek(int64(region.Start), io.SeekStart)
    if err != nil {
        return nil, err
    }
    
    // Read region data
    data := make([]byte, size)
    _, err = io.ReadFull(memFile, data)
    if err != nil && err != io.ErrUnexpectedEOF {
        return nil, err
    }
    
    // Dump memory if requested
    if config.DumpMemory {
        dumpPath := filepath.Join(config.DumpDir, fmt.Sprintf("region_0x%x_0x%x.bin", region.Start, region.End))
        if err := os.WriteFile(dumpPath, data, 0644); err == nil && config.Verbose {
            fmt.Fprintf(os.Stderr, "\n[+] Dumped region to %s\n", dumpPath)
        }
    }
    
    var keys []ExtractedKey
    seen := make(map[string]bool)
    
    // Sliding window with adaptive step size
    step := 1
    if size > 1024*1024*10 { // Large region: skip some bytes for performance
        step = 4
    }
    
    for i := 0; i <= len(data)-config.MinKeySize; i += step {
        for keySize := config.MinKeySize; keySize <= config.MaxKeySize && i+keySize <= len(data); keySize++ {
            candidate := data[i : i+keySize]
            
            // Quick entropy check
            entropy := calculateEntropy(candidate)
            if entropy < config.EntropyThreshold {
                continue
            }
            
            // Check for known patterns
            algorithm, confidence := detectAlgorithm(candidate)
            if confidence < 50 && !config.AlgorithmDetect {
                continue
            }
            
            // Deduplication
            keyHash := hex.EncodeToString(candidate)
            if seen[keyHash] {
                continue
            }
            seen[keyHash] = true
            
            key := ExtractedKey{
                Value:      candidate,
                Hex:        hex.EncodeToString(candidate),
                Base64:     base64.StdEncoding.EncodeToString(candidate),
                Size:       keySize,
                Entropy:    entropy,
                Address:    region.Start + uint64(i),
                Region:     region.Pathname,
                Algorithm:  algorithm,
                Confidence: confidence,
                Timestamp:  time.Now(),
            }
            
            keys = append(keys, key)
            
            // Break if we found a key (avoid overlapping detections)
            if confidence > 80 {
                break
            }
        }
    }
    
    return keys, nil
}

func calculateEntropy(data []byte) float64 {
    if len(data) == 0 {
        return 0
    }
    
    freq := make([]float64, 256)
    for _, b := range data {
        freq[b]++
    }
    
    var entropy float64
    for _, f := range freq {
        if f > 0 {
            p := f / float64(len(data))
            entropy -= p * math.Log2(p)
        }
    }
    
    return entropy
}

func calculateRegionEntropy(memFile *os.File, region MemoryRegion) float64 {
    size := region.End - region.Start
    if size > 1024*1024*10 { // Sample large regions
        size = 1024 * 1024 * 10
    }
    
    data := make([]byte, size)
    memFile.Seek(int64(region.Start), io.SeekStart)
    io.ReadFull(memFile, data)
    
    return calculateEntropy(data)
}

func detectAlgorithm(data []byte) (string, int) {
    for _, algo := range algorithms {
        // Size check
        if algo.MinSize > 0 && len(data) < algo.MinSize {
            continue
        }
        if algo.MaxSize > 0 && len(data) > algo.MaxSize {
            continue
        }
        
        // Entropy check
        entropy := calculateEntropy(data)
        if entropy < algo.EntropyMin || entropy > algo.EntropyMax {
            continue
        }
        
        // Pattern matching
        for _, pattern := range algo.Patterns {
            if pattern.Match(data) {
                return algo.Name, algo.Confidence
            }
        }
    }
    
    // Default detection based on entropy alone
    entropy := calculateEntropy(data)
    if entropy > 7.8 {
        return "High-Entropy-Data", 60
    } else if entropy > 7.0 {
        return "Potential-Key-Material", 50
    }
    
    return "Unknown", 30
}

func generateFingerprint(data []byte) string {
    hash := sha256.Sum256(data)
    return hex.EncodeToString(hash[:])[:16]
}

func outputResults(keys []ExtractedKey, output io.Writer, config *Config) error {
    if config.JSONOutput {
        encoder := json.NewEncoder(output)
        encoder.SetIndent("", "  ")
        return encoder.Encode(keys)
    }
    
    for _, key := range keys {
        switch config.OutputFormat {
        case "hex":
            fmt.Fprintf(output, "%s", key.Hex)
        case "base64":
            fmt.Fprintf(output, "%s", key.Base64)
        case "raw":
            output.Write(key.Value)
        default:
            fmt.Fprintf(output, "%s", key.Hex)
        }
        
        if config.HashcatFormat {
            fmt.Fprintf(output, ":%s:%d:%s", key.Algorithm, key.Confidence, key.Fingerprint)
        }
        
        if config.Verbose {
            fmt.Fprintf(output, " # %s (conf: %d%%) entropy: %.2f", 
                key.Algorithm, key.Confidence, key.Entropy)
        }
        
        fmt.Fprintf(output, "\n")
    }
    
    return nil
}

func liveMonitoring(config *Config) error {
    fmt.Fprintf(os.Stderr, "[*] Starting live monitoring of PID %d (interval: %ds)\n", 
        config.PID, config.LiveInterval)
    fmt.Fprintf(os.Stderr, "[*] Press Ctrl+C to stop\n\n")
    
    ticker := time.NewTicker(time.Duration(config.LiveInterval) * time.Second)
    defer ticker.Stop()
    
    previousKeys := make(map[string]bool)
    
    for range ticker.C {
        // Check if process still exists
        if _, err := os.Stat(fmt.Sprintf("/proc/%d", config.PID)); err != nil {
            fmt.Fprintf(os.Stderr, "[!] Process %d terminated\n", config.PID)
            return nil
        }
        
        // Run extraction
        memFile, err := os.Open(fmt.Sprintf("/proc/%d/mem", config.PID))
        if err != nil {
            continue
        }
        
        regions, _ := getMemoryRegions(config.PID)
        var newKeys []ExtractedKey
        
        for _, region := range regions {
            if !strings.Contains(region.Perms, "r") {
                continue
            }
            
            keys, _ := extractKeysAdvanced(memFile, region, config)
            for _, key := range keys {
                if !previousKeys[key.Hex] {
                    newKeys = append(newKeys, key)
                    previousKeys[key.Hex] = true
                }
            }
        }
        memFile.Close()
        
        // Report new keys
        if len(newKeys) > 0 {
            timestamp := time.Now().Format("15:04:05")
            fmt.Printf("[%s] Found %d new key(s):\n", timestamp, len(newKeys))
            for _, key := range newKeys {
                fmt.Printf("  - %s... [%s] (entropy: %.2f)\n", 
                    key.Hex[:16], key.Algorithm, key.Entropy)
            }
            fmt.Println()
        }
    }
    
    return nil
}

func showStats(pid int, regions []MemoryRegion) error {
    var totalSize uint64
    var readableSize uint64
    
    for _, region := range regions {
        size := region.End - region.Start
        totalSize += size
        if strings.Contains(region.Perms, "r") {
            readableSize += size
        }
    }
    
    fmt.Printf("Process Statistics for PID %d\n", pid)
    fmt.Printf("================================\n")
    fmt.Printf("Total memory regions: %d\n", len(regions))
    fmt.Printf("Readable regions: %d\n", len(regions))
    fmt.Printf("Total memory size: %.2f MB\n", float64(totalSize)/1024/1024)
    fmt.Printf("Readable memory: %.2f MB\n", float64(readableSize)/1024/1024)
    
    return nil
}

func generateHeatmap(regions []MemoryRegion, config *Config) {
    fmt.Fprintf(os.Stderr, "\nEntropy Heatmap (higher = more random):\n")
    fmt.Fprintf(os.Stderr, "=====================================\n")
    
    // Sort by entropy
    sort.Slice(regions, func(i, j int) bool {
        return regions[i].Entropy > regions[j].Entropy
    })
    
    for i, region := range regions {
        if i >= 20 { // Show top 20
            break
        }
        if region.Entropy > 0 {
            barLength := int(region.Entropy * 5)
            bar := strings.Repeat("#", barLength)
            fmt.Fprintf(os.Stderr, "[0x%x] %6.2f %s - %s (keys: %d)\n", 
                region.Start, region.Entropy, bar, 
                filepath.Base(region.Pathname), region.KeyCount)
        }
    }
}

func printKeyStatistics(keys []ExtractedKey) {
    algoCount := make(map[string]int)
    for _, key := range keys {
        algoCount[key.Algorithm]++
    }
    
    fmt.Fprintf(os.Stderr, "\nKey Statistics:\n")
    fmt.Fprintf(os.Stderr, "===============\n")
    for algo, count := range algoCount {
        fmt.Fprintf(os.Stderr, "  %s: %d keys\n", algo, count)
    }
    
    // Average entropy
    var totalEntropy float64
    for _, key := range keys {
        totalEntropy += key.Entropy
    }
    avgEntropy := totalEntropy / float64(len(keys))
    fmt.Fprintf(os.Stderr, "\nAverage entropy: %.3f bits/byte\n", avgEntropy)
}

// Existing functions from original code (getMemoryRegions, listProcessesAndExit, etc.)
// ... (include all previous functions here)

func getMemoryRegions(pid int) ([]MemoryRegion, error) {
    mapsPath := fmt.Sprintf("/proc/%d/maps", pid)
    data, err := os.ReadFile(mapsPath)
    if err != nil {
        return nil, err
    }
    
    var regions []MemoryRegion
    lines := strings.Split(string(data), "\n")
    
    for _, line := range lines {
        if line == "" {
            continue
        }
        
        fields := strings.Fields(line)
        if len(fields) < 5 {
            continue
        }
        
        addrRange := strings.Split(fields[0], "-")
        if len(addrRange) != 2 {
            continue
        }
        
        start, _ := strconv.ParseUint(addrRange[0], 16, 64)
        end, _ := strconv.ParseUint(addrRange[1], 16, 64)
        perms := fields[1]
        offset, _ := strconv.ParseUint(fields[2], 16, 64)
        device := fields[3]
        inode, _ := strconv.ParseUint(fields[4], 10, 64)
        
        pathname := ""
        if len(fields) >= 6 {
            pathname = fields[5]
        }
        
        region := MemoryRegion{
            Start:    start,
            End:      end,
            Perms:    perms,
            Offset:   offset,
            Device:   device,
            Inode:    inode,
            Pathname: pathname,
        }
        
        regions = append(regions, region)
    }
    
    return regions, nil
}

func listProcessesAndExit() {
    procDir, _ := os.Open("/proc")
    defer procDir.Close()
    
    entries, _ := procDir.Readdirnames(0)
    
    fmt.Printf("%-8s %-20s %-10s %s\n", "PID", "COMMAND", "ARCH", "MEMORY(MB)")
    fmt.Println(strings.Repeat("-", 60))
    
    for _, entry := range entries {
        if _, err := strconv.Atoi(entry); err != nil {
            continue
        }
        
        // Read process status
        statusPath := filepath.Join("/proc", entry, "status")
        data, _ := os.ReadFile(statusPath)
        
        name := "unknown"
        var vmSize uint64
        
        scanner := bufio.NewScanner(strings.NewReader(string(data)))
        for scanner.Scan() {
            line := scanner.Text()
            if strings.HasPrefix(line, "Name:") {
                name = strings.TrimSpace(strings.TrimPrefix(line, "Name:"))
            } else if strings.HasPrefix(line, "VmSize:") {
                parts := strings.Fields(line)
                if len(parts) >= 2 {
                    vmSize, _ = strconv.ParseUint(parts[1], 10, 64)
                }
            }
        }
        
        arch := getArchitectureForProcess(entry)
        memoryMB := float64(vmSize) / 1024
        
        fmt.Printf("%-8s %-20s %-10s %.2f\n", entry, truncateString(name, 20), arch, memoryMB)
    }
}

func getArchitectureForProcess(pid string) string {
    exePath := filepath.Join("/proc", pid, "exe")
    link, err := os.Readlink(exePath)
    if err != nil {
        return "unknown"
    }
    
    file, err := os.Open(link)
    if err != nil {
        return "unknown"
    }
    defer file.Close()
    
    // Read ELF header
    header := make([]byte, 5)
    file.Read(header)
    
    if len(header) >= 5 && string(header[1:4]) == "ELF" {
        switch header[4] {
        case 1:
            return "32-bit"
        case 2:
            return "64-bit"
        }
    }
    
    return "unknown"
}

func truncateString(s string, max int) string {
    if len(s) > max {
        return s[:max-3] + "..."
    }
    return s
}

func getArchitecture() string {
    var uname syscall.Utsname
    if err := syscall.Uname(&uname); err != nil {
        return "unknown"
    }
    
    machine := string(uname.Machine[:])
    machine = strings.TrimRight(machine, "\x00")
    
    return machine
}
