import AVFoundation
import AppKit

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let outDir = args[2]
let width = Int(args[3])!
let asset = AVURLAsset(url: url)
let track = asset.tracks(withMediaType: .video).first!
let fps = Double(track.nominalFrameRate)
let duration = CMTimeGetSeconds(asset.duration)
let n = Int((duration * fps).rounded())
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: width, height: width)
var i = 0
for k in 0..<n {
    let t = CMTime(seconds: (Double(k) + 0.5) / fps, preferredTimescale: 600)
    guard let cg = try? gen.copyCGImage(at: t, actualTime: nil) else { continue }
    let rep = NSBitmapImageRep(cgImage: cg)
    let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.82])!
    try! data.write(to: URL(fileURLWithPath: String(format: "%@/f%03d.jpg", outDir, i)))
    i += 1
}
print("fps", fps, "duration", duration, "frames", i, "size", track.naturalSize)
