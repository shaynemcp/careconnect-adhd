import 'package:flutter/material.dart';

/// Shown when Undo is tapped but the change was already superseded, for
/// example by a sample-data reset while the confirmation was still showing.
const String kUndoUnavailableMessage = 'That change can’t be undone anymore.';

/// Shows the reversible confirmation used for every routine action.
///
/// Material's snackbar is the closest existing spec to "confirmation plus a
/// reversible action": bottom-anchored and announced through a live region.
/// It stays on screen until the user taps Undo, closes it, or acts again, so
/// undo has no time limit (SC 2.2.1 Timing Adjustable). [onUndo] reports
/// whether the change was reversed; if it wasn't, a follow-up message says so
/// rather than failing silently (SC 4.1.3 Status Messages).
ScaffoldFeatureController<SnackBar, SnackBarClosedReason> showUndoSnackBar(
  BuildContext context, {
  required String message,
  required Future<bool> Function() onUndo,
}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  return messenger.showSnackBar(
    SnackBar(
      content: Text(message),
      persist: true,
      showCloseIcon: true,
      action: SnackBarAction(
        label: 'Undo',
        onPressed: () async {
          final undone = await onUndo();
          if (!undone && messenger.mounted) {
            messenger.showSnackBar(
              const SnackBar(content: Text(kUndoUnavailableMessage)),
            );
          }
        },
      ),
    ),
  );
}

/// A plain confirmation with no action.
void showConfirmationSnackBar(BuildContext context, String message) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(SnackBar(content: Text(message)));
}
