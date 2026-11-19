import AVFoundation
import CoreGraphics
import CoreVideo
import Foundation
import ImageIO
import UniformTypeIdentifiers

// Run from the project root: swift scripts/render-login-motion.swift
let width = 768
let height = 768
let framesPerSecond: Int32 = 30
let frameCount = 144
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let files = FileManager.default
let temporary = files.temporaryDirectory.appendingPathComponent("deanery-motion-" + UUID().uuidString, isDirectory: true)
try files.createDirectory(at: temporary, withIntermediateDirectories: true)
defer { try? files.removeItem(at: temporary) }
let output = temporary.appendingPathComponent("login-motion.mp4")
let poster = temporary.appendingPathComponent("login-motion.jpg")

func shade(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> CGColor {
    CGColor(red: r, green: g, blue: b, alpha: a)
}

func line(_ context: CGContext, from: CGPoint, to: CGPoint) {
    context.move(to: from)
    context.addLine(to: to)
    context.strokePath()
}

func draw(_ context: CGContext, phase: CGFloat) {
    let bounds = CGRect(x: 0, y: 0, width: width, height: height)
    let glowCenter = CGPoint(x: 665 + 73 * cos(phase), y: 240 + 124 * sin(phase))
    let blue = CGGradient(colorsSpace: colorSpace, colors: [
        shade(0.065, 0.195, 0.67), shade(0.085, 0.28, 0.76), shade(0.055, 0.175, 0.39)
    ] as CFArray, locations: [0, 0.58, 1])!
    context.drawLinearGradient(blue, start: CGPoint(x: 45, y: 665), end: CGPoint(x: 736, y: 65),
                               options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    let glow = CGGradient(colorsSpace: colorSpace, colors: [
        shade(0.21, 0.72, 0.96, 0.45), shade(0.19, 0.58, 1, 0.16), shade(0.19, 0.58, 1, 0)
    ] as CFArray, locations: [0, 0.56, 1])!
    context.drawRadialGradient(glow, startCenter: glowCenter, startRadius: 0, endCenter: glowCenter, endRadius: 390, options: [])

    context.saveGState()
    context.translateBy(x: 704 + 26 * cos(phase), y: 167 + 31 * sin(phase))
    context.rotate(by: 0.10 * sin(phase))
    context.setLineWidth(1.35)
    for index in 0..<5 {
        let radius = CGFloat(99 + index * 32)
        context.setStrokeColor(shade(0.61, 0.88, 1, 0.22 - CGFloat(index) * 0.025))
        context.addArc(center: .zero, radius: radius, startAngle: .pi / 10, endAngle: .pi * 1.45, clockwise: false)
        context.strokePath()
        let angle = phase + CGFloat(index) * 0.62
        let point = CGPoint(x: cos(angle) * radius, y: sin(angle) * radius)
        if point.x < -6 {
            context.setFillColor(shade(0.73, 0.94, 1, 0.72))
            context.fillEllipse(in: CGRect(x: point.x - 2.5, y: point.y - 2.5, width: 5, height: 5))
        }
    }
    context.restoreGState()

    for row in 0..<8 {
        for column in 0..<7 {
            let wave = 0.5 + 0.5 * sin(phase * 2 + Double(row - column) * 0.57)
            let radius = 1 + wave * 1.3
            let x = CGFloat(531 + column * 22) + 8 * sin(phase)
            let y = CGFloat(412 + row * 22) + 5 * cos(phase)
            context.setFillColor(shade(0.72, 0.91, 1, 0.17 + wave * 0.24))
            context.fillEllipse(in: CGRect(x: x - radius, y: y - radius, width: 2 * radius, height: 2 * radius))
        }
    }

    let glint = CGRect(x: 582 + 104 * sin(phase), y: 614 + 40 * cos(phase), width: 14, height: 14)
    context.setStrokeColor(shade(0.72, 0.94, 1, 0.65))
    context.setLineWidth(1.3)
    line(context, from: CGPoint(x: glint.minX, y: glint.midY), to: CGPoint(x: glint.maxX, y: glint.midY))
    line(context, from: CGPoint(x: glint.midX, y: glint.minY), to: CGPoint(x: glint.midX, y: glint.maxY))

    // The left half remains darker so the overlaid HTML copy holds contrast.
    let veil = CGGradient(colorsSpace: colorSpace, colors: [
        shade(0.035, 0.12, 0.46, 0.32), shade(0.035, 0.12, 0.46, 0)
    ] as CFArray, locations: [0, 1])!
    context.clip(to: bounds)
    context.drawLinearGradient(veil, start: .zero, end: CGPoint(x: 470, y: 0), options: [.drawsBeforeStartLocation])
}

let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 620_000, AVVideoMaxKeyFrameIntervalKey: 48],
])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
    kCVPixelBufferWidthKey as String: width,
    kCVPixelBufferHeightKey as String: height,
    kCVPixelBufferCGImageCompatibilityKey as String: true,
    kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
])
writer.add(input)
guard writer.startWriting() else { throw writer.error ?? CocoaError(.fileWriteUnknown) }
writer.startSession(atSourceTime: .zero)

for frame in 0..<frameCount {
    while !input.isReadyForMoreMediaData {
        if writer.status == .failed { throw writer.error ?? CocoaError(.fileWriteUnknown) }
        Thread.sleep(forTimeInterval: 0.004)
    }
    var buffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, adaptor.pixelBufferPool!, &buffer)
    guard let buffer else { throw CocoaError(.fileWriteUnknown) }
    CVPixelBufferLockBaseAddress(buffer, [])
    let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8,
                            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: colorSpace,
                            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Big.rawValue)!
    draw(context, phase: CGFloat(frame) / CGFloat(frameCount) * 2 * .pi)

    if frame == 0, let image = context.makeImage(),
       let file = CGImageDestinationCreateWithURL(poster as CFURL, UTType.jpeg.identifier as CFString, 1, nil) {
        CGImageDestinationAddImage(file, image, [kCGImageDestinationLossyCompressionQuality: 0.82] as CFDictionary)
        CGImageDestinationFinalize(file)
    }

    CVPixelBufferUnlockBaseAddress(buffer, [])
    let time = CMTime(value: Int64(frame), timescale: framesPerSecond)
    guard adaptor.append(buffer, withPresentationTime: time) else { throw writer.error ?? CocoaError(.fileWriteUnknown) }
}

input.markAsFinished()
let finished = DispatchSemaphore(value: 0)
writer.finishWriting { finished.signal() }
finished.wait()
guard writer.status == .completed else { throw writer.error ?? CocoaError(.fileWriteUnknown) }
for exported in [output, poster] {
    let destination = URL(fileURLWithPath: "public/design").appendingPathComponent(exported.lastPathComponent)
    if files.fileExists(atPath: destination.path) {
        _ = try files.replaceItemAt(destination, withItemAt: exported)
    } else {
        try files.moveItem(at: exported, to: destination)
    }
}
print("Wrote \(output.lastPathComponent) and \(poster.lastPathComponent)")
