import 'package:google_mlkit_object_detection/google_mlkit_object_detection.dart';

/// 1段目: 端末内ML(ML Kit)。通信ゼロで「何個の物体が写っているか」を即答する。
/// 判定の最終決定はクラウドAI(2段目)が行い、こちらは速度と演出を担当する。
class LocalMl {
  static Future<int> countObjects(String imagePath) async {
    final detector = ObjectDetector(
      options: ObjectDetectorOptions(
        mode: DetectionMode.single,
        classifyObjects: false,
        multipleObjects: true,
      ),
    );
    try {
      final objects =
          await detector.processImage(InputImage.fromFilePath(imagePath));
      return objects.length;
    } catch (_) {
      return 0;
    } finally {
      detector.close();
    }
  }
}
