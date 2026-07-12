/**
 * @format
 *
 * NOTE: react-native-get-random-values MUST be the very first import so the
 * crypto.getRandomValues polyfill is installed before uuid() is called anywhere.
 * This mirrors how the Kotlin app relies on java.util.UUID.randomUUID().
 */
import 'react-native-get-random-values';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

