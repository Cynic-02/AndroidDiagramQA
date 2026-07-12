/**
 * AppNavigator — complete stack for DiagramMind mobile.
 *
 * Auth stack:  Splash → Login ↔ Register
 * App stack:   Splash → Home → Pipeline → Results → Study
 *                           ↘ QnA → ImageViewer
 *                           ↘ Settings
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import type { BloomLevel } from '../types/models';

import { SplashScreen }    from '../screens/SplashScreen';
import { HomeScreen }      from '../screens/HomeScreen';
import { QnAScreen }       from '../screens/QnAScreen';
import { ImageViewerScreen } from '../screens/ImageViewerScreen';
import { SettingsScreen }  from '../screens/SettingsScreen';
import { LoginScreen }     from '../screens/LoginScreen';
import { RegisterScreen }  from '../screens/RegisterScreen';
import { PipelineScreen }  from '../screens/PipelineScreen';
import { ResultsScreen }   from '../screens/ResultsScreen';
import { StudyScreen }     from '../screens/StudyScreen';

export type RootStackParamList = {
  Splash:      undefined;
  Login:       undefined;
  Register:    undefined;
  Home:        undefined;
  QnA:         { sessionId: string; sessionTitle: string; diagramPath: string };
  Pipeline:    { sessionId: string; runId: string };
  Results:     { sessionId: string };
  Study:       { sessionId: string };
  ImageViewer: { path: string };
  Settings:    undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOpts: NativeStackNavigationOptions = {
  headerShown:   false,
  animation:     'slide_from_right',
  gestureEnabled: true,
};

export const AppNavigator: React.FC = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Splash" screenOptions={screenOpts}>
      <Stack.Screen name="Splash"       component={SplashScreen} />
      <Stack.Screen name="Login"        component={LoginScreen} />
      <Stack.Screen name="Register"     component={RegisterScreen} />
      <Stack.Screen name="Home"         component={HomeScreen} />
      <Stack.Screen name="QnA"          component={QnAScreen} />
      <Stack.Screen name="Pipeline"     component={PipelineScreen} />
      <Stack.Screen name="Results"      component={ResultsScreen} />
      <Stack.Screen name="Study"        component={StudyScreen} />
      <Stack.Screen name="ImageViewer"  component={ImageViewerScreen} />
      <Stack.Screen name="Settings"     component={SettingsScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
