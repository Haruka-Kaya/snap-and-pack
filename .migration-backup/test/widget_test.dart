import 'package:flutter_test/flutter_test.dart';
import 'package:wasuremono_zero/main.dart';

void main() {
  testWidgets('home screen shows presets', (tester) async {
    await tester.pumpWidget(const WasuremonoZeroApp());
    expect(find.text('ハッカソン'), findsOneWidget);
  });
}
