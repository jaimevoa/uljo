// AES-256-GCM seals files for the password gate (see build-deploy.py).
// Usage: swift lock.swift FILE... < key-hex  →  JSON {path: base64(nonce|ciphertext|tag)}
import CryptoKit
import Foundation

let hex = (readLine() ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
var bytes = [UInt8]()
var i = hex.startIndex
while i < hex.endIndex {
    let j = hex.index(i, offsetBy: 2)
    bytes.append(UInt8(hex[i..<j], radix: 16)!)
    i = j
}
precondition(bytes.count == 32, "expected a 32-byte key")
let key = SymmetricKey(data: bytes)

var out = [String: String]()
for path in CommandLine.arguments.dropFirst() {
    let data = try Data(contentsOf: URL(fileURLWithPath: path))
    let box = try AES.GCM.seal(data, using: key)
    out[path] = box.combined!.base64EncodedString()
}
let json = try JSONSerialization.data(withJSONObject: out)
FileHandle.standardOutput.write(json)
