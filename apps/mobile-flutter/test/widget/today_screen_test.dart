import 'package:careconnect_mobile/app.dart';
import 'package:careconnect_mobile/core/utils/clock.dart';
import 'package:careconnect_mobile/core/widgets/undo_snackbar.dart';
import 'package:careconnect_mobile/models/dose_event.dart';
import 'package:careconnect_mobile/state/care_data_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/test_app.dart';

void main() {
  testWidgets(
    'renders the orientation bar, dominant dose card and later list',
    (tester) async {
      await pumpApp(tester);
      expect(find.text('Tuesday, August 25 · 2:14 PM'), findsOneWidget);
      expect(find.text('Next: Metformin in 20 minutes'), findsOneWidget);
      expect(find.text('Metformin, 500 mg'), findsOneWidget);
      expect(find.text('Due · Due in 20 min'), findsOneWidget);
      expect(find.text('Take with food.'), findsOneWidget);
      expect(find.text('Mark as Taken'), findsOneWidget);
      expect(find.text('Later today'), findsOneWidget);
      expect(find.text('Lisinopril, 10 mg'), findsOneWidget);
      expect(find.text('Due at 6:00 PM'), findsOneWidget);
      // Exactly one accent (Focus Coral) action per screen.
      expect(find.byKey(const Key('today-dose-card')), findsOneWidget);
    },
  );

  testWidgets('Mark as Taken logs the dose with an undo', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Mark as Taken'));
    await tester.pumpAndSettle();

    expect(find.text('Metformin logged at 2:14 PM'), findsOneWidget);
    expect(find.text('Undo'), findsOneWidget);
    // The card moves on to the next dose.
    expect(find.text('Next: Lisinopril at 6:00 PM'), findsOneWidget);
    expect(find.text('Nothing else is due later today.'), findsOneWidget);

    await tester.tap(find.text('Undo'));
    await tester.pumpAndSettle();
    expect(find.text('Next: Metformin in 20 minutes'), findsOneWidget);
    expect(find.text('Due · Due in 20 min'), findsOneWidget);
    await tester.pump(const Duration(seconds: 11));
  });

  // Regression tests for #10. The Undo snackbar persists (Flutter's default
  // for a snackbar with an action), so undo has to keep working for as long
  // as it is on screen.
  group('undo has no time limit (SC 2.2.1)', () {
    DoseStatus metforminStatus(WidgetTester tester) =>
        ProviderScope.containerOf(
          tester.element(find.byType(CareConnectApp)),
        ).read(careDataProvider).doseById('dose-metformin')!.status;

    testWidgets('Undo still works after the clock moves on', (tester) async {
      final clock = MutableClock(kTestNow);
      await pumpApp(tester, clock: clock);
      await tester.tap(find.text('Mark as Taken'));
      await tester.pumpAndSettle();

      // Past the old 10-second window and past a 30-second clock tick.
      clock.current = kTestNow.add(const Duration(seconds: 35));
      await tester.pump(const Duration(seconds: 35));
      await tester.pumpAndSettle();
      expect(find.text('Undo'), findsOneWidget);

      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      expect(metforminStatus(tester), DoseStatus.due);
      expect(find.text(kUndoUnavailableMessage), findsNothing);
    });

    testWidgets('the confirmation stays until it is closed', (tester) async {
      final handle = tester.ensureSemantics();
      await pumpApp(tester);
      await tester.tap(find.text('Mark as Taken'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(minutes: 1));
      expect(find.text('Metformin logged at 2:14 PM'), findsOneWidget);
      await expectMeetsAccessibilityGuidelines(tester);

      await tester.tap(find.byTooltip('Close'));
      await tester.pumpAndSettle();
      expect(find.text('Metformin logged at 2:14 PM'), findsNothing);
      expect(metforminStatus(tester), DoseStatus.taken);
      handle.dispose();
    });

    testWidgets('says so when a change can no longer be undone', (
      tester,
    ) async {
      await pumpApp(tester);
      await tester.tap(find.text('Mark as Taken'));
      await tester.pumpAndSettle();

      // The sample data is reset while the confirmation is still showing.
      await ProviderScope.containerOf(
        tester.element(find.byType(CareConnectApp)),
      ).read(careDataProvider.notifier).resetDemoData();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      expect(find.text(kUndoUnavailableMessage), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
    });
  });

  testWidgets('shows a calm empty state once everything is logged', (
    tester,
  ) async {
    await pumpApp(tester, clock: FixedClock.at(2026, 8, 25, 19));
    // At 7 PM every remaining dose is overdue; log them all.
    for (var i = 0; i < 3; i++) {
      await tester.tap(find.text('Mark as Taken'));
      await tester.pumpAndSettle();
    }
    expect(find.text('All of today’s doses are logged.'), findsWidgets);
    expect(find.text('Mark as Taken'), findsNothing);
    await tester.pump(const Duration(seconds: 11));
  });

  testWidgets('stacks on a phone and goes two-column on a tablet', (
    tester,
  ) async {
    await pumpApp(tester);
    final card = find.byKey(const Key('today-dose-card'));
    expect(
      tester.getTopLeft(find.text('Later today')).dy,
      greaterThan(tester.getBottomLeft(card).dy),
    );

    await pumpApp(tester, size: kTablet);
    expect(
      tester.getTopLeft(find.text('Later today')).dx,
      greaterThan(
        tester.getBottomRight(find.byKey(const Key('today-dose-card'))).dx - 1,
      ),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('landscape phone also uses the two-column layout', (
    tester,
  ) async {
    await pumpApp(tester, size: kPhoneLandscape);
    expect(
      tester.getTopLeft(find.text('Later today')).dx,
      greaterThan(
        tester.getTopLeft(find.byKey(const Key('today-dose-card'))).dx,
      ),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('reflows at 200% text scale without overflow', (tester) async {
    await pumpApp(tester, textScale: 2.0);
    expect(tester.takeException(), isNull);
    expect(find.text('Mark as Taken'), findsOneWidget);
    await tester.drag(
      find.byType(SingleChildScrollView),
      const Offset(0, -600),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'the persistent Call my caregiver action is present and explains itself',
    (tester) async {
      await pumpApp(tester);
      final button = find.byTooltip('Call Renee, your caregiver');
      expect(button, findsOneWidget);
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(find.text('Call Renee?'), findsOneWidget);
      expect(find.text('Renee — your caregiver · 555-0142'), findsOneWidget);

      await tester.tap(find.text('Not now'));
      await tester.pumpAndSettle();
      expect(find.text('Call Renee?'), findsNothing);

      await tester.tap(button);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Call 555-0142'));
      await tester.pumpAndSettle();
      expect(find.textContaining('does not place calls'), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
    },
  );

  testWidgets('orientation bar and status are announced, not colour-coded', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    await pumpApp(tester);
    expect(
      tester.getSemantics(find.text('Tuesday, August 25 · 2:14 PM')),
      matchesSemantics(
        label: 'Tuesday, August 25, 2:14 PM. Next: Metformin in 20 minutes',
        isLiveRegion: true,
      ),
    );
    // The card merges its title, status and instructions into one
    // announcement; the status is spoken with abbreviations expanded.
    final card = tester.getSemantics(find.byKey(const Key('today-dose-card')));
    expect(card.label, contains('Metformin, 500 mg'));
    expect(card.label, contains('Status: Due in 20 minutes'));
    expect(card.label, isNot(contains('Due in 20 min\n')));
    final action = tester.getSemantics(find.text('Mark as Taken'));

    expect(action.label, 'Mark as Taken, Metformin, 500 mg');
    expect(action.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    handle.dispose();
  });
}
