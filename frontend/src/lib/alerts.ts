import { Alert, Platform } from 'react-native';

import { toast } from '@/src/lib/toast';

/** Confirmation dialog — uses window.confirm on web, Alert on native. */
export function confirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Confirmar',
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmText, onPress: onConfirm },
  ]);
}

/** Info/success dialog — uses window.alert on web, Alert on native. */
export function infoAlert(title: string, message: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onOk?.();
    return;
  }
  Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
}

/** Error notification — uses toast.error on web, Alert on native. */
export function errorAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    toast.error(title, message);
    return;
  }
  Alert.alert(title, message);
}

/** Success notification — uses toast.success on web, Alert on native. */
export function successAlert(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    toast.success(title, message);
    onOk?.();
    return;
  }
  Alert.alert(title, message ?? '', [{ text: 'OK', onPress: onOk }]);
}
