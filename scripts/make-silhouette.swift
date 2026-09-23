import Foundation
import Vision
import CoreImage
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// usage: seg3 <in.png> <outdir> <dx> <dy> <scale> <fillAlpha> <edgeAlpha> <blur>
// 인물(M0)은 거의 덮지 않고, 인물 중심으로 scale배 키워 (dx,dy)만큼 비껴 놓은 실루엣을
// 부드러운 가장자리의 반투명 흰 형태 + 은은한 외곽선으로 올린다.
let a = CommandLine.arguments
let inURL = URL(fileURLWithPath: a[1]); let outDir = a[2]
let dx = Int(a[3]) ?? 0, dy = Int(a[4]) ?? 0
let scale = Double(a[5]) ?? 1.1, aFill = Double(a[6]) ?? 0.3, aEdge = Double(a[7]) ?? 0.7, blurR = Int(a[8]) ?? 10
guard let src = CGImageSourceCreateWithURL(inURL as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("load fail"); exit(1) }
let W = cg.width, H = cg.height, N = W * H
// 1) 사람 마스크
let req = VNGeneratePersonSegmentationRequest(); req.qualityLevel = .accurate; req.outputPixelFormat = kCVPixelFormatType_OneComponent8
try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
guard let obs = req.results?.first else { print("no person"); exit(2) }
var m = CIImage(cvPixelBuffer: obs.pixelBuffer)
m = m.transformed(by: CGAffineTransform(scaleX: CGFloat(W) / m.extent.width, y: CGFloat(H) / m.extent.height))
var raw = [UInt8](repeating: 0, count: N)
CIContext().render(m, toBitmap: &raw, rowBytes: W, bounds: CGRect(x: 0, y: 0, width: W, height: H), format: .R8, colorSpace: nil)
let vx0 = 60, vx1 = W - 60, vy0 = 172, vy1 = 1703
var M0 = [UInt8](repeating: 0, count: N)
for y in vy0..<vy1 { for x in vx0..<vx1 where raw[y * W + x] > 128 { M0[y * W + x] = 1 } }
// 2) 가장 큰 연결 성분
var label = [Int32](repeating: 0, count: N); var best = 0, bestLabel: Int32 = 0; var cur: Int32 = 0; var stack = [Int]()
for s in 0..<N where M0[s] == 1 && label[s] == 0 {
  cur += 1; var size = 0; stack.append(s); label[s] = cur
  while let p = stack.popLast() {
    size += 1; let x = p % W, y = p / W
    if x > 0 && M0[p-1] == 1 && label[p-1] == 0 { label[p-1] = cur; stack.append(p-1) }
    if x < W-1 && M0[p+1] == 1 && label[p+1] == 0 { label[p+1] = cur; stack.append(p+1) }
    if y > 0 && M0[p-W] == 1 && label[p-W] == 0 { label[p-W] = cur; stack.append(p-W) }
    if y < H-1 && M0[p+W] == 1 && label[p+W] == 0 { label[p+W] = cur; stack.append(p+W) }
  }
  if size > best { best = size; bestLabel = cur }
}
for i in 0..<N { M0[i] = (label[i] == bestLabel) ? 1 : 0 }
var minX = W, maxX = -1, minY = H, maxY = -1
for y in 0..<H { for x in 0..<W where M0[y*W+x] == 1 { if x < minX {minX = x}; if x > maxX {maxX = x}; if y < minY {minY = y}; if y > maxY {maxY = y} } }
print("person bbox x:\(minX)-\(maxX) y:\(minY)-\(maxY)")
// 3) 실루엣 마스크 M2 (확대+오프셋)
let cx = Double(minX + maxX) / 2.0, cy = Double(minY + maxY) / 2.0
var M2 = [Float](repeating: 0, count: N)
for y in 0..<H { for x in 0..<W {
  let sx = Int((Double(x - dx) - cx) / scale + cx + 0.5), sy = Int((Double(y - dy) - cy) / scale + cy + 0.5)
  if sx >= 0, sx < W, sy >= 0, sy < H, M0[sy*W+sx] == 1 { M2[y*W+x] = 1 }
} }
// 4) 분리형 박스 블러 ×3 ≈ 가우시안
func boxBlur(_ src: [Float], _ r: Int) -> [Float] {
  var tmp = [Float](repeating: 0, count: N), out = [Float](repeating: 0, count: N)
  let k = Float(2 * r + 1)
  for y in 0..<H { var s: Float = 0; let row = y * W
    for x in 0..<min(r, W-1) { s += src[row + x] }
    for x in 0..<W { if x + r < W { s += src[row + x + r] }; if x - r - 1 >= 0 { s -= src[row + x - r - 1] }; tmp[row + x] = s / k } }
  for x in 0..<W { var s: Float = 0
    for y in 0..<min(r, H-1) { s += tmp[y * W + x] }
    for y in 0..<H { if y + r < H { s += tmp[(y + r) * W + x] }; if y - r - 1 >= 0 { s -= tmp[(y - r - 1) * W + x] }; out[y * W + x] = s / k } }
  return out
}
func blur3(_ src: [Float], _ r: Int) -> [Float] { return boxBlur(boxBlur(boxBlur(src, r), r), r) }
// 외곽선: 얇은 링(3px) — 확대 마스크의 경계
var ring = [Float](repeating: 0, count: N)
for y in 1..<(H-1) { for x in 1..<(W-1) where M2[y*W+x] == 1 {
  if M2[y*W+x-1] == 0 || M2[y*W+x+1] == 0 || M2[(y-1)*W+x] == 0 || M2[(y+1)*W+x] == 0 { for oy in -1...1 { for ox in -1...1 { ring[(y+oy)*W+x+ox] = 1 } } }
} }
let fillSoft = blur3(M2, blurR)
let ringSoft = blur3(ring, 2)
let person = blur3(M0.map { Float($0) }, 5)
// 5) 합성
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let basePtr = UnsafeMutablePointer<UInt8>.allocate(capacity: N * 4); basePtr.initialize(repeating: 0, count: N * 4)
let bctx = CGContext(data: basePtr, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
bctx.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H))
for y in vy0..<vy1 { for x in vx0..<vx1 {
  let i = y * W + x
  var al = Double(min(1, fillSoft[i])) * aFill + Double(min(1, ringSoft[i])) * aEdge
  al = min(1.0, al) * (1.0 - 0.92 * Double(person[i]))      // 인물 위는 거의 투명
  if al < 0.004 { continue }
  let o = i * 4
  for c in 0..<3 { basePtr[o+c] = UInt8(min(255.0, 255.0 * al + Double(basePtr[o+c]) * (1 - al))) }
  basePtr[o+3] = UInt8(min(255.0, 255.0 * al + Double(basePtr[o+3]) * (1 - al)))
} }
let img = bctx.makeImage()!
let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outDir + "/composite.png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(d, img, nil); CGImageDestinationFinalize(d); print("done")
