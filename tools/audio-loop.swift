import AVFoundation
// loop <in.m4a> <out.m4a> <loopSeconds> <fadeSeconds> [startSeconds]
// Reads what it can of the file (it may be cut short), measures loudness every half second, picks the steadiest
// stretch (or the one given), and writes it as a loop whose end flows into its start (equal-power crossfade baked in).
let a = CommandLine.arguments
let inURL = URL(fileURLWithPath: a[1]), outURL = URL(fileURLWithPath: a[2])
let L = Double(a[3])!, F = Double(a[4])!
let asset = AVURLAsset(url: inURL)
let track = asset.tracks(withMediaType: .audio)[0]
let reader = try! AVAssetReader(asset: asset)
let sr = 44100.0, ch = 2
let outSet: [String: Any] = [AVFormatIDKey: kAudioFormatLinearPCM, AVLinearPCMBitDepthKey: 32, AVLinearPCMIsFloatKey: true, AVLinearPCMIsNonInterleaved: false, AVSampleRateKey: sr, AVNumberOfChannelsKey: ch]
let ro = AVAssetReaderTrackOutput(track: track, outputSettings: outSet)
reader.add(ro); reader.startReading()
var data: [[Float]] = Array(repeating: [], count: ch)
let limit = Int(sr * Double(a.count > 6 ? a[6] : "420")!)
while data[0].count < limit, let sb = ro.copyNextSampleBuffer() {
    guard let bb = CMSampleBufferGetDataBuffer(sb) else { continue }
    var len = 0; var ptr: UnsafeMutablePointer<Int8>? = nil
    CMBlockBufferGetDataPointer(bb, atOffset: 0, lengthAtOffsetOut: nil, totalLengthOut: &len, dataPointerOut: &ptr)
    let fl = UnsafeRawPointer(ptr!).assumingMemoryBound(to: Float.self), m = len / 4 / ch
    for k in 0..<m { for c in 0..<ch { data[c].append(fl[k * ch + c]) } }
}
print("reader status", reader.status.rawValue, reader.error?.localizedDescription ?? "")
let n = data[0].count
print("read", Double(n) / sr, "s at", sr, "Hz,", ch, "channels")
// loudness every half second
let hop = Int(sr * 0.5); var rms: [Double] = []
var i = 0
while i + hop <= n { var s = 0.0; for c in 0..<ch { for k in i..<(i + hop) { let v = Double(data[c][k]); s += v * v } }; rms.append(sqrt(s / Double(hop * ch))); i += hop }
let need = Int((L + F) / 0.5) + 1
var best = -1, bestScore = 1e9
var startIdx = 4                                  // skip the first two seconds (the video's own fade in)
if a.count > 5 { startIdx = Int(Double(a[5])! / 0.5); best = startIdx }
else {
    for s in startIdx..<(rms.count - need) {
        let w = Array(rms[s..<(s + need)]); let m = w.reduce(0, +) / Double(w.count)
        let v = w.map { ($0 - m) * ($0 - m) }.reduce(0, +) / Double(w.count)
        let peak = w.max()! / m
        let score = sqrt(v) / m + max(0, peak - 1.6) * 2   // steady, and no sudden loud moment
        if score < bestScore { bestScore = score; best = s }
    }
}
let s0 = best * hop, Ls = Int(L * sr), Fs = Int(F * sr)
print("chosen start", Double(s0) / sr, "s; loudness", rms[best], "score", bestScore)
var out: [[Float]] = Array(repeating: [Float](repeating: 0, count: Ls), count: ch)
for c in 0..<ch {
    for k in 0..<Ls { out[c][k] = data[c][s0 + k] }
    for k in 0..<Fs {                              // the start takes in the tail: when the loop comes round, nothing jumps
        let t = Double(k) / Double(Fs), gin = Float(sin(t * .pi / 2)), gout = Float(cos(t * .pi / 2))
        out[c][k] = data[c][s0 + k] * gin + data[c][s0 + Ls + k] * gout
    }
}
// pass 81: loud enough to be heard on a laptop: the level raised to a target loudness, the crackles' peaks softly limited
var acc = 0.0; for c in 0..<ch { for v in out[c] { acc += Double(v) * Double(v) } }
let rmsOut = sqrt(acc / Double(Ls * ch)), target = Double(a.count > 7 ? a[7] : "0.085")!
let g = Float(target / max(rmsOut, 1e-6))
for c in 0..<ch { for k in 0..<Ls { out[c][k] = tanhf(out[c][k] * g / 0.92) * 0.92 } }
let gain: Float = 1
print("rms", rmsOut, "-> target", target, "drive", g)
let ofmt = AVAudioFormat(standardFormatWithSampleRate: sr, channels: AVAudioChannelCount(ch))!
let ob = AVAudioPCMBuffer(pcmFormat: ofmt, frameCapacity: AVAudioFrameCount(Ls))!; ob.frameLength = AVAudioFrameCount(Ls)
for c in 0..<ch { let p = ob.floatChannelData![c]; for k in 0..<Ls { p[k] = out[c][k] * gain } }
try? FileManager.default.removeItem(at: outURL)
let settings: [String: Any] = [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: sr, AVNumberOfChannelsKey: ch, AVEncoderBitRateKey: 128000]
do {                                              // (in its own scope: the file is finalised when it goes; at the program's end it never was)
    let of = try AVAudioFile(forWriting: outURL, settings: settings, commonFormat: .pcmFormatFloat32, interleaved: false)
    try of.write(from: ob)
    if #available(macOS 15.0, *) { of.close() }
} catch { print("write failed", error) }
print("wrote", L, "s, gain", gain)
// the loudness profile, for a look
let line = rms.enumerated().filter { $0.offset % 6 == 0 }.map { String(format: "%.3f", $0.element) }.prefix(80).joined(separator: " ")
print(line)
