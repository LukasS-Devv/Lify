import { Redirect } from 'expo-router';

/**
 * Rota `lify://notification.click`.
 *
 * O react-native-track-player abre o app com essa URL quando o usuário toca na notificação
 * de reprodução. Sem uma rota com esse nome, o expo-router mostra "Unmatched Route".
 * Aqui só mandamos o usuário para a tela inicial.
 */
export default function NotificationClick() {
  return <Redirect href="/" />;
}
