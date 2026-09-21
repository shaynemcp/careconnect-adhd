import 'package:careconnect_mobile/core/theme/app_colors.dart';
import 'package:careconnect_mobile/core/utils/clock.dart';
import 'package:careconnect_mobile/models/user_role.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/test_app.dart';

void main() {
  group('Caregiver Dashboard', () {
    testWidgets('surfaces only what needs attention today, in violet', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      await pumpApp(
        tester,
        role: UserRole.caregiver,
        location: '/caregiver/dashboard',
      );
      expect(find.text('Caregiver Dashboard'), findsOneWidget);
      expect(find.text('Muhammad R.’s care'), findsOneWidget);
      expect(find.text('Needs attention today'), findsOneWidget);
      expect(
        find.text('Overdue — 1:29 PM Atorvastatin not yet confirmed'),
        findsOneWidget,
      );
      expect(find.text('Metformin, 500 mg'), findsOneWidget);
      expect(find.text('Log now'), findsOneWidget);
      final logAction = tester.getSemantics(find.text('Log now'));
      expect(logAction.label, 'Log now, Metformin, 500 mg');
      expect(
        logAction.getSemanticsData().hasAction(SemanticsAction.tap),
        isTrue,
      );
      expect(find.text('View full history'), findsOneWidget);
      expect(
        find.byTooltip('Call Muhammad R., your care recipient'),
        findsOneWidget,
      );

      final context = tester.element(find.text('Caregiver Dashboard'));
      expect(Theme.of(context).colorScheme.primary, AppColors.secondary);

      handle.dispose();
    });

    testWidgets('alert opens the medication; Log now logs with undo', (
      tester,
    ) async {
      await pumpApp(
        tester,
        role: UserRole.caregiver,
        location: '/caregiver/dashboard',
      );
      await tester.tap(
        find.text('Overdue — 1:29 PM Atorvastatin not yet confirmed'),
      );
      await tester.pumpAndSettle();
      expect(find.text('Atorvastatin, 20 mg'), findsOneWidget);
      expect(find.text('Mark as taken'), findsOneWidget);
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      expect(find.text('Manage'), findsWidgets);

      await tapNavDestination(tester, 'Dashboard');
      await tester.tap(find.text('Log now'));
      await tester.pumpAndSettle();
      expect(find.text('Metformin logged at 2:14 PM'), findsOneWidget);
      expect(find.text('Undo'), findsOneWidget);
      await tester.pump(const Duration(seconds: 11));
    });

    testWidgets('View full history opens the timeline', (tester) async {
      await pumpApp(
        tester,
        role: UserRole.caregiver,
        location: '/caregiver/dashboard',
      );
      await tester.tap(find.text('View full history'));
      await tester.pumpAndSettle();
      expect(find.text('Activity Timeline'), findsOneWidget);
    });

    testWidgets('shows a calm empty state when nothing is pending', (
      tester,
    ) async {
      await pumpApp(
        tester,
        role: UserRole.caregiver,
        location: '/caregiver/dashboard',
        clock: FixedClock.at(2026, 8, 25, 7),
      );
      // At 7 AM the morning doses are already seeded as logged, so nothing
      // is overdue and the 1:29 PM Atorvastatin dose is the next action.
      expect(find.textContaining('Overdue —'), findsNothing);
      expect(find.text('Atorvastatin, 20 mg'), findsOneWidget);
      expect(find.text('Log now'), findsOneWidget);
    });

    testWidgets('two-column layout on a tablet', (tester) async {
      await pumpApp(
        tester,
        role: UserRole.caregiver,
        location: '/caregiver/dashboard',
        size: kTablet,
      );
      final alert = tester.getTopLeft(
        find.text('Overdue — 1:29 PM Atorvastatin not yet confirmed'),
      );
      final card = tester.getTopLeft(
        find.byKey(const Key('dashboard-dose-card')),
      );
      expect(card.dx, greaterThan(alert.dx));
      expect(tester.takeException(), isNull);
    });
  });

  group('Manage', () {
    testWidgets('lists medications and appointments with actions', (
      tester,
    ) async {
      await pumpApp(
        tester,
        role: UserRole.caregiver,
        location: '/caregiver/manage',
      );
      expect(
        find.text('Muhammad R.’s medications and appointments'),
        findsOneWidget,
      );
      expect(find.text('Medications'), findsOneWidget);
      expect(find.text('Metformin, 500 mg'), findsOneWidget);
      expect(find.text('Due · Due in 20 min'), findsOneWidget);
      expect(find.text('Appointments'), findsOneWidget);
      expect(find.text('Physical therapy'), findsOneWidget);

      await tester.tap(find.byKey(const Key('manage-add-medication')));
      await tester.pumpAndSettle();
      expect(find.text('Add Medication'), findsOneWidget);
      final context = tester.element(find.text('Add Medication'));
      expect(Theme.of(context).colorScheme.primary, AppColors.secondary);
      await tester.tap(find.byKey(const Key('form-back')));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Metformin, 500 mg'));
      await tester.pumpAndSettle();
      expect(find.text('Every day at 2:34 PM'), findsOneWidget);
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Physical therapy'));
      await tester.pumpAndSettle();
      expect(find.text('Edit Appointment'), findsOneWidget);
      await tester.tap(find.byKey(const Key('form-back')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('manage-add-appointment')));
      await tester.pumpAndSettle();
      expect(find.text('Add Appointment'), findsOneWidget);
    });
  });

  group('Activity Timeline', () {
    testWidgets('groups by day newest first and filters', (tester) async {
      await pumpApp(
        tester,
        role: UserRole.caregiver,
        location: '/caregiver/activity',
      );
      expect(
        find.text('Filter: All medications & appointments'),
        findsOneWidget,
      );
      expect(find.text('TUESDAY, AUGUST 25'), findsOneWidget);
      expect(find.text('MONDAY, AUGUST 24'), findsOneWidget);
      expect(
        find.text('Muhammad logged Lisinopril taken at 8:04 AM'),
        findsOneWidget,
      );
      expect(find.text('Renee added a note to Lisinopril'), findsOneWidget);
      expect(
        tester.getTopLeft(find.text('TUESDAY, AUGUST 25')).dy,
        lessThan(tester.getTopLeft(find.text('MONDAY, AUGUST 24')).dy),
      );

      await tapFilter(tester, 'Appointments');
      expect(find.text('Filter: Appointments only'), findsOneWidget);
      expect(
        find.text('Muhammad logged Lisinopril taken at 8:04 AM'),
        findsNothing,
      );
      expect(
        find.text('Muhammad updated the appointment time to 2:30 PM'),
        findsOneWidget,
      );

      await tapFilter(tester, 'Medications');
      expect(
        find.text('Muhammad updated the appointment time to 2:30 PM'),
        findsNothing,
      );
      expect(
        find.text('Reminder sent for 6:00 PM Lisinopril dose'),
        findsOneWidget,
      );
    });

    testWidgets('new actions appear at the top of the timeline', (
      tester,
    ) async {
      await pumpApp(
        tester,
        role: UserRole.caregiver,
        location: '/caregiver/dashboard',
      );
      await tester.tap(find.text('Log now'));
      await tester.pumpAndSettle();
      await tapNavDestination(tester, 'Activity');
      expect(
        find.text('Renee logged Metformin taken at 2:14 PM'),
        findsOneWidget,
      );
      await tester.pump(const Duration(seconds: 11));
    });
  });
}
