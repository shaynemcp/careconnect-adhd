import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/test_app.dart';

void main() {
  testWidgets('lists every medication with an icon + text status', (
    tester,
  ) async {
    await pumpApp(tester, location: '/patient/medications');
    expect(find.text('Medications'), findsWidgets);
    expect(find.text('Metformin, 500 mg'), findsOneWidget);
    expect(find.text('Due · Due in 20 min'), findsOneWidget);
    expect(find.text('Lisinopril, 10 mg'), findsOneWidget);
    expect(find.text('Due · Due at 6:00 PM'), findsOneWidget);
    expect(find.text('Atorvastatin, 20 mg'), findsOneWidget);
    expect(find.text('Overdue · Overdue — 45 min late'), findsOneWidget);
    expect(find.text('Vitamin D, 1000 IU'), findsOneWidget);
    expect(find.text('Skipped · Skipped at 8:15 AM'), findsOneWidget);
    expect(find.byIcon(Icons.schedule), findsWidgets);
    expect(find.byIcon(Icons.warning), findsOneWidget);
    expect(find.byIcon(Icons.cancel), findsOneWidget);
    expect(find.text('Add Medication'), findsOneWidget);
  });

  testWidgets('uses a two-column grid on a tablet', (tester) async {
    await pumpApp(tester, location: '/patient/medications', size: kTablet);
    final metformin = tester.getTopLeft(find.text('Metformin, 500 mg'));
    final lisinopril = tester.getTopLeft(find.text('Lisinopril, 10 mg'));
    expect(lisinopril.dy, closeTo(metformin.dy, 1));
    expect(lisinopril.dx, greaterThan(metformin.dx));
  });

  testWidgets('tapping a card opens the detail with schedule and actions', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();

    await pumpApp(tester, location: '/patient/medications');
    await tester.tap(find.text('Metformin, 500 mg'));
    await tester.pumpAndSettle();
    expect(find.text('Every day at 2:34 PM'), findsOneWidget);
    expect(find.text('Take with food.'), findsOneWidget);
    expect(find.text('2:34 PM dose'), findsOneWidget);
    expect(find.text('Mark as taken'), findsOneWidget);
    expect(find.text('Skip this dose'), findsOneWidget);
    final markAction = tester.getSemantics(find.text('Mark as taken'));
    expect(markAction.label, 'Mark as taken, 2:34 PM dose');
    expect(
      markAction.getSemanticsData().hasAction(SemanticsAction.tap),
      isTrue,
    );

    final skipAction = tester.getSemantics(find.text('Skip this dose'));
    expect(skipAction.label, 'Skip this dose, 2:34 PM');
    expect(
      skipAction.getSemanticsData().hasAction(SemanticsAction.tap),
      isTrue,
    );
    expect(find.text('Edit medication'), findsOneWidget);
    expect(find.text('Delete medication'), findsOneWidget);
    handle.dispose();
  });

  testWidgets('skipping a dose is reversible', (tester) async {
    await pumpApp(tester, location: '/patient/medications/med-metformin');
    await tester.tap(find.text('Skip this dose'));
    await tester.pumpAndSettle();
    expect(find.text('Metformin skipped at 2:14 PM'), findsOneWidget);
    expect(find.text('Skipped · Skipped at 2:14 PM'), findsOneWidget);
    expect(find.text('Mark as taken'), findsNothing);

    await tester.tap(find.text('Undo'));
    await tester.pumpAndSettle();
    expect(find.text('Mark as taken'), findsOneWidget);
    await tester.pump(const Duration(seconds: 11));
  });

  testWidgets('marking taken from the detail also offers undo', (tester) async {
    await pumpApp(tester, location: '/patient/medications/med-metformin');
    await tester.tap(find.text('Mark as taken'));
    await tester.pumpAndSettle();
    expect(find.text('Metformin logged at 2:14 PM'), findsOneWidget);
    expect(find.text('Taken · Taken at 2:14 PM'), findsOneWidget);
    await tester.pump(const Duration(seconds: 11));
  });

  testWidgets('delete asks first, in plain language, and can be cancelled', (
    tester,
  ) async {
    await pumpApp(tester, location: '/patient/medications');
    await tester.tap(find.text('Metformin, 500 mg'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Delete medication'));
    await tester.pumpAndSettle();
    expect(find.text('Delete Metformin?'), findsOneWidget);
    expect(
      find.text(
        'This removes Metformin, 500 mg from the medication list. This cannot be undone.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('Delete Metformin?'), findsNothing);
    expect(find.text('Every day at 2:34 PM'), findsOneWidget);

    await tester.tap(find.text('Delete medication'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    expect(find.text('Metformin removed'), findsOneWidget);
    expect(find.text('Metformin, 500 mg'), findsNothing);
    expect(find.text('Lisinopril, 10 mg'), findsOneWidget);
    await tester.pump(const Duration(seconds: 5));
  });

  testWidgets('a missing medication shows a calm message', (tester) async {
    await pumpApp(tester, location: '/patient/medications/ghost');
    expect(
      find.text('This medication is no longer in your list.'),
      findsOneWidget,
    );
  });

  testWidgets('empty state after removing every medication', (tester) async {
    await pumpApp(tester, location: '/patient/medications');
    for (final name in [
      'Metformin, 500 mg',
      'Lisinopril, 10 mg',
      'Atorvastatin, 20 mg',
      'Vitamin D, 1000 IU',
    ]) {
      await tester.tap(find.text(name));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete medication'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();
    }
    expect(find.text('No medications yet.'), findsOneWidget);
    await tester.pump(const Duration(seconds: 5));
  });
}
